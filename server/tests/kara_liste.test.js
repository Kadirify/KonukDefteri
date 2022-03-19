const request = require('supertest');
const db = require('../src/db/knex');
const app = require('../src/app');

let cerez;
let odaId;
let konukId;

beforeAll(async () => {
  await db.migrate.latest();
  await db.seed.run();
  const giris = await request(app)
    .post('/api/auth/giris')
    .send({ kullaniciAdi: 'yonetici', parola: 'test1234' });
  cerez = giris.headers['set-cookie'];
  const kat = await request(app).post('/api/katlar').set('Cookie', cerez).send({ ad: '3. Kat' });
  const oda = await request(app)
    .post('/api/odalar')
    .set('Cookie', cerez)
    .send({ odaNo: '301', kapasite: 2, katId: kat.body.id });
  odaId = oda.body.id;
});

afterAll(async () => {
  await db.destroy();
});

const veli = { kimlikTuru: 'tc', tc: '10000000146', uyruk: 'TUR', ad: 'Veli', soyad: 'Kara' };

describe('kara liste', () => {
  test('konuk kartından kara listeye alınır', async () => {
    const k = await request(app).post('/api/konuklar').set('Cookie', cerez).send(veli);
    expect(k.status).toBe(201);
    konukId = k.body.id;
    const r = await request(app)
      .put(`/api/konuklar/${konukId}`)
      .set('Cookie', cerez)
      .send({ ...veli, tc: '', karaListe: true, karaListeNeden: 'Ödemeden ayrıldı' });
    expect(r.status).toBe(200);
    expect(r.body.karaListe).toBe(true);
    expect(r.body.karaListeNeden).toBe('Ödemeden ayrıldı');
  });

  test('girişte reddedilir, nedeni söylenir', async () => {
    const r = await request(app)
      .post('/api/konaklamalar')
      .set('Cookie', cerez)
      .send({ odaId, konuklar: [{ konukId }] });
    expect(r.status).toBe(400);
    expect(r.body.alanlar.karaListe).toBe(true);
    expect(r.body.hata).toContain('Ödemeden ayrıldı');
  });

  test('aynı TC ile yeni kart girilse de yakalanır, işaret silinmez', async () => {
    const r = await request(app)
      .post('/api/konaklamalar')
      .set('Cookie', cerez)
      .send({ odaId, konuklar: [{ konuk: { ...veli, ad: 'V.' } }] });
    expect(r.status).toBe(400);
    expect(r.body.alanlar.karaListe).toBe(true);
    const satir = await db('konuklar').where({ id: konukId }).first();
    expect(satir.kara_liste).toBeTruthy();
    expect(satir.ad).toBe('Veli');
  });

  test('yönetici zorla alabiliyor, işaret silinmiyor', async () => {
    const r = await request(app)
      .post('/api/konaklamalar')
      .set('Cookie', cerez)
      .send({ odaId, zorla: true, konuklar: [{ konuk: { ...veli, telefon: '0555' } }] });
    expect(r.status).toBe(201);
    expect(r.body[0].karaListe).toBe(true);
    expect(r.body[0].karaListeNeden).toBe('Ödemeden ayrıldı');
    const satir = await db('konuklar').where({ id: konukId }).first();
    expect(satir.kara_liste).toBeTruthy();
    expect(satir.telefon).toBe('0555');
    const kayit = await db('islem_gunlugu').where({ islem: 'kara_liste_giris' }).first();
    expect(kayit.hedef).toBe('konaklama:' + r.body[0].id);
    expect(JSON.parse(kayit.ayrinti).konuk).toBe('Veli Kara');
  });

  test('resepsiyon zorla diyemez', async () => {
    await request(app)
      .put(`/api/konaklamalar/${(await db('konaklamalar').first()).id}/cikis`)
      .set('Cookie', cerez)
      .send({});
    // çıkışta oda kirlendi; kara liste kontrolüne gelebilsin diye temizle
    await db('odalar').where({ id: odaId }).update({ temizlik: 'temiz' });
    await request(app).post('/api/kullanicilar').set('Cookie', cerez).send({
      kullaniciAdi: 'resep',
      adSoyad: 'Resepsiyon',
      parola: 'resep1234',
      rol: 'resepsiyon',
    });
    const giris = await request(app)
      .post('/api/auth/giris')
      .send({ kullaniciAdi: 'resep', parola: 'resep1234' });
    const r = await request(app)
      .post('/api/konaklamalar')
      .set('Cookie', giris.headers['set-cookie'])
      .send({ odaId, zorla: true, konuklar: [{ konukId }] });
    expect(r.status).toBe(400);
    expect(r.body.alanlar.karaListe).toBe(true);
  });
});
