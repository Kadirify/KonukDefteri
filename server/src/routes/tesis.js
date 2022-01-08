const express = require('express');
const Joi = require('joi');
const db = require('../db/knex');
const { yetki } = require('../middleware/auth');
const { dogrula } = require('../middleware/dogrula');
const { sar } = require('../utils/async');
const { simdi } = require('../utils/tarih');
const { sifrele } = require('../services/kripto');

const router = express.Router();

const sema = Joi.object({
  ad: Joi.string().trim().max(120).allow(''),
  tesisKodu: Joi.string()
    .trim()
    .pattern(/^([0-9]{6})?$/)
    .allow(''),
  bolge: Joi.string().valid('emniyet', 'jandarma').required(),
  il: Joi.string().trim().max(40).allow(''),
  ilce: Joi.string().trim().max(40).allow(''),
  adres: Joi.string().trim().max(300).allow(''),
  telefon: Joi.string().trim().max(30).allow(''),
  kbsMod: Joi.string().valid('manuel', 'jandarma').required(),
  kbsKullanici: Joi.string().trim().max(60).allow(''),
  kbsSifre: Joi.string().max(100).allow(''),
  kbsWsdl: Joi.string().trim().max(300).allow(''),
});

function dto(t) {
  return {
    ad: t.ad || '',
    tesisKodu: t.tesis_kodu || '',
    bolge: t.bolge || 'emniyet',
    il: t.il || '',
    ilce: t.ilce || '',
    adres: t.adres || '',
    telefon: t.telefon || '',
    kbsMod: t.kbs_mod || 'manuel',
    kbsKullanici: t.kbs_kullanici || '',
    kbsSifreVar: !!t.kbs_sifre,
    kbsWsdl: t.kbs_wsdl || '',
    guncelleme: t.guncelleme || null,
  };
}

router.get(
  '/',
  sar(async (req, res) => {
    const t = (await db('tesis').first()) || {};
    res.json(dto(t));
  })
);

router.put(
  '/',
  yetki('yonetici'),
  dogrula(sema),
  sar(async (req, res) => {
    const b = req.body;
    const veri = {
      ad: b.ad || '',
      tesis_kodu: b.tesisKodu || '',
      bolge: b.bolge,
      il: b.il || '',
      ilce: b.ilce || '',
      adres: b.adres || '',
      telefon: b.telefon || '',
      kbs_mod: b.kbsMod,
      kbs_kullanici: b.kbsKullanici || '',
      kbs_wsdl: b.kbsWsdl || '',
      guncelleme: simdi(),
    };
    // Şifre alanı boş gelirse eskisi korunur
    if (b.kbsSifre) veri.kbs_sifre = sifrele(b.kbsSifre);

    const mevcut = await db('tesis').first();
    if (mevcut) {
      await db('tesis').where({ id: mevcut.id }).update(veri);
    } else {
      await db('tesis').insert(veri);
    }
    const t = await db('tesis').first();
    res.json(dto(t));
  })
);

module.exports = router;
