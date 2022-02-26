const express = require('express');
const Joi = require('joi');
const db = require('../db/knex');
const { yetki } = require('../middleware/auth');
const { dogrula } = require('../middleware/dogrula');
const { HttpHata } = require('../middleware/hata');
const { sar } = require('../utils/async');
const gunluk = require('../services/gunluk');

const router = express.Router();

const sema = Joi.object({
  ad: Joi.string().trim().min(1).max(40).required(),
  koridor: Joi.string().valid('orta', 'yok').default('orta'),
  aktif: Joi.boolean().default(true),
});

const siraSemasi = Joi.object({
  idler: Joi.array().items(Joi.number().integer()).min(1).required(),
});

function dto(k) {
  return {
    id: k.id,
    ad: k.ad,
    sira: k.sira,
    koridor: k.koridor || 'orta',
    aktif: !!k.aktif,
    odaSayisi: Number(k.oda_sayisi || 0),
  };
}

async function liste() {
  const satirlar = await db('katlar')
    .leftJoin('odalar', 'odalar.kat_id', 'katlar.id')
    .groupBy('katlar.id')
    .select('katlar.*')
    .count('odalar.id as oda_sayisi')
    .orderBy('katlar.sira');
  return satirlar.map(dto);
}

router.get(
  '/',
  sar(async (req, res) => {
    res.json(await liste());
  })
);

router.post(
  '/',
  yetki('yonetici'),
  dogrula(sema),
  sar(async (req, res) => {
    const enUst = await db('katlar').min('sira as s').first();
    const sira = enUst && enUst.s !== null ? Number(enUst.s) - 1 : 0; // yeni kat en üste
    const [id] = await db('katlar').insert({
      ad: req.body.ad,
      koridor: req.body.koridor,
      aktif: req.body.aktif,
      sira,
    });
    gunluk.kaydet(req, 'kat_ekle', 'kat:' + id, { ad: req.body.ad });
    res.status(201).json((await liste()).find((k) => k.id === id));
  })
);

// Sıralama: dizideki sıra yukarıdan aşağıya
router.put(
  '/sira',
  yetki('yonetici'),
  dogrula(siraSemasi),
  sar(async (req, res) => {
    await db.transaction(async (trx) => {
      for (let i = 0; i < req.body.idler.length; i++) {
        await trx('katlar').where({ id: req.body.idler[i] }).update({ sira: i });
      }
    });
    res.json(await liste());
  })
);

router.put(
  '/:id',
  yetki('yonetici'),
  dogrula(sema),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    const k = await db('katlar').where({ id }).first();
    if (!k) throw new HttpHata(404, 'Kat bulunamadı');
    await db('katlar')
      .where({ id })
      .update({ ad: req.body.ad, koridor: req.body.koridor, aktif: req.body.aktif });
    gunluk.kaydet(req, 'kat_duzenle', 'kat:' + id, { ad: req.body.ad });
    res.json((await liste()).find((x) => x.id === id));
  })
);

router.delete(
  '/:id',
  yetki('yonetici'),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    const oda = await db('odalar').where({ kat_id: id }).first();
    if (oda)
      throw new HttpHata(400, 'Katta oda varken kat silinemez; önce odaları başka kata taşıyın');
    await db('katlar').where({ id }).delete();
    gunluk.kaydet(req, 'kat_sil', 'kat:' + id);
    res.json({ tamam: true });
  })
);

module.exports = router;
