const express = require('express');
const db = require('../db/knex');
const tesis = require('../services/tesis');
const { sar } = require('../utils/async');
const { bugun } = require('../utils/tarih');

const router = express.Router();

router.get(
  '/',
  sar(async (req, res) => {
    const gun = bugun();
    const [giris, cikis, konaklayan, odaToplam, odaDolu, t] = await Promise.all([
      db('konaklamalar').where('giris_zamani', 'like', `${gun}%`).count('id as n').first(),
      db('konaklamalar').where('cikis_zamani', 'like', `${gun}%`).count('id as n').first(),
      db('konaklamalar').where({ durum: 'konakliyor' }).count('id as n').first(),
      db('odalar').where({ aktif: true }).count('id as n').first(),
      db('konaklamalar').where({ durum: 'konakliyor' }).countDistinct('oda_id as n').first(),
      tesis.oku(),
    ]);
    res.json({
      tarih: gun,
      tesisAdi: t.ad || '',
      bugunGiris: Number(giris.n),
      bugunCikis: Number(cikis.n),
      konaklayan: Number(konaklayan.n),
      odaToplam: Number(odaToplam.n),
      odaDolu: Number(odaDolu.n),
    });
  })
);

module.exports = router;
