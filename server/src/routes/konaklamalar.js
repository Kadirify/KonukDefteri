const express = require('express');
const Joi = require('joi');
const db = require('../db/knex');
const konuk = require('../services/konuk');
const konaklama = require('../services/konaklama');
const hesap = require('../services/hesap');
const tesis = require('../services/tesis');
const gunluk = require('../services/gunluk');
const { yetki } = require('../middleware/auth');
const { dogrula } = require('../middleware/dogrula');
const { HttpHata } = require('../middleware/hata');
const { sar } = require('../utils/async');
const { gecerliZaman, simdi } = require('../utils/tarih');

const router = express.Router();

const zaman = Joi.string().custom((v, h) => (gecerliZaman(v) ? v : h.error('any.invalid')));

// Tek konuk ya da grup: konuklar dizisi; her eleman ya kayıtlı konukId ya da yeni konuk bilgisi
const girisSemasi = Joi.object({
  odaId: Joi.number().integer().required(),
  girisZamani: zaman.allow(''),
  plaka: Joi.string().trim().uppercase().max(15).allow(''),
  tur: Joi.string().valid('gece', 'gunubirlik').default('gece'),
  planlananCikis: zaman.allow(''),
  rezervasyonId: Joi.number().integer().allow(null),
  zorla: Joi.boolean().default(false),
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

const planSemasi = Joi.object({
  planlananCikis: zaman.required(),
});

async function sonBildirimler(konaklamaIdleri) {
  if (!konaklamaIdleri.length) return {};
  const satirlar = await db('kbs_bildirimler')
    .whereIn('konaklama_id', konaklamaIdleri)
    .orderBy('id');
  const harita = {};
  satirlar.forEach((b) => {
    harita[b.konaklama_id] = { id: b.id, tur: b.tur, durum: b.durum, sonHata: b.son_hata || '' };
  });
  return harita;
}

function listeSatiri(s, bildirim) {
  const an = simdi();
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
    planlananCikis: s.planlanan_cikis || '',
    gecikenCikis: s.durum === 'konakliyor' && !!s.planlanan_cikis && s.planlanan_cikis < an,
    tur: s.tur || 'gece',
    kisiSayisi: s.kisi_sayisi || 1,
    rezervasyonId: s.rezervasyon_id || null,
    plaka: s.plaka || '',
    durum: s.durum,
    bildirim: bildirim || null,
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
  const h = await hesap.hesapBul(s);
  const [bildirimler, odaGecmisi] = await Promise.all([
    db('kbs_bildirimler').where({ konaklama_id: id }).orderBy('id'),
    db('konaklama_odalari')
      .join('odalar', 'odalar.id', 'konaklama_odalari.oda_id')
      .where({ konaklama_id: id })
      .orderBy('konaklama_odalari.id')
      .select('konaklama_odalari.*', 'odalar.oda_no'),
  ]);
  return {
    ...listeSatiri(s, null),
    hesapId: h ? h.id : null,
    bildirimler: bildirimler.map((b) => ({
      id: b.id,
      tur: b.tur,
      durum: b.durum,
      mod: b.mod,
      deneme: b.deneme,
      sonHata: b.son_hata || '',
      gonderimZamani: b.gonderim_zamani || '',
      yanitRef: b.yanit_ref || '',
      olusturma: b.olusturma,
    })),
    odaGecmisi: odaGecmisi.map((o) => ({
      id: o.id,
      odaId: o.oda_id,
      odaNo: o.oda_no,
      baslangic: o.baslangic,
      bitis: o.bitis || '',
    })),
  };
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
    const harita = await sonBildirimler(liste.map((s) => s.id));
    res.json(liste.map((s) => listeSatiri(s, harita[s.id])));
  })
);

router.get(
  '/:id',
  sar(async (req, res) => {
    res.json(await detay(Number(req.params.id)));
  })
);

// Yazdırılacak kayıt formu: gruptaki herkes, kimlik numaraları açık. Görüntüleme günlüğe yazılır.
router.get(
  '/:id/form',
  yetki('yonetici', 'resepsiyon'),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    const s = await db('konaklamalar').where({ id }).first();
    if (!s) throw new HttpHata(404, 'Konaklama bulunamadı');
    let q = temelSorgu().orderBy('konaklamalar.id');
    q = s.grup_kodu
      ? q.where('konaklamalar.grup_kodu', s.grup_kodu)
      : q.where('konaklamalar.id', id);
    const uyeler = await q;
    const lider = uyeler.find((u) => u.id === id) || uyeler[0];
    const [t, ayarlar] = await Promise.all([tesis.oku(), tesis.ayarlar()]);
    await gunluk.kaydet(req, 'kayit_formu', 'konaklama:' + id, { konuk: uyeler.length });
    res.json({
      id,
      tesis: {
        ad: t.ad || '',
        adres: t.adres || '',
        il: t.il || '',
        ilce: t.ilce || '',
        telefon: t.telefon || '',
      },
      konaklama: listeSatiri(lider, null),
      konuklar: uyeler.map((u) => ({
        ...konuk.dto({ ...u, id: u.konuk_id }, true),
        konaklamaId: u.id,
      })),
      kvkkMetni: ayarlar.kvkk_metni || '',
    });
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

// Planlanan çıkışı uzat / kısalt
router.put(
  '/:id/plan',
  dogrula(planSemasi),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    const s = await db('konaklamalar').where({ id }).first();
    if (!s) throw new HttpHata(404, 'Konaklama bulunamadı');
    if (s.durum !== 'konakliyor')
      throw new HttpHata(400, 'Ayrılmış konaklamada plan değiştirilemez');
    if (req.body.planlananCikis <= s.giris_zamani)
      throw new HttpHata(400, 'Planlanan çıkış girişten sonra olmalı');
    const hedef = s.grup_kodu ? { grup_kodu: s.grup_kodu, durum: 'konakliyor' } : { id };
    await db('konaklamalar').where(hedef).update({ planlanan_cikis: req.body.planlananCikis });
    await db.transaction(async (trx) => {
      await hesap.yenidenHesapla(trx, id, req.kullanici.id);
    });
    res.json(await detay(id));
  })
);

module.exports = router;
