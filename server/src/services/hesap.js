const db = require('../db/knex');
const { HttpHata } = require('../middleware/hata');
const { simdi, tarihten } = require('../utils/tarih');
const gunluk = require('./gunluk');

const YONTEMLER = ['nakit', 'kart', 'havale', 'diger'];

const para = (n) => Math.round(Number(n || 0) * 100) / 100;

// Gece sayısı: tarih kısımlarının farkı, en az 1 (14:00 giriş, ertesi gün 11:00 çıkış = 1 gece)
function geceSayisi(giris, cikis) {
  const a = tarihten(giris.slice(0, 10) + ' 00:00');
  const b = tarihten(cikis.slice(0, 10) + ' 00:00');
  return Math.max(1, Math.round((b - a) / 86400000));
}

async function hesapBul(konaklama, trx = db) {
  let h = await trx('hesaplar').where({ konaklama_id: konaklama.id }).first();
  if (!h && konaklama.grup_kodu)
    h = await trx('hesaplar').where({ grup_kodu: konaklama.grup_kodu }).first();
  return h || null;
}

// Otomatik konaklama kalemi: gece x gecelik fiyat ya da günübirlik fiyat.
// Kullanıcı kalemi elle değiştirmişse (otomatik=false) dokunulmaz.
async function konaklamaKalemi(trx, hesapId, konaklama, oda, kullaniciId) {
  const bitis = konaklama.cikis_zamani || konaklama.planlanan_cikis || konaklama.giris_zamani;
  let adet;
  let birim;
  let aciklama;
  if (konaklama.tur === 'gunubirlik') {
    adet = 1;
    birim = para(Number(oda.gunubirlik_fiyat) || oda.gecelik_fiyat);
    aciklama = `Oda ${oda.oda_no} günübirlik`;
  } else {
    adet = geceSayisi(konaklama.giris_zamani, bitis);
    birim = para(oda.gecelik_fiyat);
    aciklama = `Oda ${oda.oda_no} konaklama`;
  }
  const mevcut = await trx('hesap_kalemleri')
    .where({ hesap_id: hesapId, tur: 'konaklama' })
    .first();
  const veri = {
    hesap_id: hesapId,
    tur: 'konaklama',
    aciklama,
    adet,
    birim_fiyat: birim,
    tutar: para(adet * birim),
    tarih: konaklama.giris_zamani,
    otomatik: true,
    kullanici_id: kullaniciId || null,
  };
  if (!mevcut) await trx('hesap_kalemleri').insert(veri);
  else if (mevcut.otomatik) await trx('hesap_kalemleri').where({ id: mevcut.id }).update(veri);
}

// Girişte açılır; grup için tek hesap
async function hesapAc(trx, konaklama, oda, kullaniciId) {
  const mevcut = await hesapBul(konaklama, trx);
  if (mevcut) return mevcut.id;
  const [id] = await trx('hesaplar').insert({
    konaklama_id: konaklama.id,
    grup_kodu: konaklama.grup_kodu || null,
    durum: 'acik',
    olusturma: simdi(),
  });
  await konaklamaKalemi(trx, id, konaklama, oda, kullaniciId);
  return id;
}

// Çıkışta ya da plan değişince kalemi gerçek geceye göre yeniler
async function yenidenHesapla(trx, konaklamaId, kullaniciId) {
  const k = await trx('konaklamalar').where({ id: konaklamaId }).first();
  if (!k) return;
  const h = await hesapBul(k, trx);
  if (!h || h.durum === 'kapali') return;
  const lider = await trx('konaklamalar').where({ id: h.konaklama_id }).first();
  const oda = await trx('odalar')
    .where({ id: (lider || k).oda_id })
    .first();
  await konaklamaKalemi(trx, h.id, lider || k, oda, kullaniciId);
}

// Eski kayıtlar için: hesap yoksa oluşturur
async function hesapGetirYaDaAc(konaklamaId, kullaniciId) {
  const k = await db('konaklamalar').where({ id: konaklamaId }).first();
  if (!k) throw new HttpHata(404, 'Konaklama bulunamadı');
  let h = await hesapBul(k);
  if (!h) {
    const oda = await db('odalar').where({ id: k.oda_id }).first();
    await db.transaction(async (trx) => {
      await hesapAc(trx, k, oda, kullaniciId);
    });
    h = await hesapBul(k);
  }
  return h;
}

