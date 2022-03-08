const request = require('supertest');
const db = require('../src/db/knex');
const app = require('../src/app');
const { yerelGun } = require('./yardimci');

let cerez;
let katId;
let odaId;
let odaId2;

const gun = yerelGun;

beforeAll(async () => {
  await db.migrate.latest();
  await db.seed.run();
  const giris = await request(app)
    .post('/api/auth/giris')
    .send({ kullaniciAdi: 'yonetici', parola: 'test1234' });
  cerez = giris.headers['set-cookie'];
  const kat = await request(app).post('/api/katlar').set('Cookie', cerez).send({ ad: '2. Kat' });
  katId = kat.body.id;
  const oda = await request(app)
    .post('/api/odalar')
    .set('Cookie', cerez)
    .send({ odaNo: '201', kapasite: 2, katId, ozellikler: 'balkon, deniz' });
  odaId = oda.body.id;
  const oda2 = await request(app)
    .post('/api/odalar')
    .set('Cookie', cerez)
    .send({ odaNo: '202', kapasite: 3, katId });
  odaId2 = oda2.body.id;
});

afterAll(async () => {
  await db.destroy();
});

describe('temizlik akışı', () => {
  test('oda panelinden kirli yapılır, görev başlar ve biter', async () => {
    const kirli = await request(app)
      .put(`/api/odalar/${odaId}/temizlik`)
      .set('Cookie', cerez)
      .send({ durum: 'kirli', notlar: 'dökülme' });
    expect(kirli.status).toBe(200);
    expect(kirli.body.temizlik).toBe('kirli');
    expect(kirli.body.ozellikler).toEqual(['balkon', 'deniz']);

    const gorevler = await request(app).get('/api/temizlik').set('Cookie', cerez);
    const gorev = gorevler.body.find((g) => g.odaId === odaId);
    expect(gorev.durum).toBe('bekliyor');

    const basla = await request(app).post(`/api/temizlik/${gorev.id}/basla`).set('Cookie', cerez);
    expect(basla.body.durum).toBe('yapiliyor');
    expect(basla.body.odaTemizlik).toBe('temizleniyor');

    const bitir = await request(app)
      .post(`/api/temizlik/${gorev.id}/bitir`)
      .set('Cookie', cerez)
      .send({ notlar: 'tamam' });
    expect(bitir.body.durum).toBe('tamam');
    expect(bitir.body.odaTemizlik).toBe('temiz');

    const gecmis = await request(app).get(`/api/odalar/${odaId}/gecmis`).set('Cookie', cerez);
    expect(gecmis.body.temizlikler).toHaveLength(1);
    expect(gecmis.body.temizlikler[0].yapan).toBe('Yönetici');
  });

  test('kontrol kuralı açıkken görev kontrol bekler', async () => {
    await request(app).put('/api/ayarlar').set('Cookie', cerez).send({ temizlik_kontrolu: '1' });
    await request(app)
      .put(`/api/odalar/${odaId}/temizlik`)
      .set('Cookie', cerez)
      .send({ durum: 'kirli' });
    const gorev = (await request(app).get('/api/temizlik').set('Cookie', cerez)).body.find(
      (g) => g.odaId === odaId
    );
    const bitir = await request(app)
      .post(`/api/temizlik/${gorev.id}/bitir`)
      .set('Cookie', cerez)
      .send({});
    expect(bitir.body.durum).toBe('kontrol');
    expect(bitir.body.odaTemizlik).toBe('kontrol');
    const kontrol = await request(app)
      .post(`/api/temizlik/${gorev.id}/kontrol`)
      .set('Cookie', cerez);
    expect(kontrol.body.durum).toBe('tamam');
    expect(kontrol.body.odaTemizlik).toBe('temiz');
    await request(app).put('/api/ayarlar').set('Cookie', cerez).send({ temizlik_kontrolu: '0' });
  });

  test('bakıma alınan oda girişe kapanır, çıkınca kirli döner', async () => {
    const al = await request(app)
      .put(`/api/odalar/${odaId2}/bakim`)
      .set('Cookie', cerez)
      .send({ bakimda: true, notlar: 'klima', bitis: gun(2) });
    expect(al.body.kullanim).toBe('bakimda');
    const giris = await request(app)
      .post('/api/konaklamalar')
      .set('Cookie', cerez)
      .send({
        odaId: odaId2,
        konuklar: [
          {
            konuk: { kimlikTuru: 'pasaport', pasaportNo: 'X1', uyruk: 'DEU', ad: 'A', soyad: 'B' },
          },
        ],
      });
    expect(giris.status).toBe(400);
    const cikar = await request(app)
      .put(`/api/odalar/${odaId2}/bakim`)
      .set('Cookie', cerez)
      .send({ bakimda: false });
    expect(cikar.body.kullanim).toBe('kullanimda');
    expect(cikar.body.temizlik).toBe('kirli');
    await request(app)
      .put(`/api/odalar/${odaId2}/temizlik`)
      .set('Cookie', cerez)
      .send({ durum: 'temiz' });
  });
});

