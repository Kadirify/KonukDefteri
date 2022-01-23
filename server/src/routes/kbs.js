const express = require('express');
const Joi = require('joi');
const db = require('../db/knex');
const tesis = require('../services/tesis');
const kbs = require('../services/kbs');
const kuyruk = require('../services/kbs/kuyruk');
const { bildirimAlanlari } = require('../services/kbs/alanlar');
const { dogrula } = require('../middleware/dogrula');
const { HttpHata } = require('../middleware/hata');
const { sar } = require('../utils/async');
const { simdi } = require('../utils/tarih');
const konukServis = require('../services/konuk');

const router = express.Router();

function bildirimDto(b) {
  return {
    id: b.id,
    konaklamaId: b.konaklama_id,
    tur: b.tur,
    durum: b.durum,
    mod: b.mod,
    deneme: b.deneme,
    sonHata: b.son_hata || '',
    gonderimZamani: b.gonderim_zamani || '',
    yanitRef: b.yanit_ref || '',
    olusturma: b.olusturma,
    ad: b.ad,
    soyad: b.soyad,
    kimlikTuru: b.kimlik_turu,
    tcMaskeli: b.kimlik_turu === 'tc' ? konukServis.maskele(b.tc_son4) : '',
    pasaportNo: b.pasaport_no || '',
    uyruk: b.uyruk,
    odaNo: b.oda_no,
    girisZamani: b.giris_zamani,
    cikisZamani: b.cikis_zamani || '',
  };
}

function bildirimSorgusu() {
  return db('kbs_bildirimler')
    .join('konaklamalar', 'konaklamalar.id', 'kbs_bildirimler.konaklama_id')
    .join('konuklar', 'konuklar.id', 'konaklamalar.konuk_id')
    .join('odalar', 'odalar.id', 'konaklamalar.oda_id')
    .select(
      'kbs_bildirimler.*',
      'konuklar.ad',
      'konuklar.soyad',
      'konuklar.kimlik_turu',
      'konuklar.tc_son4',
      'konuklar.pasaport_no',
      'konuklar.uyruk',
      'odalar.oda_no',
      'konaklamalar.giris_zamani',
      'konaklamalar.cikis_zamani'
    );
}

router.get(
  '/durum',
  sar(async (req, res) => {
    const t = await tesis.oku();
    const sayilar = await db('kbs_bildirimler').select('durum').count('id as n').groupBy('durum');
    const say = {};
    sayilar.forEach((s) => {
      say[s.durum] = Number(s.n);
    });
    const son = await db('kbs_bildirimler')
      .where({ durum: 'gonderildi' })
      .orderBy('id', 'desc')
      .first();
    res.json({
      mod: t.kbs_mod || 'manuel',
      bolge: t.bolge || 'emniyet',
      tesisKodu: t.tesis_kodu || '',
      wsdlVar: !!(t.kbs_wsdl || process.env.KBS_JANDARMA_WSDL),
      bekleyen: (say.bekliyor || 0) + (say.manuel || 0),
      hatali: say.hata || 0,
      gonderilen: say.gonderildi || 0,
      sonGonderim: son ? son.gonderim_zamani : null,
      enFazlaDeneme: kuyruk.EN_FAZLA_DENEME,
    });
  })
);

router.get(
  '/bildirimler',
  sar(async (req, res) => {
    const durum = req.query.durum || 'bekleyen';
    let sorgu = bildirimSorgusu().orderBy('kbs_bildirimler.id', 'desc').limit(300);
    if (durum === 'bekleyen')
      sorgu = sorgu.whereIn('kbs_bildirimler.durum', ['bekliyor', 'manuel']);
    else if (durum !== 'hepsi') sorgu = sorgu.where('kbs_bildirimler.durum', durum);
    const liste = await sorgu;
    res.json(liste.map(bildirimDto));
  })
);

router.get(
  '/bildirimler/:id/alanlar',
  sar(async (req, res) => {
    const id = Number(req.params.id);
    const alanlar = await bildirimAlanlari(id);
    res.json(alanlar);
  })
);

router.post(
  '/bildirimler/:id/gonder',
  sar(async (req, res) => {
    const id = Number(req.params.id);
    const b = await db('kbs_bildirimler').where({ id }).first();
    if (!b) throw new HttpHata(404, 'Bildirim bulunamadı');
    if (b.durum === 'gonderildi') throw new HttpHata(400, 'Bu bildirim zaten gönderilmiş');
    let sonuc;
    try {
      sonuc = await kuyruk.isle(id);
    } catch (e) {
      throw new HttpHata(400, e.message);
    }
    if (sonuc.atlandi) throw new HttpHata(409, 'Kuyruk şu anda çalışıyor, birazdan tekrar deneyin');
    const guncel = await bildirimSorgusu().where('kbs_bildirimler.id', id).first();
    res.json(bildirimDto(guncel));
  })
);

const manuelSemasi = Joi.object({
  referans: Joi.string().trim().max(60).allow(''),
});

router.post(
  '/bildirimler/:id/manuel-tamam',
  dogrula(manuelSemasi),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    const b = await db('kbs_bildirimler').where({ id }).first();
    if (!b) throw new HttpHata(404, 'Bildirim bulunamadı');
    if (b.durum === 'gonderildi') throw new HttpHata(400, 'Bu bildirim zaten gönderilmiş');
    await db('kbs_bildirimler')
      .where({ id })
      .update({
        durum: 'gonderildi',
        mod: 'manuel',
        gonderim_zamani: simdi(),
        yanit_ref: req.body.referans || '',
        son_hata: null,
      });
    const guncel = await bildirimSorgusu().where('kbs_bildirimler.id', id).first();
    res.json(bildirimDto(guncel));
  })
);

router.post(
  '/test',
  sar(async (req, res) => {
    const baglanti = await tesis.kbsBaglantisi();
    const s = kbs.surucu(baglanti.mod);
    try {
      const sonuc = await s.test(baglanti);
      res.json(sonuc);
    } catch (e) {
      res.json({ tamam: false, mesaj: e.message });
    }
  })
);

module.exports = router;
