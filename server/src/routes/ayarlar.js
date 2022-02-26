const express = require('express');
const Joi = require('joi');
const db = require('../db/knex');
const { yetki } = require('../middleware/auth');
const { dogrula } = require('../middleware/dogrula');
const { sar } = require('../utils/async');
const gunluk = require('../services/gunluk');
const tesis = require('../services/tesis');

const router = express.Router();

// Serbest anahtar/değer değil; bilinen ayarlar dışında bir şey kaydedilmez.
const saat = Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/);
const acikKapali = Joi.string().valid('0', '1');

const sema = Joi.object({
  kuyruk_dakika: Joi.number().integer().min(1).max(60),
  saklama_yil: Joi.number().integer().min(1).max(10),
  tema: Joi.string().valid('sistem', 'acik', 'koyu'),
  giris_saati: saat,
  cikis_saati: saat,
  cikista_temizlik: acikKapali,
  temizlik_kontrolu: acikKapali,
  gunubirlik_izinli: acikKapali,
  gunubirlik_saat: Joi.number().integer().min(1).max(24),
});

router.get(
  '/',
  sar(async (req, res) => {
    res.json(await tesis.ayarlar());
  })
);

router.put(
  '/',
  yetki('yonetici'),
  dogrula(sema),
  sar(async (req, res) => {
    for (const anahtar of Object.keys(req.body)) {
      const deger = String(req.body[anahtar]);
      const mevcut = await db('ayarlar').where({ anahtar }).first();
      if (mevcut) await db('ayarlar').where({ anahtar }).update({ deger });
      else await db('ayarlar').insert({ anahtar, deger });
    }
    gunluk.kaydet(req, 'ayar_guncelle', 'ayarlar', req.body);
    res.json(await tesis.ayarlar());
  })
);

module.exports = router;