describe('rezervasyon ve çizelge', () => {
  let rezId;

  test('rezervasyon alınır, çakışan ikincisi reddedilir', async () => {
    const r = await request(app)
      .post('/api/rezervasyonlar')
      .set('Cookie', cerez)
      .send({
        adSoyad: 'Demir Ailesi',
        telefon: '0500',
        odaId: odaId2,
        girisTarihi: gun(0),
        cikisTarihi: gun(2),
        kisiSayisi: 2,
        kaynak: 'booking',
      });
    expect(r.status).toBe(201);
    rezId = r.body.id;
    const cakisan = await request(app)
      .post('/api/rezervasyonlar')
      .set('Cookie', cerez)
      .send({ adSoyad: 'Başka', odaId: odaId2, girisTarihi: gun(1), cikisTarihi: gun(3) });
    expect(cakisan.status).toBe(409);
    const ardisik = await request(app)
      .post('/api/rezervasyonlar')
      .set('Cookie', cerez)
      .send({ adSoyad: 'Sonraki', odaId: odaId2, girisTarihi: gun(2), cikisTarihi: gun(4) });
    expect(ardisik.status).toBe(201);
  });

  test('bugünkü rezervasyon odada görünür ve girişe dönüşür', async () => {
    const odalar = await request(app).get('/api/odalar').set('Cookie', cerez);
    const oda = odalar.body.find((o) => o.id === odaId2);
    expect(oda.doluluk).toBe('rezerve');
    expect(oda.rezervasyon.adSoyad).toBe('Demir Ailesi');

    const giris = await request(app)
      .post(`/api/rezervasyonlar/${rezId}/giris`)
      .set('Cookie', cerez)
      .send({
        konuklar: [
          {
            konuk: {
              kimlikTuru: 'tc',
              tc: '10000000146',
              uyruk: 'TUR',
              ad: 'Mehmet',
              soyad: 'Demir',
            },
          },
        ],
      });
    expect(giris.status).toBe(201);
    expect(giris.body.rezervasyon.durum).toBe('geldi');
    const detay = await request(app)
      .get(`/api/konaklamalar/${giris.body.konaklamalar[0]}`)
      .set('Cookie', cerez);
    expect(detay.body.planlananCikis).toBe(`${gun(2)} 11:00`);
    expect(detay.body.rezervasyonId).toBe(rezId);
  });

  test('çizelge bugünkü konaklamayı blok olarak verir', async () => {
    const r = await request(app)
      .get(`/api/cizelge?gun=${gun(0)}`)
      .set('Cookie', cerez);
    expect(r.status).toBe(200);
    expect(r.body.katlar[0].ad).toBe('2. Kat');
    const blok = r.body.bloklar.find((b) => b.tur === 'konaklama' && b.odaId === odaId2);
    expect(blok).toBeDefined();
    expect(blok.etiket).toContain('Mehmet Demir');
    const rez = r.body.bloklar.find(
      (b) => b.tur === 'rezervasyon' && b.etiket.startsWith('Sonraki')
    );
    expect(rez).toBeUndefined(); // yarından sonraki rezervasyon bugünün görünümünde yok
    const hafta = await request(app)
      .get(`/api/cizelge?gun=${gun(0)}&gorunum=hafta`)
      .set('Cookie', cerez);
    expect(hafta.body.bloklar.some((b) => b.tur === 'rezervasyon')).toBe(true);
  });

  test('pano yeni sayıları döner', async () => {
    const r = await request(app).get('/api/pano').set('Cookie', cerez);
    expect(r.status).toBe(200);
    expect(r.body.oda).toBeDefined();
    expect(typeof r.body.bugunCikacak).toBe('number');
  });

  test('kat görevlisi konuk adı göremez, temizlik yapabilir', async () => {
    await request(app).post('/api/kullanicilar').set('Cookie', cerez).send({
      adSoyad: 'Fatma Hizmet',
      kullaniciAdi: 'fatma',
      parola: 'temizlik1',
      rol: 'kat_gorevlisi',
    });
    const giris = await request(app)
      .post('/api/auth/giris')
      .send({ kullaniciAdi: 'fatma', parola: 'temizlik1' });
    const fatma = giris.headers['set-cookie'];
    const odalar = await request(app).get('/api/odalar').set('Cookie', fatma);
    const dolu = odalar.body.find((o) => o.id === odaId2);
    expect(dolu.konaklayanlar[0].ad).toBeUndefined();
    const yasak = await request(app).get('/api/konuklar').set('Cookie', fatma);
    expect(yasak.status).toBe(403);
    const kirli = await request(app)
      .put(`/api/odalar/${odaId}/temizlik`)
      .set('Cookie', fatma)
      .send({ durum: 'kirli' });
    expect(kirli.status).toBe(200);
    const gorev = (await request(app).get('/api/temizlik').set('Cookie', fatma)).body.find(
      (g) => g.odaId === odaId
    );
    const bitir = await request(app)
      .post(`/api/temizlik/${gorev.id}/bitir`)
      .set('Cookie', fatma)
      .send({});
    expect(bitir.body.yapan).toBe('Fatma Hizmet');
  });
});
