const express = require('express');
const Joi = require('joi');
const db = require('../db/knex');
const konuk = require('../services/konuk');
const konaklama = require('../services/konaklama');
const tesis = require('../services/tesis');
const { yetki } = require('../middleware/auth');
const { dogrula } = require('../middleware/dogrula');
const { HttpHata } = require('../middleware/hata');
const { sar } = require('../utils/async');
const { bugun, gunEkle, gecerliZaman } = require('../utils/tarih');
const gunluk = require('../services/gunluk');

const router = express.Router();
router.use(yetki('yonetici', 'resepsiyon'));

const tarih = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);
const KAYNAKLAR = ['telefon', 'booking', 'airbnb', 'kapidan', 'diger'];

const sema = Joi.object({
  konukId: Joi.number().integer().allow(null),
  adSoyad: Joi.string().trim().max(80).allow(''),
  telefon: Joi.string().trim().max(30).allow(''),
  odaId: Joi.number().integer().allow(null),
  girisTarihi: tarih.required(),
  cikisTarihi: tarih.required(),
  kisiSayisi: Joi.number().integer().min(1).max(20).default(1),
  kaynak: Joi.string()
    .valid(...KAYNAKLAR)
    .default('telefon'),
  durum: Joi.string().valid('bekliyor', 'onayli').default('onayli'),
  notlar: Joi.string().trim().max(300).allow(''),
});

const zaman = Joi.string().custom((v, h) => (gecerliZaman(v) ? v : h.error('any.invalid')));
const girisSemasi = Joi.object({
  odaId: Joi.number().integer().allow(null),
  girisZamani: zaman.allow(''),
  plaka: Joi.string().trim().uppercase().max(15).allow(''),
  zorla: Joi.boolean().default(false),
  konuklar: Joi.array()
    .items(
      Joi.object({ konukId: Joi.number().integer(), konuk: konuk.yeniSema }).or('konukId', 'konuk')
    )
    .max(20),
});

function dto(r) {
  return {
    id: r.id,
    konukId: r.konuk_id || null,
    adSoyad: r.ad_soyad || (r.konuk_ad ? `${r.konuk_ad} ${r.konuk_soyad}` : ''),
    telefon: r.telefon || r.konuk_telefon || '',
    odaId: r.oda_id || null,
    odaNo: r.oda_no || '',
    girisTarihi: r.giris_tarihi,
    cikisTarihi: r.cikis_tarihi,
    kisiSayisi: r.kisi_sayisi,
    durum: r.durum,
    kaynak: r.kaynak,
    notlar: r.notlar || '',
    konaklamaId: r.konaklama_id || null,
    olusturma: r.olusturma,
  };
}

function sorgu() {
  return db('rezervasyonlar')
    .leftJoin('konuklar', 'konuklar.id', 'rezervasyonlar.konuk_id')
    .leftJoin('odalar', 'odalar.id', 'rezervasyonlar.oda_id')
    .select(
      'rezervasyonlar.*',
      'konuklar.ad as konuk_ad',
      'konuklar.soyad as konuk_soyad',
      'konuklar.telefon as konuk_telefon',
      'odalar.oda_no'
    );
}

// Aynı oda, kesişen tarih aralığı (çıkış günü = giriş günü olabilir)
async function cakisma(odaId, giris, cikis, haricId) {
  if (!odaId) return null;
  let q = db('rezervasyonlar')
    .where({ oda_id: odaId })
    .whereIn('durum', ['bekliyor', 'onayli'])
    .where('giris_tarihi', '<', cikis)
    .where('cikis_tarihi', '>', giris);
  if (haricId) q = q.whereNot({ id: haricId });
  const r = await q.first();
  if (r)
    return `Oda ${r.giris_tarihi}-${r.cikis_tarihi} arasında ${
      r.ad_soyad || 'başka bir konuk'
    } adına rezerve`;
  const ayarlar = await tesis.ayarlar();
  const icerde = await db('konaklamalar')
    .join('konuklar', 'konuklar.id', 'konaklamalar.konuk_id')
    .where({ oda_id: odaId, 'konaklamalar.durum': 'konakliyor' })
    .where((w) => {
      w.whereNull('planlanan_cikis').orWhere(
        'planlanan_cikis',
        '>',
        `${giris} ${ayarlar.giris_saati || '14:00'}`
      );
    })
    .select('konuklar.ad', 'konuklar.soyad', 'konaklamalar.planlanan_cikis')
    .first();
  if (icerde)
    return `Odada ${icerde.ad} ${icerde.soyad} konaklıyor, planlanan çıkış ${
      icerde.planlanan_cikis || 'belirsiz'
    }`;
  return null;
}

