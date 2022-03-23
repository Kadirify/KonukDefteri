const request = require('supertest');
const db = require('../src/db/knex');
const app = require('../src/app');
const { yerelGun } = require('./yardimci');

let cerez;

beforeAll(async () => {
  await db.migrate.latest();
  await db.seed.run();
  const giris = await request(app)
    .post('/api/auth/giris')
    .send({ kullaniciAdi: 'yonetici', parola: 'test1234' });
  cerez = giris.headers['set-cookie'];
  await request(app).post('/api/katlar').set('Cookie', cerez).send({ ad: 'Zemin' });
});

afterAll(async () => {
  await db.destroy();
});

describe('işlem günlüğü', () => {
  test('liste ve toplam', async () => {
    const r = await request(app).get('/api/gunluk').set('Cookie', cerez);
    expect(r.status).toBe(200);
    expect(r.body.toplam).toBeGreaterThanOrEqual(2);
    expect(r.body.satirlar[0].islem).toBe('kat_ekle');
    expect(r.body.satirlar[0].hedef).toBe('kat:1');
    expect(r.body.satirlar[0].kullaniciId).toBe(1);
    expect(r.body.islemler).toEqual(expect.arrayContaining(['giris', 'kat_ekle']));
  });

  test('işlem, metin ve tarih süzgeçleri çalışır', async () => {
    const islem = await request(app).get('/api/gunluk?islem=giris').set('Cookie', cerez);
    expect(islem.body.satirlar.length).toBeGreaterThanOrEqual(1);
    expect(islem.body.satirlar.every((s) => s.islem === 'giris')).toBe(true);
    const metin = await request(app).get('/api/gunluk?q=kat:').set('Cookie', cerez);
    expect(metin.body.toplam).toBe(1);
    const bugun = await request(app)
      .get(`/api/gunluk?baslangic=${yerelGun(0)}&bitis=${yerelGun(0)}`)
      .set('Cookie', cerez);
    expect(bugun.body.toplam).toBeGreaterThanOrEqual(2);
    const gelecek = await request(app).get('/api/gunluk?baslangic=2099-01-01').set('Cookie', cerez);
    expect(gelecek.body.toplam).toBe(0);
    const bos = await request(app).get('/api/gunluk?sayfa=99').set('Cookie', cerez);
    expect(bos.body.satirlar).toEqual([]);
    expect(bos.body.sayfa).toBe(99);
  });

  test('resepsiyon günlüğü göremez', async () => {
    await request(app).post('/api/kullanicilar').set('Cookie', cerez).send({
      kullaniciAdi: 'resep',
      adSoyad: 'Resepsiyon',
      parola: 'resep1234',
      rol: 'resepsiyon',
    });
    const giris = await request(app)
      .post('/api/auth/giris')
      .send({ kullaniciAdi: 'resep', parola: 'resep1234' });
    const r = await request(app).get('/api/gunluk').set('Cookie', giris.headers['set-cookie']);
    expect(r.status).toBe(403);
  });
});
