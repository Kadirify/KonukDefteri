const express = require('express');
const Joi = require('joi');
const yedek = require('../services/yedek');
const gunluk = require('../services/gunluk');
const { yetki } = require('../middleware/auth');
const { dogrula } = require('../middleware/dogrula');
const { sar } = require('../utils/async');

const router = express.Router();
router.use(yetki('yonetici'));

router.get(
  '/',
  sar(async (req, res) => {
    res.json(await yedek.liste());
  })
);

router.post(
  '/',
  sar(async (req, res) => {
    const d = await yedek.al('manuel');
    gunluk.kaydet(req, 'yedek_al', d.ad);
    res.status(201).json(d);
  })
);

router.get(
  '/:ad/indir',
  sar(async (req, res) => {
    const yol = await yedek.dosyaYolu(req.params.ad);
    gunluk.kaydet(req, 'yedek_indir', req.params.ad);
    res.download(yol, req.params.ad);
  })
);

router.post(
  '/:ad/geri-yukle',
  dogrula(Joi.object({ onay: Joi.boolean().valid(true).required() })),
  sar(async (req, res) => {
    await yedek.geriYukle(req.params.ad);
    await gunluk.kaydet(req, 'yedek_geri_yukle', req.params.ad);
    res.json({ tamam: true });
  })
);

router.delete(
  '/:ad',
  sar(async (req, res) => {
    await yedek.sil(req.params.ad);
    gunluk.kaydet(req, 'yedek_sil', req.params.ad);
    res.json({ tamam: true });
  })
);

module.exports = router;
