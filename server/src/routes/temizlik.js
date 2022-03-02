const express = require('express');
const Joi = require('joi');
const db = require('../db/knex');
const temizlik = require('../services/temizlik');
const { yetki } = require('../middleware/auth');
const { dogrula } = require('../middleware/dogrula');
const { HttpHata } = require('../middleware/hata');
const { sar } = require('../utils/async');
const { bugun } = require('../utils/tarih');

const router = express.Router();

const notSemasi = Joi.object({ notlar: Joi.string().trim().max(200).allow('') });
const yeniSemasi = Joi.object({
  odaId: Joi.number().integer().required(),
  tur: Joi.string().valid('cikis', 'gunluk', 'ekstra').default('ekstra'),
  notlar: Joi.string().trim().max(200).allow(''),
});

function dto(g) {
  return {
    id: g.id,
    odaId: g.oda_id,
    odaNo: g.oda_no,
    kat: g.kat_ad || '',
    katSira: g.kat_sira,
    tur: g.tur,
    durum: g.durum,
    olusturma: g.olusturma,
    baslama: g.baslama || '',
    bitis: g.bitis || '',
    yapan: g.yapan || '',
    kontrolEden: g.kontrol_eden || '',
    notlar: g.notlar || '',
    odaTemizlik: g.oda_temizlik,
    odaDolu: !!g.oda_dolu,
  };
}

function sorgu() {
  return db('temizlik_gorevleri')
    .join('odalar', 'odalar.id', 'temizlik_gorevleri.oda_id')
    .leftJoin('katlar', 'katlar.id', 'odalar.kat_id')
    .leftJoin('kullanicilar as y', 'y.id', 'temizlik_gorevleri.yapan_id')
    .leftJoin('kullanicilar as k', 'k.id', 'temizlik_gorevleri.kontrol_eden_id')
    .select(
      'temizlik_gorevleri.*',
      'odalar.oda_no',
      'odalar.temizlik as oda_temizlik',
      'katlar.ad as kat_ad',
      'katlar.sira as kat_sira',
      'y.ad_soyad as yapan',
      'k.ad_soyad as kontrol_eden',
      db.raw(
        '(select count(*) from konaklamalar where konaklamalar.oda_id = odalar.id and konaklamalar.durum = ?) as oda_dolu',
        ['konakliyor']
      )
    );
}

// ?durum=acik (varsayılan) | bugun | hepsi
router.get(
  '/',
  sar(async (req, res) => {
    const durum = req.query.durum || 'acik';
    let s = sorgu().orderBy([
      { column: 'katlar.sira' },
      { column: 'odalar.sira' },
      { column: 'temizlik_gorevleri.id' },
    ]);
    if (durum === 'acik') s = s.whereIn('temizlik_gorevleri.durum', temizlik.ACIK);
    else if (durum === 'bugun') s = s.where('temizlik_gorevleri.bitis', 'like', `${bugun()}%`);
    else s = s.limit(300);
    const liste = await s;
    res.json(liste.map(dto));
  })
);

router.post(
  '/',
  yetki('yonetici', 'resepsiyon'),
  dogrula(yeniSemasi),
  sar(async (req, res) => {
    const oda = await db('odalar').where({ id: req.body.odaId }).first();
    if (!oda) throw new HttpHata(404, 'Oda bulunamadı');
    let id;
    await db.transaction(async (trx) => {
      id = await temizlik.gorevAc(trx, oda.id, req.body.tur, req.body.notlar);
      if (oda.temizlik === 'temiz')
        await trx('odalar').where({ id: oda.id }).update({ temizlik: 'kirli' });
    });
    const g = await sorgu().where('temizlik_gorevleri.id', id).first();
    res.status(201).json(dto(g));
  })
);

router.post(
  '/gunluk',
  yetki('yonetici', 'resepsiyon'),
  sar(async (req, res) => {
    const acilan = await temizlik.gunlukGorevleriAc(req);
    res.json({ acilan });
  })
);

router.post(
  '/:id/basla',
  sar(async (req, res) => {
    const id = Number(req.params.id);
    await temizlik.basla(id, req);
    res.json(dto(await sorgu().where('temizlik_gorevleri.id', id).first()));
  })
);

router.post(
  '/:id/bitir',
  dogrula(notSemasi),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    await temizlik.bitir(id, req, req.body.notlar);
    res.json(dto(await sorgu().where('temizlik_gorevleri.id', id).first()));
  })
);

router.post(
  '/:id/kontrol',
  yetki('yonetici', 'resepsiyon'),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    await temizlik.kontrolEt(id, req);
    res.json(dto(await sorgu().where('temizlik_gorevleri.id', id).first()));
  })
);

module.exports = router;
