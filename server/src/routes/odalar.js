const express = require('express');
const Joi = require('joi');
const db = require('../db/knex');
const oda = require('../services/oda');
const temizlik = require('../services/temizlik');
const { yetki } = require('../middleware/auth');
const { dogrula } = require('../middleware/dogrula');
const { HttpHata } = require('../middleware/hata');
const { sar } = require('../utils/async');
const { bugun, gunEkle } = require('../utils/tarih');
const gunluk = require('../services/gunluk');

const router = express.Router();

const sema = Joi.object({
  odaNo: Joi.string().trim().min(1).max(10).required(),
  tip: Joi.string().trim().max(40).allow(''),
  kapasite: Joi.number().integer().min(1).max(20).required(),
  katId: Joi.number().integer().required(),
  sira: Joi.number().integer().min(0).max(999),
  tur: Joi.string().valid('oda', 'ortak').default('oda'),
  ozellikler: Joi.string().trim().max(200).allow(''),
  kullanim: Joi.string().valid('kullanimda', 'kapali'),
  notlar: Joi.string().trim().max(200).allow(''),
});

const temizlikSemasi = Joi.object({
  durum: Joi.string().valid('temiz', 'kirli', 'temizleniyor').required(),
  notlar: Joi.string().trim().max(200).allow(''),
});

const bakimSemasi = Joi.object({
  bakimda: Joi.boolean().required(),
  notlar: Joi.string().trim().max(200).allow(''),
  bitis: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .allow(''),
});

const siraSemasi = Joi.object({
  katId: Joi.number().integer().required(),
  idler: Joi.array().items(Joi.number().integer()).min(1).required(),
});

function gizliMi(req) {
  return req.kullanici.rol === 'kat_gorevlisi';
}

router.get(
  '/',
  sar(async (req, res) => {
    res.json(await oda.hepsi(gizliMi(req)));
  })
);

router.get(
  '/:id/gecmis',
  sar(async (req, res) => {
    const id = Number(req.params.id);
    const o = await db('odalar').where({ id }).first();
    if (!o) throw new HttpHata(404, 'Oda bulunamadı');
    const gun = Math.min(Number(req.query.gun) || 30, 365);
    const baslangic = gunEkle(bugun() + ' 00:00', -gun);
    const gizli = gizliMi(req);
    const [segmentler, gorevler, olaylar] = await Promise.all([
      db('konaklama_odalari')
        .join('konaklamalar', 'konaklamalar.id', 'konaklama_odalari.konaklama_id')
        .join('konuklar', 'konuklar.id', 'konaklamalar.konuk_id')
        .where('konaklama_odalari.oda_id', id)
        .where((w) => {
          w.whereNull('konaklama_odalari.bitis').orWhere(
            'konaklama_odalari.bitis',
            '>=',
            baslangic
          );
        })
        .orderBy('konaklama_odalari.baslangic', 'desc')
        .select(
          'konaklama_odalari.id',
          'konaklama_odalari.baslangic',
          'konaklama_odalari.bitis',
          'konaklamalar.id as konaklamaId',
          'konaklamalar.tur',
          'konaklamalar.grup_kodu as grupKodu',
          'konuklar.ad',
          'konuklar.soyad'
        ),
      db('temizlik_gorevleri')
        .leftJoin('kullanicilar', 'kullanicilar.id', 'temizlik_gorevleri.yapan_id')
        .where('temizlik_gorevleri.oda_id', id)
        .where('temizlik_gorevleri.olusturma', '>=', baslangic)
        .orderBy('temizlik_gorevleri.id', 'desc')
        .select('temizlik_gorevleri.*', 'kullanicilar.ad_soyad as yapan'),
      db('oda_olaylari')
        .leftJoin('kullanicilar', 'kullanicilar.id', 'oda_olaylari.kullanici_id')
        .where('oda_olaylari.oda_id', id)
        .where('oda_olaylari.zaman', '>=', baslangic)
        .orderBy('oda_olaylari.id', 'desc')
        .select('oda_olaylari.*', 'kullanicilar.ad_soyad as kullanici'),
    ]);
    res.json({
      odaId: id,
      baslangic,
      konaklamalar: segmentler.map((s) => ({
        id: s.id,
        konaklamaId: s.konaklamaId,
        konuk: gizli ? '' : `${s.ad} ${s.soyad}`,
        tur: s.tur,
        grupKodu: s.grupKodu || '',
        baslangic: s.baslangic,
        bitis: s.bitis || '',
      })),
      temizlikler: gorevler.map((g) => ({
        id: g.id,
        tur: g.tur,
        durum: g.durum,
        olusturma: g.olusturma,
        baslama: g.baslama || '',
        bitis: g.bitis || '',
        yapan: g.yapan || '',
        notlar: g.notlar || '',
      })),
      olaylar: olaylar.map((o) => ({
        id: o.id,
        tur: o.tur,
        zaman: o.zaman,
        kullanici: o.kullanici || '',
        notlar: o.notlar || '',
      })),
    });
  })
);

async function odaKaydet(b) {
  return {
    oda_no: b.odaNo,
    tip: b.tip || '',
    kapasite: b.kapasite,
    kat_id: b.katId,
    tur: b.tur || 'oda',
    ozellikler: b.ozellikler || '',
    notlar: b.notlar || '',
  };
}

