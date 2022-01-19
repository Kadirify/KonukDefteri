const express = require('express');
const Joi = require('joi');
const db = require('../db/knex');
const konuk = require('../services/konuk');
const konaklama = require('../services/konaklama');
const { dogrula } = require('../middleware/dogrula');
const { HttpHata } = require('../middleware/hata');
const { sar } = require('../utils/async');
const { gecerliZaman } = require('../utils/tarih');

const router = express.Router();

const zaman = Joi.string().custom((v, h) => (gecerliZaman(v) ? v : h.error('any.invalid')));

// Tek konuk ya da grup: konuklar dizisi; her eleman ya kayıtlı konukId ya da yeni konuk bilgisi
const girisSemasi = Joi.object({
  odaId: Joi.number().integer().required(),
  girisZamani: zaman.allow(''),
  plaka: Joi.string().trim().uppercase().max(15).allow(''),
  konuklar: Joi.array()
    .items(
      Joi.object({
        konukId: Joi.number().integer(),
        konuk: konuk.yeniSema,
      }).or('konukId', 'konuk')
    )
    .min(1)
    .max(20)
    .required(),
});

const cikisSemasi = Joi.object({
  cikisZamani: zaman.allow(''),
  grupHepsi: Joi.boolean().default(false),
});

const odaSemasi = Joi.object({
  odaId: Joi.number().integer().required(),
});

function listeSatiri(s) {
  return {
    id: s.id,
    konukId: s.konuk_id,
    ad: s.ad,
    soyad: s.soyad,
    uyruk: s.uyruk,
    kimlikTuru: s.kimlik_turu,
    tcMaskeli: s.kimlik_turu === 'tc' ? konuk.maskele(s.tc_son4) : '',
    pasaportNo: s.pasaport_no || '',
    odaId: s.oda_id,
    odaNo: s.oda_no,
    grupKodu: s.grup_kodu || '',
    girisZamani: s.giris_zamani,
    cikisZamani: s.cikis_zamani || '',
    plaka: s.plaka || '',
    durum: s.durum,
  };
}

function temelSorgu() {
  return db('konaklamalar')
    .join('konuklar', 'konuklar.id', 'konaklamalar.konuk_id')
    .join('odalar', 'odalar.id', 'konaklamalar.oda_id')
    .select(
      'konaklamalar.*',
      'konuklar.*',
      'odalar.oda_no',
      'konaklamalar.id as id',
      'konaklamalar.durum as durum'
    );
}

async function detay(id) {
  const s = await temelSorgu().where('konaklamalar.id', id).first();
  if (!s) throw new HttpHata(404, 'Konaklama bulunamadı');
  return listeSatiri(s);
}

router.get(
  '/',
  sar(async (req, res) => {
    const durum = req.query.durum || 'konakliyor';
    const q = String(req.query.q || '').trim();
    let sorgu = temelSorgu().orderBy('konaklamalar.id', 'desc').limit(300);
    if (durum !== 'hepsi') sorgu = sorgu.where('konaklamalar.durum', durum);
    if (q) {
      sorgu = sorgu.where((w) => {
        w.where('konuklar.ad', 'like', `%${q}%`)
          .orWhere('konuklar.soyad', 'like', `%${q}%`)
          .orWhere('odalar.oda_no', 'like', `${q}%`);
      });
    }
    const liste = await sorgu;
    res.json(liste.map((s) => listeSatiri(s)));
  })
);

router.get(
  '/:id',
  sar(async (req, res) => {
    res.json(await detay(Number(req.params.id)));
  })
);

router.post(
  '/',
  dogrula(girisSemasi),
  sar(async (req, res) => {
    const olusanlar = await konaklama.girisYap(req, req.body);
    const sonuc = [];
    for (const id of olusanlar) {
      sonuc.push(await detay(id));
    }
    res.status(201).json(sonuc);
  })
);

router.put(
  '/:id/cikis',
  dogrula(cikisSemasi),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    await konaklama.cikisYap(req, id, req.body);
    res.json(await detay(id));
  })
);

router.put(
  '/:id/oda',
  dogrula(odaSemasi),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    await konaklama.odaDegistir(req, id, req.body.odaId);
    res.json(await detay(id));
  })
);

module.exports = router;
