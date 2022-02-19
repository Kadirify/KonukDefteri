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
const { simdi, gecerliZaman } = require('../utils/tarih');
const gunluk = require('../services/gunluk');
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
    gunluk.kaydet(req, 'tc_goruntule', 'bildirim:' + id);
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
    gunluk.kaydet(req, 'bildirim_tekrar', 'bildirim:' + id);
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
    gunluk.kaydet(req, 'bildirim_manuel', 'bildirim:' + id, { referans: req.body.referans || '' });
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
      gunluk.kaydet(req, 'kbs_test', 'tesis', { tamam: sonuc.tamam });
      res.json(sonuc);
    } catch (e) {
      res.json({ tamam: false, mesaj: e.message });
    }
  })
);

// Kesinti tutanakları
const zaman = Joi.string().custom((v, h) => (gecerliZaman(v) ? v : h.error('any.invalid')));
const kesintiSemasi = Joi.object({
  baslangic: zaman.required(),
  bitis: zaman.required(),
  neden: Joi.string().trim().max(300).allow(''),
});

function kesintiDto(k) {
  return {
    id: k.id,
    tutanakNo: k.tutanak_no,
    baslangic: k.baslangic,
    bitis: k.bitis,
    neden: k.neden || '',
    olusturma: k.olusturma,
    olusturanAd: k.olusturan_ad || '',
  };
}

router.get(
  '/kesintiler',
  sar(async (req, res) => {
    const liste = await db('kesintiler')
      .leftJoin('kullanicilar', 'kullanicilar.id', 'kesintiler.olusturan')
      .select('kesintiler.*', 'kullanicilar.ad_soyad as olusturan_ad')
      .orderBy('kesintiler.id', 'desc');
    res.json(liste.map(kesintiDto));
  })
);

router.post(
  '/kesintiler',
  dogrula(kesintiSemasi),
  sar(async (req, res) => {
    const b = req.body;
    if (b.bitis < b.baslangic)
      throw new HttpHata(400, 'Bitiş başlangıçtan önce olamaz', { bitis: 'Başlangıçtan önce' });
    const yil = b.baslangic.slice(0, 4);
    const sayi = await db('kesintiler')
      .where('tutanak_no', 'like', `KT-${yil}-%`)
      .count('id as n')
      .first();
    const tutanakNo = `KT-${yil}-${String(Number(sayi.n) + 1).padStart(3, '0')}`;
    const [id] = await db('kesintiler').insert({
      tutanak_no: tutanakNo,
      baslangic: b.baslangic,
      bitis: b.bitis,
      neden: b.neden || '',
      olusturan: req.kullanici.id,
    });
    gunluk.kaydet(req, 'kesinti_tutanagi', 'kesinti:' + id, { tutanakNo });
    const k = await db('kesintiler')
      .leftJoin('kullanicilar', 'kullanicilar.id', 'kesintiler.olusturan')
      .select('kesintiler.*', 'kullanicilar.ad_soyad as olusturan_ad')
      .where('kesintiler.id', id)
      .first();
    res.status(201).json(kesintiDto(k));
  })
);

router.get(
  '/kesintiler/:id',
  sar(async (req, res) => {
    const id = Number(req.params.id);
    const k = await db('kesintiler')
      .leftJoin('kullanicilar', 'kullanicilar.id', 'kesintiler.olusturan')
      .select('kesintiler.*', 'kullanicilar.ad_soyad as olusturan_ad')
      .where('kesintiler.id', id)
      .first();
    if (!k) throw new HttpHata(404, 'Tutanak bulunamadı');
    // Kesinti aralığında olup zamanında gönderilemeyen bildirimler
    const liste = await bildirimSorgusu()
      .where((w) => {
        w.whereBetween('konaklamalar.giris_zamani', [k.baslangic, k.bitis]).orWhereBetween(
          'konaklamalar.cikis_zamani',
          [k.baslangic, k.bitis]
        );
      })
      .where((w) => {
        w.whereNot('kbs_bildirimler.durum', 'gonderildi').orWhere(
          'kbs_bildirimler.gonderim_zamani',
          '>',
          k.bitis
        );
      })
      .orderBy('kbs_bildirimler.id');
    const t = await tesis.oku();
    res.json({
      ...kesintiDto(k),
      tesis: {
        ad: t.ad || '',
        tesisKodu: t.tesis_kodu || '',
        bolge: t.bolge || '',
        il: t.il || '',
        ilce: t.ilce || '',
      },
      bildirimler: liste.map(bildirimDto),
    });
  })
);

module.exports = router;