router.get(
  '/',
  sar(async (req, res) => {
    const aralik = req.query.aralik || 'gelecek';
    const gun = bugun();
    let q = sorgu().orderBy([
      { column: 'rezervasyonlar.giris_tarihi' },
      { column: 'rezervasyonlar.id' },
    ]);
    if (aralik === 'bugun')
      q = q
        .where('rezervasyonlar.giris_tarihi', gun)
        .whereIn('rezervasyonlar.durum', ['bekliyor', 'onayli']);
    else if (aralik === 'yarin')
      q = q
        .where('rezervasyonlar.giris_tarihi', gunEkle(gun + ' 00:00', 1).slice(0, 10))
        .whereIn('rezervasyonlar.durum', ['bekliyor', 'onayli']);
    else if (aralik === 'hafta')
      q = q
        .whereBetween('rezervasyonlar.giris_tarihi', [gun, gunEkle(gun + ' 00:00', 7).slice(0, 10)])
        .whereIn('rezervasyonlar.durum', ['bekliyor', 'onayli']);
    else if (aralik === 'gelecek')
      q = q
        .where('rezervasyonlar.cikis_tarihi', '>=', gun)
        .whereIn('rezervasyonlar.durum', ['bekliyor', 'onayli']);
    else q = q.orderBy('rezervasyonlar.id', 'desc').limit(300);
    res.json((await q).map(dto));
  })
);

router.get(
  '/:id',
  sar(async (req, res) => {
    const r = await sorgu().where('rezervasyonlar.id', Number(req.params.id)).first();
    if (!r) throw new HttpHata(404, 'Rezervasyon bulunamadı');
    res.json(dto(r));
  })
);

async function kaydiHazirla(b) {
  if (!b.konukId && !b.adSoyad)
    throw new HttpHata(400, 'Konuk seçin ya da ad soyad yazın', { adSoyad: 'Zorunlu alan' });
  if (b.cikisTarihi <= b.girisTarihi)
    throw new HttpHata(400, 'Çıkış tarihi girişten sonra olmalı', {
      cikisTarihi: 'Girişten sonra',
    });
  if (b.odaId) {
    const oda = await db('odalar').where({ id: b.odaId }).first();
    if (!oda || oda.tur === 'ortak')
      throw new HttpHata(400, 'Oda bulunamadı', { odaId: 'Geçersiz oda' });
    if (oda.kullanim === 'kapali')
      throw new HttpHata(400, `${oda.oda_no} numaralı oda kapalı`, { odaId: 'Kapalı' });
    if (b.kisiSayisi > oda.kapasite)
      throw new HttpHata(400, `${oda.oda_no} numaralı odanın kapasitesi ${oda.kapasite}`, {
        kisiSayisi: 'Kapasite aşılıyor',
      });
  }
  return {
    konuk_id: b.konukId || null,
    ad_soyad: b.adSoyad || '',
    telefon: b.telefon || '',
    oda_id: b.odaId || null,
    giris_tarihi: b.girisTarihi,
    cikis_tarihi: b.cikisTarihi,
    kisi_sayisi: b.kisiSayisi,
    durum: b.durum,
    kaynak: b.kaynak,
    notlar: b.notlar || '',
  };
}

