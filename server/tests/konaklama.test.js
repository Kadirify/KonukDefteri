const request = require('supertest');
const db = require('../src/db/knex');
const app = require('../src/app');
const { yerelGun } = require('./yardimci');

let cerez;

async function istek() {
  return request(app);
}

beforeAll(async () => {
  await db.migrate.latest();
  await db.seed.run();
  const giris = await request(app)
    .post('/api/auth/giris')
    .send({ kullaniciAdi: 'yonetici', parola: 'test1234' });
  cerez = giris.headers['set-cookie'];
});

afterAll(async () => {
  await db.destroy();
});

describe('konaklama akışı (manuel mod)', () => {
  let katId;
  let odaId;
  let konaklamaId;

  test('kat ve oda eklenir', async () => {
    const kat = await (await istek())
      .post('/api/katlar')
      .set('Cookie', cerez)
      .send({ ad: '1. Kat' });
    expect(kat.status).toBe(201);
    katId = kat.body.id;
    const r = await (await istek())
      .post('/api/odalar')
      .set('Cookie', cerez)
      .send({ odaNo: '101', kapasite: 2, katId });
    expect(r.status).toBe(201);
    expect(r.body.doluluk).toBe('bos');
    expect(r.body.temizlik).toBe('temiz');
    expect(r.body.kat.ad).toBe('1. Kat');
    odaId = r.body.id;
  });

  test('geçersiz TC reddedilir', async () => {
    const r = await (
      await istek()
    )
      .post('/api/konaklamalar')
      .set('Cookie', cerez)
      .send({
        odaId,
        konuklar: [
          {
            konuk: { kimlikTuru: 'tc', tc: '12345678901', uyruk: 'TUR', ad: 'Ali', soyad: 'Veli' },
          },
        ],
      });
    expect(r.status).toBe(400);
    expect(r.body.alanlar.tc).toBeDefined();
  });

  test('giriş kaydı', async () => {
    const r = await (
      await istek()
    )
      .post('/api/konaklamalar')
      .set('Cookie', cerez)
      .send({
        odaId,
        plaka: '34 abc 123',
        konuklar: [
          {
            konuk: {
              kimlikTuru: 'tc',
              tc: '10000000146',
              uyruk: 'TUR',
              ad: 'Ayşe',
              soyad: 'Kaya',
              dogumTarihi: '1990-05-01',
            },
          },
        ],
      });
    expect(r.status).toBe(201);
    expect(r.body).toHaveLength(1);
    konaklamaId = r.body[0].id;
    expect(r.body[0].tcMaskeli).toBe('*******0146');
    expect(r.body[0].plaka).toBe('34 ABC 123');
    expect(r.body[0].tur).toBe('gece');
    expect(r.body[0].planlananCikis.slice(11)).toBe('11:00');
    expect(r.body[0].odaGecmisi).toHaveLength(1);
    expect(r.body[0].bildirimler[0].tur).toBe('giris');
    expect(r.body[0].bildirimler[0].durum).toBe('manuel');
  });

  test('aynı konuk ikinci kez içeri alınamaz', async () => {
    const r = await (
      await istek()
    )
      .post('/api/konaklamalar')
      .set('Cookie', cerez)
      .send({
        odaId,
        konuklar: [
          {
            konuk: { kimlikTuru: 'tc', tc: '10000000146', uyruk: 'TUR', ad: 'Ayşe', soyad: 'Kaya' },
          },
        ],
      });
    expect(r.status).toBe(400);
    const konuklar = await db('konuklar');
    expect(konuklar).toHaveLength(1);
  });

  test('bildirim alanlarında TC çözülmüş gelir', async () => {
    const bildirimler = await db('kbs_bildirimler').where({ konaklama_id: konaklamaId });
    const r = await (await istek())
      .get(`/api/kbs/bildirimler/${bildirimler[0].id}/alanlar`)
      .set('Cookie', cerez);
    expect(r.status).toBe(200);
    expect(r.body.konuk.tc).toBe('10000000146');
    expect(r.body.odaNo).toBe('101');
  });

  test('manuel tamamlama bildirimi kapatır', async () => {
    const bildirimler = await db('kbs_bildirimler').where({ konaklama_id: konaklamaId });
    const r = await (await istek())
      .post(`/api/kbs/bildirimler/${bildirimler[0].id}/manuel-tamam`)
      .set('Cookie', cerez)
      .send({ referans: 'EGM-1' });
    expect(r.status).toBe(200);
    expect(r.body.durum).toBe('gonderildi');
    expect(r.body.yanitRef).toBe('EGM-1');
  });

  test('çıkış: oda kirli, görev ve bildirim var', async () => {
    const r = await (await istek())
      .put(`/api/konaklamalar/${konaklamaId}/cikis`)
      .set('Cookie', cerez)
      .send({});
    expect(r.status).toBe(200);
    expect(r.body.durum).toBe('ayrildi');
    expect(r.body.bildirimler.map((b) => b.tur)).toEqual(['giris', 'cikis']);
    expect(r.body.odaGecmisi[0].bitis).not.toBe('');
    const odalar = await (await istek()).get('/api/odalar').set('Cookie', cerez);
    expect(odalar.body[0].doluluk).toBe('bos');
    expect(odalar.body[0].temizlik).toBe('kirli');
    const gorevler = await (await istek()).get('/api/temizlik').set('Cookie', cerez);
    expect(gorevler.body).toHaveLength(1);
    expect(gorevler.body[0].durum).toBe('bekliyor');
  });

  test('kirli odaya giriş engellenir, zorla ile yönetici yerleştirir', async () => {
    const konuk = {
      konuk: { kimlikTuru: 'tc', tc: '11111111110', uyruk: 'TUR', ad: 'Can', soyad: 'Demir' },
    };
    const red = await (
      await istek()
    )
      .post('/api/konaklamalar')
      .set('Cookie', cerez)
      .send({ odaId, konuklar: [konuk] });
    expect(red.status).toBe(400);
    expect(red.body.alanlar.temizlik).toBe(true);
    const zorla = await (
      await istek()
    )
      .post('/api/konaklamalar')
      .set('Cookie', cerez)
      .send({ odaId, zorla: true, konuklar: [konuk] });
    expect(zorla.status).toBe(201);
    await (await istek())
      .put(`/api/konaklamalar/${zorla.body[0].id}/cikis`)
      .set('Cookie', cerez)
      .send({});
  });

  test('günlük liste o günü gösterir', async () => {
    const r = await (await istek())
      .get(`/api/raporlar/gunluk?tarih=${yerelGun(0)}`)
      .set('Cookie', cerez);
    expect(r.status).toBe(200);
    expect(r.body.satirlar.length).toBeGreaterThanOrEqual(1);
  });
});
