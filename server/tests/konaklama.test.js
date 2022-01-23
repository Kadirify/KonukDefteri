const request = require('supertest');
const db = require('../src/db/knex');
const app = require('../src/app');

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
  let odaId;
  let konaklamaId;

  test('oda eklenir', async () => {
    const r = await (await istek())
      .post('/api/odalar')
      .set('Cookie', cerez)
      .send({ odaNo: '101', kapasite: 2, kat: '1. Kat' });
    expect(r.status).toBe(201);
    expect(r.body.durum).toBe('bos');
    expect(r.body.kat).toBe('1. Kat');
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
            konuk: {
              kimlikTuru: 'tc',
              tc: '12345678901',
              uyruk: 'TUR',
              ad: 'Ali',
              soyad: 'Veli',
            },
          },
        ],
      });
    expect(r.status).toBe(400);
    expect(r.body.alanlar.tc).toBeDefined();
  });

  test('giriş kaydı konuk ve manuel bildirim üretir', async () => {
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
    expect(r.body[0].durum).toBe('konakliyor');
    expect(r.body[0].bildirimler[0].tur).toBe('giris');
    expect(r.body[0].bildirimler[0].durum).toBe('manuel');
    const liste = await (await istek()).get('/api/konaklamalar').set('Cookie', cerez);
    expect(liste.body[0].bildirim.durum).toBe('manuel');
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
            konuk: {
              kimlikTuru: 'tc',
              tc: '10000000146',
              uyruk: 'TUR',
              ad: 'Ayşe',
              soyad: 'Kaya',
            },
          },
        ],
      });
    expect(r.status).toBe(400);
    const konuklar = await db('konuklar');
    expect(konuklar).toHaveLength(1);
  });

  test('bildirim alanlarında TC çözülmüş gelir', async () => {
    const bildirimler = await db('kbs_bildirimler').where({
      konaklama_id: konaklamaId,
    });
    const r = await (await istek())
      .get(`/api/kbs/bildirimler/${bildirimler[0].id}/alanlar`)
      .set('Cookie', cerez);
    expect(r.status).toBe(200);
    expect(r.body.konuk.tc).toBe('10000000146');
    expect(r.body.odaNo).toBe('101');
  });

  test('manuel tamamlama bildirimi kapatır', async () => {
    const bildirimler = await db('kbs_bildirimler').where({
      konaklama_id: konaklamaId,
    });
    const r = await (await istek())
      .post(`/api/kbs/bildirimler/${bildirimler[0].id}/manuel-tamam`)
      .set('Cookie', cerez)
      .send({ referans: 'EGM-1' });
    expect(r.status).toBe(200);
    expect(r.body.durum).toBe('gonderildi');
    expect(r.body.yanitRef).toBe('EGM-1');
  });

  test('çıkış kaydı durumu ayrildi yapar, çıkış bildirimi üretir', async () => {
    const r = await (await istek())
      .put(`/api/konaklamalar/${konaklamaId}/cikis`)
      .set('Cookie', cerez)
      .send({});
    expect(r.status).toBe(200);
    expect(r.body.durum).toBe('ayrildi');
    expect(r.body.bildirimler.map((b) => b.tur)).toEqual(['giris', 'cikis']);
    const odalar = await (await istek()).get('/api/odalar').set('Cookie', cerez);
    expect(odalar.body[0].durum).toBe('bos');
  });
});