function kalemDto(k) {
  return {
    id: k.id,
    tur: k.tur,
    aciklama: k.aciklama,
    adet: Number(k.adet),
    birimFiyat: Number(k.birim_fiyat),
    tutar: Number(k.tutar),
    tarih: k.tarih,
    otomatik: !!k.otomatik,
  };
}

function tahsilatDto(t) {
  return {
    id: t.id,
    tutar: Number(t.tutar),
    yontem: t.yontem,
    tarih: t.tarih,
    notlar: t.notlar || '',
    alan: t.alan || '',
  };
}

async function ozet(hesapId) {
  const h = await db('hesaplar').where({ id: hesapId }).first();
  if (!h) throw new HttpHata(404, 'Hesap bulunamadı');
  const [kalemler, tahsilatlar, lider] = await Promise.all([
    db('hesap_kalemleri').where({ hesap_id: hesapId }).orderBy('id'),
    db('tahsilatlar')
      .leftJoin('kullanicilar', 'kullanicilar.id', 'tahsilatlar.kullanici_id')
      .where({ hesap_id: hesapId })
      .select('tahsilatlar.*', 'kullanicilar.ad_soyad as alan')
      .orderBy('tahsilatlar.id'),
    db('konaklamalar')
      .join('konuklar', 'konuklar.id', 'konaklamalar.konuk_id')
      .join('odalar', 'odalar.id', 'konaklamalar.oda_id')
      .where('konaklamalar.id', h.konaklama_id)
      .select(
        'konaklamalar.id',
        'konaklamalar.giris_zamani',
        'konaklamalar.cikis_zamani',
        'konaklamalar.planlanan_cikis',
        'konaklamalar.durum',
        'konaklamalar.tur',
        'konaklamalar.kisi_sayisi',
        'konaklamalar.grup_kodu',
        'konuklar.ad',
        'konuklar.soyad',
        'odalar.oda_no'
      )
      .first(),
  ]);
  const konuklar = h.grup_kodu
    ? await db('konaklamalar')
        .join('konuklar', 'konuklar.id', 'konaklamalar.konuk_id')
        .where('konaklamalar.grup_kodu', h.grup_kodu)
        .select('konaklamalar.id', 'konuklar.ad', 'konuklar.soyad')
    : [{ id: lider.id, ad: lider.ad, soyad: lider.soyad }];
  const toplam = para(kalemler.reduce((a, k) => a + Number(k.tutar), 0));
  const tahsilat = para(tahsilatlar.reduce((a, t) => a + Number(t.tutar), 0));
  return {
    id: h.id,
    durum: h.durum,
    olusturma: h.olusturma,
    kapanis: h.kapanis || '',
    notlar: h.notlar || '',
    konaklamaId: h.konaklama_id,
    grupKodu: h.grup_kodu || '',
    konaklama: lider
      ? {
          id: lider.id,
          odaNo: lider.oda_no,
          girisZamani: lider.giris_zamani,
          cikisZamani: lider.cikis_zamani || '',
          planlananCikis: lider.planlanan_cikis || '',
          durum: lider.durum,
          tur: lider.tur,
          kisiSayisi: lider.kisi_sayisi,
          adSoyad: `${lider.ad} ${lider.soyad}`,
        }
      : null,
    konuklar: konuklar.map((k) => ({ konaklamaId: k.id, adSoyad: `${k.ad} ${k.soyad}` })),
    kalemler: kalemler.map(kalemDto),
    tahsilatlar: tahsilatlar.map(tahsilatDto),
    toplam,
    tahsilat,
    bakiye: para(toplam - tahsilat),
  };
}

async function acikMi(hesapId) {
  const h = await db('hesaplar').where({ id: hesapId }).first();
  if (!h) throw new HttpHata(404, 'Hesap bulunamadı');
  if (h.durum !== 'acik') throw new HttpHata(400, 'Hesap kapatılmış; önce yönetici açmalı');
  return h;
}