router.post(
  '/',
  yetki('yonetici'),
  dogrula(sema),
  sar(async (req, res) => {
    const b = req.body;
    const var_ = await db('odalar').where({ oda_no: b.odaNo }).first();
    if (var_) throw new HttpHata(409, 'Bu oda numarası zaten var', { odaNo: 'Kullanılıyor' });
    const kat = await db('katlar').where({ id: b.katId }).first();
    if (!kat) throw new HttpHata(400, 'Kat bulunamadı', { katId: 'Geçersiz kat' });
    const enSon = await db('odalar').where({ kat_id: b.katId }).max('sira as s').first();
    const veri = await odaKaydet(b);
    veri.sira = b.sira !== undefined ? b.sira : Number((enSon && enSon.s) || 0) + 1;
    veri.kullanim = b.kullanim || 'kullanimda';
    veri.aktif = veri.kullanim === 'kullanimda';
    veri.kat = kat.ad;
    const [id] = await db('odalar').insert(veri);
    gunluk.kaydet(req, 'oda_ekle', 'oda:' + id, { odaNo: b.odaNo });
    res.status(201).json(await oda.oku(id));
  })
);

router.put(
  '/sira',
  yetki('yonetici'),
  dogrula(siraSemasi),
  sar(async (req, res) => {
    await db.transaction(async (trx) => {
      for (let i = 0; i < req.body.idler.length; i++) {
        await trx('odalar')
          .where({ id: req.body.idler[i] })
          .update({ sira: i + 1, kat_id: req.body.katId });
      }
    });
    res.json(await oda.hepsi(false));
  })
);

router.put(
  '/:id',
  yetki('yonetici'),
  dogrula(sema),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    const o = await db('odalar').where({ id }).first();
    if (!o) throw new HttpHata(404, 'Oda bulunamadı');
    const b = req.body;
    const cakisan = await db('odalar').where({ oda_no: b.odaNo }).whereNot({ id }).first();
    if (cakisan) throw new HttpHata(409, 'Bu oda numarası zaten var', { odaNo: 'Kullanılıyor' });
    const kat = await db('katlar').where({ id: b.katId }).first();
    if (!kat) throw new HttpHata(400, 'Kat bulunamadı', { katId: 'Geçersiz kat' });
    const veri = await odaKaydet(b);
    if (b.sira !== undefined) veri.sira = b.sira;
    veri.kat = kat.ad;
    if (b.kullanim && b.kullanim !== o.kullanim && o.kullanim !== 'bakimda') {
      const dolu = await db('konaklamalar').where({ oda_id: id, durum: 'konakliyor' }).first();
      if (dolu && b.kullanim === 'kapali')
        throw new HttpHata(400, 'İçinde konuk varken oda kapatılamaz');
      veri.kullanim = b.kullanim;
      veri.aktif = b.kullanim === 'kullanimda';
      await oda.olayKaydet(
        db,
        id,
        b.kullanim === 'kapali' ? 'kapatildi' : 'acildi',
        req.kullanici.id,
        ''
      );
    }
    await db('odalar').where({ id }).update(veri);
    gunluk.kaydet(req, 'oda_duzenle', 'oda:' + id, { odaNo: b.odaNo });
    res.json(await oda.oku(id));
  })
);

// Oda panelinden temizlik durumu (kat görevlisi de yapabilir)
router.put(
  '/:id/temizlik',
  dogrula(temizlikSemasi),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    await temizlik.odaDurumAyarla(id, req.body.durum, req, req.body.notlar);
    res.json(await oda.oku(id, gizliMi(req)));
  })
);

router.put(
  '/:id/bakim',
  yetki('yonetici', 'resepsiyon'),
  dogrula(bakimSemasi),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    const o = await db('odalar').where({ id }).first();
    if (!o) throw new HttpHata(404, 'Oda bulunamadı');
    if (req.body.bakimda) {
      const dolu = await db('konaklamalar').where({ oda_id: id, durum: 'konakliyor' }).first();
      if (dolu) throw new HttpHata(400, 'İçinde konuk varken oda bakıma alınamaz');
      await db.transaction(async (trx) => {
        await trx('odalar')
          .where({ id })
          .update({
            kullanim: 'bakimda',
            aktif: false,
            bakim_notu: req.body.notlar || '',
            bakim_bitis: req.body.bitis || null,
          });
        await oda.olayKaydet(trx, id, 'bakim_basladi', req.kullanici.id, req.body.notlar || '');
      });
    } else {
      if (o.kullanim !== 'bakimda') throw new HttpHata(400, 'Oda bakımda değil');
      await db.transaction(async (trx) => {
        await trx('odalar')
          .where({ id })
          .update({ kullanim: 'kullanimda', aktif: true, bakim_notu: '', bakim_bitis: null });
        await oda.olayKaydet(trx, id, 'bakim_bitti', req.kullanici.id, req.body.notlar || '');
        // bakımdan çıkan oda temizlenmeden açılmaz
        await temizlik.odaKirliYap(trx, id, req, 'ekstra');
      });
    }
    gunluk.kaydet(req, req.body.bakimda ? 'oda_bakima_al' : 'oda_bakimdan_cikar', 'oda:' + id, {
      not: req.body.notlar || '',
    });
    res.json(await oda.oku(id));
  })
);

module.exports = router;
