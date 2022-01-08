const request = require('supertest');
const db = require('../src/db/knex');
const app = require('../src/app');

beforeAll(async () => {
  await db.migrate.latest();
  await db.seed.run();
});

afterAll(async () => {
  await db.destroy();
});

describe('oturum', () => {
  test('yanlış parola 401 döner', async () => {
    const r = await request(app)
      .post('/api/auth/giris')
      .send({ kullaniciAdi: 'yonetici', parola: 'yanlis' });
    expect(r.status).toBe(401);
    expect(r.body.hata).toBeDefined();
  });

  test('doğru parola çerez verir ve /ben çalışır', async () => {
    const giris = await request(app)
      .post('/api/auth/giris')
      .send({ kullaniciAdi: 'yonetici', parola: 'test1234' });
    expect(giris.status).toBe(200);
    expect(giris.body.rol).toBe('yonetici');
    const cerez = giris.headers['set-cookie'];
    expect(cerez).toBeDefined();

    const ben = await request(app).get('/api/auth/ben').set('Cookie', cerez);
    expect(ben.status).toBe(200);
    expect(ben.body.kullaniciAdi).toBe('yonetici');
  });

  test('çerezsiz istek 401', async () => {
    const r = await request(app).get('/api/odalar');
    expect(r.status).toBe(401);
  });

  test('eksik alan 400 ve alan mesajı', async () => {
    const r = await request(app).post('/api/auth/giris').send({ kullaniciAdi: 'yo' });
    expect(r.status).toBe(400);
    expect(r.body.alanlar.parola).toBe('Zorunlu alan');
  });
});
