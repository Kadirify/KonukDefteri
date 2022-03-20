const fs = require('fs');
const path = require('path');
const request = require('supertest');
const db = require('../src/db/knex');
const app = require('../src/app');

let cerez;
let yedekAdi;

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

describe('yedekleme', () => {
  test('yedek alınır, listelenir ve dosya oluşur', async () => {
    await request(app).post('/api/katlar').set('Cookie', cerez).send({ ad: 'Kat A' });
    const r = await request(app).post('/api/yedek').set('Cookie', cerez);
    expect(r.status).toBe(201);
    expect(r.body.ad).toMatch(/^konukdefteri-\d{4}-\d{2}-\d{2}-\d{4}-manuel\.sqlite$/);
    expect(r.body.tur).toBe('manuel');
    yedekAdi = r.body.ad;
    const l = await request(app).get('/api/yedek').set('Cookie', cerez);
    expect(l.body.dosyalar).toHaveLength(1);
    expect(fs.existsSync(path.join(l.body.klasor, yedekAdi))).toBe(true);
    expect(fs.statSync(path.join(l.body.klasor, yedekAdi)).size).toBeGreaterThan(0);
  });

  test('geri yükleme yedekten sonra eklenen veriyi geri alır', async () => {
    await request(app).post('/api/katlar').set('Cookie', cerez).send({ ad: 'Kat B' });
    expect(await db('katlar')).toHaveLength(2);
    const r = await request(app)
      .post(`/api/yedek/${yedekAdi}/geri-yukle`)
      .set('Cookie', cerez)
      .send({ onay: true });
    expect(r.status).toBe(200);
    const katlar = await db('katlar');
    expect(katlar.map((k) => k.ad)).toEqual(['Kat A']);
    const l = await request(app).get('/api/yedek').set('Cookie', cerez);
    expect(l.body.dosyalar.some((d) => d.tur === 'guvenlik')).toBe(true);
    // oturum ve sayaçlar bozulmamalı: yeni kayıt eklenebilir
    const k = await request(app).post('/api/katlar').set('Cookie', cerez).send({ ad: 'Kat C' });
    expect(k.status).toBe(201);
    const gunlukKaydi = await db('islem_gunlugu').where({ islem: 'yedek_geri_yukle' }).first();
    expect(gunlukKaydi.hedef).toBe(yedekAdi);
  });

  test('geçersiz ad reddedilir, yedek silinir', async () => {
    const kotu = await request(app)
      .delete('/api/yedek/..%2Fkonukdefteri.sqlite')
      .set('Cookie', cerez);
    expect(kotu.status).toBe(400);
    const r = await request(app).delete(`/api/yedek/${yedekAdi}`).set('Cookie', cerez);
    expect(r.status).toBe(200);
    const l = await request(app).get('/api/yedek').set('Cookie', cerez);
    expect(l.body.dosyalar.some((d) => d.ad === yedekAdi)).toBe(false);
  });

  test('resepsiyon yedek alamaz', async () => {
    await request(app).post('/api/kullanicilar').set('Cookie', cerez).send({
      kullaniciAdi: 'resep',
      adSoyad: 'Resepsiyon',
      parola: 'resep1234',
      rol: 'resepsiyon',
    });
    const giris = await request(app)
      .post('/api/auth/giris')
      .send({ kullaniciAdi: 'resep', parola: 'resep1234' });
    const r = await request(app).post('/api/yedek').set('Cookie', giris.headers['set-cookie']);
    expect(r.status).toBe(403);
  });
});