router.post(
  '/',
  dogrula(sema),
  sar(async (req, res) => {
    const veri = await kaydiHazirla(req.body);
    const catisma = await cakisma(veri.oda_id, veri.giris_tarihi, veri.cikis_tarihi, null);
    if (catisma) throw new HttpHata(409, catisma, { odaId: 'Çakışma' });
    const [id] = await db('rezervasyonlar').insert({ ...veri, olusturan: req.kullanici.id });
    gunluk.kaydet(req, 'rezervasyon_ekle', 'rezervasyon:' + id, {
      oda: veri.oda_id,
      giris: veri.giris_tarihi,
    });
    res.status(201).json(dto(await sorgu().where('rezervasyonlar.id', id).first()));
  })
);

router.put(
  '/:id',
  dogrula(sema),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    const r = await db('rezervasyonlar').where({ id }).first();
    if (!r) throw new HttpHata(404, 'Rezervasyon bulunamadı');
    if (!['bekliyor', 'onayli'].includes(r.durum))
      throw new HttpHata(400, 'Kapatılmış rezervasyon düzenlenemez');
    const veri = await kaydiHazirla(req.body);
    const catisma = await cakisma(veri.oda_id, veri.giris_tarihi, veri.cikis_tarihi, id);
    if (catisma) throw new HttpHata(409, catisma, { odaId: 'Çakışma' });
    await db('rezervasyonlar').where({ id }).update(veri);
    gunluk.kaydet(req, 'rezervasyon_duzenle', 'rezervasyon:' + id);
    res.json(dto(await sorgu().where('rezervasyonlar.id', id).first()));
  })
);

// Rezervasyondan giriş: konuk kartı varsa onunla, yoksa gönderilen konuk bilgileriyle
router.post(
  '/:id/giris',
  dogrula(girisSemasi),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    const r = await db('rezervasyonlar').where({ id }).first();
    if (!r) throw new HttpHata(404, 'Rezervasyon bulunamadı');
    if (!['bekliyor', 'onayli'].includes(r.durum))
      throw new HttpHata(400, 'Bu rezervasyon kapatılmış');
    let konuklar = req.body.konuklar;
    if (!konuklar || !konuklar.length) {
      if (!r.konuk_id)
        throw new HttpHata(400, 'Rezervasyonda konuk kartı yok; konuk bilgilerini girin', {
          konuklar: 'Zorunlu alan',
        });
      konuklar = [{ konukId: r.konuk_id }];
    }
    const odaId = req.body.odaId || r.oda_id;
    if (!odaId) throw new HttpHata(400, 'Önce oda seçin', { odaId: 'Zorunlu alan' });
    const olusanlar = await konaklama.girisYap(req, {
      odaId,
      girisZamani: req.body.girisZamani || '',
      plaka: req.body.plaka || '',
      tur: 'gece',
      planlananCikis: `${r.cikis_tarihi} ${(await tesis.ayar('cikis_saati', '11:00')) || '11:00'}`,
      rezervasyonId: id,
      zorla: req.body.zorla,
      konuklar,
    });
    res.status(201).json({
      konaklamalar: olusanlar,
      rezervasyon: dto(await sorgu().where('rezervasyonlar.id', id).first()),
    });
  })
);

async function durumDegistir(req, res, yeni, islem) {
  const id = Number(req.params.id);
  const r = await db('rezervasyonlar').where({ id }).first();
  if (!r) throw new HttpHata(404, 'Rezervasyon bulunamadı');
  if (!['bekliyor', 'onayli'].includes(r.durum))
    throw new HttpHata(400, 'Bu rezervasyon zaten kapatılmış');
  await db('rezervasyonlar').where({ id }).update({ durum: yeni });
  gunluk.kaydet(req, islem, 'rezervasyon:' + id);
  res.json(dto(await sorgu().where('rezervasyonlar.id', id).first()));
}

router.post(
  '/:id/iptal',
  sar((req, res) => durumDegistir(req, res, 'iptal', 'rezervasyon_iptal'))
);
router.post(
  '/:id/gelmedi',
  sar((req, res) => durumDegistir(req, res, 'gelmedi', 'rezervasyon_gelmedi'))
);

module.exports = router;
