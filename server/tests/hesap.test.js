const request = require('supertest');
const db = require('../src/db/knex');
const app = require('../src/app');
const { yerelGun } = require('./yardimci');

let cerez;
let odaId;
let konaklamaId;
let hesapId;

beforeAll(async () => {
  await db.migrate.latest();
  await db.seed.run();
  const giris = await request(app)
    .post('/api/auth/giris')
    .send({ kullaniciAdi: 'yonetici', parola: 'test1234' });
  cerez = giris.headers['set-cookie'];
  const kat = await request(app).post('/api/katlar').set('Cookie', cerez).send({ ad: 'Zemin' });
  const oda = await request(app).post('/api/odalar').set('Cookie', cerez).send({
    odaNo: 'Z1',
    kapasite: 2,
    katId: kat.body.id,
    gecelikFiyat: 800,
    gunubirlikFiyat: 300,
  });
  odaId = oda.body.id;
});

afterAll(async () => {
  await db.destroy();
});

describe('hesap ve tahsilat', () => {
  test('girişte hesap ve konaklama kalemi açılır (2 gece)', async () => {
    const giris = await request(app)
      .post('/api/konaklamalar')
      .set('Cookie', cerez)
      .send({
        odaId,
        girisZamani: `${yerelGun(0)} 14:00`,
        planlananCikis: `${yerelGun(2)} 11:00`,
        konuklar: [
          {
            konuk: { kimlikTuru: 'tc', tc: '10000000146', uyruk: 'TUR', ad: 'Ayşe', soyad: 'Kaya' },
          },
        ],
      });
    expect(giris.status).toBe(201);
    konaklamaId = giris.body[0].id;
    hesapId = giris.body[0].hesapId;
    expect(hesapId).toBeTruthy();
    const h = await request(app).get(`/api/hesaplar/${hesapId}`).set('Cookie', cerez);
    expect(h.body.kalemler).toHaveLength(1);
    expect(h.body.kalemler[0].adet).toBe(2);
    expect(h.body.toplam).toBe(1600);
    expect(h.body.bakiye).toBe(1600);
  });

  test('ekstra kalem, indirim ve tahsilat bakiyeyi değiştirir', async () => {
    const k = await request(app)
      .post(`/api/hesaplar/${hesapId}/kalemler`)
      .set('Cookie', cerez)
      .send({ aciklama: 'Kahvaltı', adet: 2, birimFiyat: 75 });
    expect(k.status).toBe(201);
    expect(k.body.toplam).toBe(1750);
    const i = await request(app)
      .post(`/api/hesaplar/${hesapId}/kalemler`)
      .set('Cookie', cerez)
      .send({ tur: 'indirim', aciklama: 'Tanıdık indirimi', birimFiyat: 150 });
    expect(i.body.toplam).toBe(1600);
    const t = await request(app)
      .post(`/api/hesaplar/${hesapId}/tahsilatlar`)
      .set('Cookie', cerez)
      .send({ tutar: 1000, yontem: 'kart' });
    expect(t.body.tahsilat).toBe(1000);
    expect(t.body.bakiye).toBe(600);
  });

  test('erken çıkışta gece sayısı yeniden hesaplanır', async () => {
    const c = await request(app)
      .put(`/api/konaklamalar/${konaklamaId}/cikis`)
      .set('Cookie', cerez)
      .send({ cikisZamani: `${yerelGun(1)} 10:30` });
    expect(c.status).toBe(200);
    const h = await request(app).get(`/api/hesaplar/${hesapId}`).set('Cookie', cerez);
    const konaklamaKalemi = h.body.kalemler.find((x) => x.tur === 'konaklama');
    expect(konaklamaKalemi.adet).toBe(1);
    expect(h.body.toplam).toBe(800);
    expect(h.body.bakiye).toBe(-200); // fazla ödeme, iade gerekir
  });

  test('hesap kapanınca kalem eklenemez, yönetici açınca eklenir', async () => {
    const kapat = await request(app).post(`/api/hesaplar/${hesapId}/kapat`).set('Cookie', cerez);
    expect(kapat.body.durum).toBe('kapali');
    const red = await request(app)
      .post(`/api/hesaplar/${hesapId}/kalemler`)
      .set('Cookie', cerez)
      .send({ aciklama: 'Geç', birimFiyat: 10 });
    expect(red.status).toBe(400);
    const ac = await request(app).post(`/api/hesaplar/${hesapId}/ac`).set('Cookie', cerez);
    expect(ac.body.durum).toBe('acik');
  });

  test('kasa raporu tahsilatı gösterir', async () => {
    const r = await request(app)
      .get(`/api/raporlar/kasa?baslangic=${yerelGun(0)}&bitis=${yerelGun(0)}`)
      .set('Cookie', cerez);
    expect(r.status).toBe(200);
    expect(r.body.toplam).toBe(1000);
    expect(r.body.yontemler.kart).toBe(1000);
    expect(r.body.satirlar[0].konuk).toBe('Ayşe Kaya');
  });

  test('fiş verisi tesis ve konukla gelir', async () => {
    const f = await request(app).get(`/api/hesaplar/${hesapId}/fis`).set('Cookie', cerez);
    expect(f.status).toBe(200);
    expect(f.body.konaklama.adSoyad).toBe('Ayşe Kaya');
    expect(f.body.tesis).toBeDefined();
  });
});
