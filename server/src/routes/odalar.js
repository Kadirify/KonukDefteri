const express = require('express');
const Joi = require('joi');
const db = require('../db/knex');
const { yetki } = require('../middleware/auth');
const { dogrula } = require('../middleware/dogrula');
const { HttpHata } = require('../middleware/hata');
const { sar } = require('../utils/async');

const router = express.Router();

const sema = Joi.object({
  odaNo: Joi.string().trim().min(1).max(10).required(),
  tip: Joi.string().trim().max(40).allow(''),
  kapasite: Joi.number().integer().min(1).max(20).required(),
  kat: Joi.string().trim().max(40).allow(''),
  aktif: Joi.boolean().default(true),
  notlar: Joi.string().trim().max(200).allow(''),
});

// Odada şu an kim var: oda id -> konaklayan listesi
async function konaklayanHaritasi() {
  const satirlar = await db('konaklamalar')
    .join('konuklar', 'konuklar.id', 'konaklamalar.konuk_id')
    .where('konaklamalar.durum', 'konakliyor')
    .select(
      'konaklamalar.id as konaklamaId',
      'konaklamalar.oda_id as odaId',
      'konaklamalar.giris_zamani as girisZamani',
      'konaklamalar.grup_kodu as grupKodu',
      'konuklar.id as konukId',
      'konuklar.ad',
      'konuklar.soyad'
    );
  const harita = {};
  satirlar.forEach((s) => {
    if (!harita[s.odaId]) harita[s.odaId] = [];
    harita[s.odaId].push(s);
  });
  return harita;
}

function odaSirala(a, b) {
  return String(a.oda_no).localeCompare(String(b.oda_no), 'tr', {
    numeric: true,
  });
}

function dto(o, konaklayanlar) {
  const liste = konaklayanlar || [];
  let durum = 'bos';
  if (!o.aktif) durum = 'kapali';
  else if (liste.length) durum = 'dolu';
  return {
    id: o.id,
    odaNo: o.oda_no,
    tip: o.tip || '',
    kapasite: o.kapasite,
    kat: o.kat || '',
    aktif: !!o.aktif,
    notlar: o.notlar || '',
    durum,
    dolu: liste.length,
    konaklayanlar: liste,
  };
}

async function hepsi() {
  const [odalar, konaklayanlar] = await Promise.all([db('odalar'), konaklayanHaritasi()]);
  return odalar.sort(odaSirala).map((o) => dto(o, konaklayanlar[o.id]));
}

async function oku(id) {
  const o = await db('odalar').where({ id }).first();
  if (!o) return null;
  const konaklayanlar = await konaklayanHaritasi();
  return dto(o, konaklayanlar[o.id]);
}

function odaKaydet(b) {
  return {
    oda_no: b.odaNo,
    tip: b.tip || '',
    kapasite: b.kapasite,
    kat: b.kat || '',
    aktif: b.aktif,
    notlar: b.notlar || '',
  };
}

router.get(
  '/',
  sar(async (req, res) => {
    res.json(await hepsi());
  })
);

router.post(
  '/',
  yetki('yonetici'),
  dogrula(sema),
  sar(async (req, res) => {
    const b = req.body;
    const var_ = await db('odalar').where({ oda_no: b.odaNo }).first();
    if (var_)
      throw new HttpHata(409, 'Bu oda numarası zaten var', {
        odaNo: 'Kullanılıyor',
      });
    const [id] = await db('odalar').insert(odaKaydet(b));
    res.status(201).json(await oku(id));
  })
);

router.put(
  '/:id',
  yetki('yonetici'),
  dogrula(sema),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    const o = await db('odalar').where({ id }).first();
    if (!o) throw new HttpHata(404, 'Oda bulunamadı');
    const b = req.body;
    const cakisan = await db('odalar').where({ oda_no: b.odaNo }).whereNot({ id }).first();
    if (cakisan)
      throw new HttpHata(409, 'Bu oda numarası zaten var', {
        odaNo: 'Kullanılıyor',
      });
    if (!b.aktif) {
      const dolu = await db('konaklamalar').where({ oda_id: id, durum: 'konakliyor' }).first();
      if (dolu) throw new HttpHata(400, 'İçinde konuk varken oda kapatılamaz');
    }
    await db('odalar').where({ id }).update(odaKaydet(b));
    res.json(await oku(id));
  })
);

module.exports = router;
