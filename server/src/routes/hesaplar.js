const express = require('express');
const Joi = require('joi');
const hesap = require('../services/hesap');
const tesis = require('../services/tesis');
const { yetki } = require('../middleware/auth');
const { dogrula } = require('../middleware/dogrula');
const { sar } = require('../utils/async');
const { gecerliZaman } = require('../utils/tarih');

const router = express.Router();
router.use(yetki('yonetici', 'resepsiyon'));

const zaman = Joi.string().custom((v, h) => (gecerliZaman(v) ? v : h.error('any.invalid')));

const kalemSemasi = Joi.object({
  tur: Joi.string().valid('ekstra', 'indirim').default('ekstra'),
  aciklama: Joi.string().trim().min(1).max(120).required(),
  adet: Joi.number().min(0.01).max(9999).default(1),
  birimFiyat: Joi.number().min(0).max(9999999).required(),
  tarih: zaman.allow(''),
});

const duzeltSemasi = Joi.object({
  aciklama: Joi.string().trim().min(1).max(120).required(),
  adet: Joi.number().min(0.01).max(9999).required(),
  birimFiyat: Joi.number().min(0).max(9999999).required(),
});

const tahsilatSemasi = Joi.object({
  tutar: Joi.number().greater(0).max(9999999).required(),
  yontem: Joi.string()
    .valid(...hesap.YONTEMLER)
    .default('nakit'),
  tarih: zaman.allow(''),
  notlar: Joi.string().trim().max(200).allow(''),
});

// Konaklamanın hesabı; eski kayıtlarda yoksa açılır
router.get(
  '/konaklama/:konaklamaId',
  sar(async (req, res) => {
    const h = await hesap.hesapGetirYaDaAc(Number(req.params.konaklamaId), req.kullanici.id);
    res.json(await hesap.ozet(h.id));
  })
);

router.get(
  '/:id',
  sar(async (req, res) => {
    res.json(await hesap.ozet(Number(req.params.id)));
  })
);

// Fiş için: hesap + tesis bilgisi
router.get(
  '/:id/fis',
  sar(async (req, res) => {
    const o = await hesap.ozet(Number(req.params.id));
    const t = await tesis.oku();
    res.json({
      ...o,
      tesis: {
        ad: t.ad || '',
        adres: t.adres || '',
        telefon: t.telefon || '',
        il: t.il || '',
        ilce: t.ilce || '',
      },
    });
  })
);

router.post(
  '/:id/kalemler',
  dogrula(kalemSemasi),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    await hesap.kalemEkle(id, req.body, req);
    res.status(201).json(await hesap.ozet(id));
  })
);

router.put(
  '/:id/kalemler/:kalemId',
  dogrula(duzeltSemasi),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    await hesap.kalemDuzelt(id, Number(req.params.kalemId), req.body, req);
    res.json(await hesap.ozet(id));
  })
);

router.delete(
  '/:id/kalemler/:kalemId',
  sar(async (req, res) => {
    const id = Number(req.params.id);
    await hesap.kalemSil(id, Number(req.params.kalemId), req);
    res.json(await hesap.ozet(id));
  })
);

router.post(
  '/:id/tahsilatlar',
  dogrula(tahsilatSemasi),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    await hesap.tahsilatEkle(id, req.body, req);
    res.status(201).json(await hesap.ozet(id));
  })
);

router.delete(
  '/:id/tahsilatlar/:tahsilatId',
  yetki('yonetici'),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    await hesap.tahsilatSil(id, Number(req.params.tahsilatId), req);
    res.json(await hesap.ozet(id));
  })
);

router.post(
  '/:id/kapat',
  sar(async (req, res) => {
    const id = Number(req.params.id);
    const bakiye = await hesap.kapat(id, req);
    res.json({ ...(await hesap.ozet(id)), kapanisBakiyesi: bakiye });
  })
);

router.post(
  '/:id/ac',
  yetki('yonetici'),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    await hesap.ac(id, req);
    res.json(await hesap.ozet(id));
  })
);

module.exports = router;
