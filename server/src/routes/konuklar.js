const express = require('express');
const db = require('../db/knex');
const konuk = require('../services/konuk');
const { dogrula } = require('../middleware/dogrula');
const { HttpHata } = require('../middleware/hata');
const { sar } = require('../utils/async');
const gunluk = require('../services/gunluk');

const router = express.Router();

router.get(
  '/',
  sar(async (req, res) => {
    const q = String(req.query.q || '').trim();
    let sorgu = db('konuklar')
      .orderBy([{ column: 'soyad' }, { column: 'ad' }])
      .limit(100);
    if (q) {
      if (/^\d{4}$/.test(q)) {
        sorgu = sorgu.where({ tc_son4: q });
      } else if (/^[A-Za-z0-9]{5,}$/.test(q) && /\d/.test(q)) {
        sorgu = sorgu.where('pasaport_no', 'like', `%${q.toUpperCase()}%`);
      } else {
        q.split(/\s+/).forEach((kelime) => {
          sorgu = sorgu.where((w) => {
            w.where('ad', 'like', `%${kelime}%`).orWhere('soyad', 'like', `%${kelime}%`);
          });
        });
      }
    }
    const liste = await sorgu;
    res.json(liste.map((k) => konuk.dto(k, false)));
  })
);

router.get(
  '/:id',
  sar(async (req, res) => {
    const id = Number(req.params.id);
    const k = await db('konuklar').where({ id }).first();
    if (!k) throw new HttpHata(404, 'Konuk bulunamadı');
    const konaklamalar = await db('konaklamalar')
      .join('odalar', 'odalar.id', 'konaklamalar.oda_id')
      .where('konaklamalar.konuk_id', id)
      .orderBy('konaklamalar.id', 'desc')
      .select(
        'konaklamalar.id',
        'konaklamalar.giris_zamani as girisZamani',
        'konaklamalar.cikis_zamani as cikisZamani',
        'konaklamalar.durum',
        'odalar.oda_no as odaNo'
      );
    const tamTc = req.kullanici.rol === 'yonetici';
    if (tamTc && k.tc_sifreli) gunluk.kaydet(req, 'tc_goruntule', 'konuk:' + id);
    res.json({ ...konuk.dto(k, tamTc), konaklamalar });
  })
);

router.post(
  '/',
  dogrula(konuk.yeniSema),
  sar(async (req, res) => {
    const mevcut = await konuk.ayniKimlik(req.body);
    if (mevcut) {
      throw new HttpHata(409, 'Bu kimlikle kayıtlı bir konuk zaten var', { konukId: mevcut.id });
    }
    const id = await konuk.olustur(req.body);
    gunluk.kaydet(req, 'konuk_ekle', 'konuk:' + id);
    const k = await db('konuklar').where({ id }).first();
    res.status(201).json(konuk.dto(k, false));
  })
);

router.put(
  '/:id',
  dogrula(konuk.duzenleSema),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    const k = await db('konuklar').where({ id }).first();
    if (!k) throw new HttpHata(404, 'Konuk bulunamadı');
    const mevcut = await konuk.ayniKimlik(req.body, id);
    if (mevcut) {
      throw new HttpHata(409, 'Bu kimlik başka bir konukta kayıtlı', { konukId: mevcut.id });
    }
    await konuk.guncelle(id, req.body);
    gunluk.kaydet(req, 'konuk_duzenle', 'konuk:' + id);
    res.json(konuk.dto(await db('konuklar').where({ id }).first(), false));
  })
);

module.exports = router;