async function kalemEkle(hesapId, b, req) {
  await acikMi(hesapId);
  const birim = para(b.birimFiyat);
  const adet = para(b.adet);
  const tutar = para(adet * birim) * (b.tur === 'indirim' ? -1 : 1);
  const [id] = await db('hesap_kalemleri').insert({
    hesap_id: hesapId,
    tur: b.tur,
    aciklama: b.aciklama,
    adet,
    birim_fiyat: birim,
    tutar,
    tarih: b.tarih || simdi(),
    otomatik: false,
    kullanici_id: req.kullanici.id,
  });
  gunluk.kaydet(req, 'hesap_kalem', 'hesap:' + hesapId, { aciklama: b.aciklama, tutar });
  return id;
}

async function kalemSil(hesapId, kalemId, req) {
  await acikMi(hesapId);
  const k = await db('hesap_kalemleri').where({ id: kalemId, hesap_id: hesapId }).first();
  if (!k) throw new HttpHata(404, 'Kalem bulunamadı');
  if (k.tur === 'konaklama')
    throw new HttpHata(400, 'Konaklama kalemi silinemez; gece sayısı çıkışta hesaplanır');
  await db('hesap_kalemleri').where({ id: kalemId }).delete();
  gunluk.kaydet(req, 'hesap_kalem_sil', 'hesap:' + hesapId, { aciklama: k.aciklama });
}

// Konaklama kalemini elle düzeltme (ör. pazarlıkla farklı fiyat): otomatik hesaplama kapanır
async function kalemDuzelt(hesapId, kalemId, b, req) {
  await acikMi(hesapId);
  const k = await db('hesap_kalemleri').where({ id: kalemId, hesap_id: hesapId }).first();
  if (!k) throw new HttpHata(404, 'Kalem bulunamadı');
  const adet = para(b.adet);
  const birim = para(b.birimFiyat);
  await db('hesap_kalemleri')
    .where({ id: kalemId })
    .update({
      aciklama: b.aciklama,
      adet,
      birim_fiyat: birim,
      tutar: para(adet * birim) * (k.tur === 'indirim' ? -1 : 1),
      otomatik: false,
    });
  gunluk.kaydet(req, 'hesap_kalem_duzelt', 'hesap:' + hesapId, { aciklama: b.aciklama });
}

async function tahsilatEkle(hesapId, b, req) {
  await acikMi(hesapId);
  const [id] = await db('tahsilatlar').insert({
    hesap_id: hesapId,
    tutar: para(b.tutar),
    yontem: b.yontem,
    tarih: b.tarih || simdi(),
    notlar: b.notlar || '',
    kullanici_id: req.kullanici.id,
  });
  gunluk.kaydet(req, 'tahsilat', 'hesap:' + hesapId, { tutar: para(b.tutar), yontem: b.yontem });
  return id;
}

async function tahsilatSil(hesapId, tahsilatId, req) {
  await acikMi(hesapId);
  const t = await db('tahsilatlar').where({ id: tahsilatId, hesap_id: hesapId }).first();
  if (!t) throw new HttpHata(404, 'Tahsilat bulunamadı');
  await db('tahsilatlar').where({ id: tahsilatId }).delete();
  gunluk.kaydet(req, 'tahsilat_sil', 'hesap:' + hesapId, { tutar: Number(t.tutar) });
}

async function kapat(hesapId, req) {
  await acikMi(hesapId);
  const o = await ozet(hesapId);
  await db('hesaplar')
    .where({ id: hesapId })
    .update({ durum: 'kapali', kapanis: simdi(), kapatan: req.kullanici.id });
  gunluk.kaydet(req, 'hesap_kapat', 'hesap:' + hesapId, { bakiye: o.bakiye });
  return o.bakiye;
}

async function ac(hesapId, req) {
  const h = await db('hesaplar').where({ id: hesapId }).first();
  if (!h) throw new HttpHata(404, 'Hesap bulunamadı');
  await db('hesaplar')
    .where({ id: hesapId })
    .update({ durum: 'acik', kapanis: null, kapatan: null });
  gunluk.kaydet(req, 'hesap_ac', 'hesap:' + hesapId);
}

module.exports = {
  YONTEMLER,
  para,
  geceSayisi,
  hesapBul,
  hesapAc,
  yenidenHesapla,
  hesapGetirYaDaAc,
  ozet,
  kalemEkle,
  kalemSil,
  kalemDuzelt,
  tahsilatEkle,
  tahsilatSil,
  kapat,
  ac,
};
