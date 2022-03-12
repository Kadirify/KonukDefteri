const db = require('../db/knex');
const { simdi, bugun } = require('../utils/tarih');

const TEMIZLIK = ['temiz', 'kirli', 'temizleniyor', 'kontrol'];
const KULLANIM = ['kullanimda', 'bakimda', 'kapali'];

// Kat sırası (0 en üst), sonra oda sırası, sonra numara
function odaSirala(a, b) {
  const ka = a.kat_sira === null || a.kat_sira === undefined ? 999 : a.kat_sira;
  const kb = b.kat_sira === null || b.kat_sira === undefined ? 999 : b.kat_sira;
  if (ka !== kb) return ka - kb;
  if (a.sira !== b.sira) return a.sira - b.sira;
  return String(a.oda_no).localeCompare(String(b.oda_no), 'tr', { numeric: true });
}

async function konaklayanHaritasi() {
  const satirlar = await db('konaklamalar')
    .join('konuklar', 'konuklar.id', 'konaklamalar.konuk_id')
    .where('konaklamalar.durum', 'konakliyor')
    .select(
      'konaklamalar.id as konaklamaId',
      'konaklamalar.oda_id as odaId',
      'konaklamalar.giris_zamani as girisZamani',
      'konaklamalar.planlanan_cikis as planlananCikis',
      'konaklamalar.tur',
      'konaklamalar.grup_kodu as grupKodu',
      'konuklar.id as konukId',
      'konuklar.ad',
      'konuklar.soyad'
    );
  const harita = {};
  satirlar.forEach((s) => {
    if (!harita[s.odaId]) harita[s.odaId] = [];
    harita[s.odaId].push(s);
  });
  return harita;
}

async function bugunkuRezervasyonlar() {
  const gun = bugun();
  const satirlar = await db('rezervasyonlar')
    .whereIn('durum', ['bekliyor', 'onayli'])
    .whereNotNull('oda_id')
    .where('giris_tarihi', '<=', gun)
    .where('cikis_tarihi', '>', gun)
    .orderBy('giris_tarihi');
  const harita = {};
  satirlar.forEach((r) => {
    if (!harita[r.oda_id]) harita[r.oda_id] = r;
  });
  return harita;
}

function dto(o, konaklayanlar, rezervasyon, gizli) {
  const liste = konaklayanlar || [];
  const an = simdi();
  let doluluk = 'bos';
  if (liste.length) doluluk = 'dolu';
  else if (rezervasyon) doluluk = 'rezerve';
  const planlanan = liste.reduce(
    (en, k) => (k.planlananCikis && (!en || k.planlananCikis > en) ? k.planlananCikis : en),
    null
  );
  return {
    id: o.id,
    odaNo: o.oda_no,
    tip: o.tip || '',
    kapasite: o.kapasite,
    tur: o.tur || 'oda',
    kat: o.kat_id
      ? { id: o.kat_id, ad: o.kat_ad || '', sira: o.kat_sira, koridor: o.kat_koridor || 'orta' }
      : null,
    sira: o.sira || 0,
    temizlik: o.temizlik || 'temiz',
    kullanim: o.kullanim || 'kullanimda',
    bakimNotu: o.bakim_notu || '',
    bakimBitis: o.bakim_bitis || '',
    ozellikler: (o.ozellikler || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    sonTemizlik: o.son_temizlik || '',
    notlar: o.notlar || '',
    gecelikFiyat: Number(o.gecelik_fiyat || 0),
    gunubirlikFiyat: Number(o.gunubirlik_fiyat || 0),
    aktif: (o.kullanim || 'kullanimda') === 'kullanimda',
    doluluk,
    // eski ekranlar için: kapali | dolu | bos
    durum:
      (o.kullanim || 'kullanimda') !== 'kullanimda'
        ? 'kapali'
        : doluluk === 'dolu'
        ? 'dolu'
        : 'bos',
    konaklayanlar: gizli
      ? liste.map((k) => ({
          konaklamaId: k.konaklamaId,
          girisZamani: k.girisZamani,
          planlananCikis: k.planlananCikis,
        }))
      : liste,
    kisiSayisi: liste.length,
    planlananCikis: planlanan,
    gecikenCikis: !!(planlanan && planlanan < an),
    rezervasyon: rezervasyon
      ? {
          id: rezervasyon.id,
          adSoyad: rezervasyon.ad_soyad,
          girisTarihi: rezervasyon.giris_tarihi,
          cikisTarihi: rezervasyon.cikis_tarihi,
          kisiSayisi: rezervasyon.kisi_sayisi,
          kaynak: rezervasyon.kaynak,
        }
      : null,
  };
}

function odaSorgusu() {
  return db('odalar')
    .leftJoin('katlar', 'katlar.id', 'odalar.kat_id')
    .select(
      'odalar.*',
      'katlar.ad as kat_ad',
      'katlar.sira as kat_sira',
      'katlar.koridor as kat_koridor'
    );
}

async function hepsi(gizli) {
  const [odalar, konaklayanlar, rezervasyonlar] = await Promise.all([
    odaSorgusu(),
    konaklayanHaritasi(),
    bugunkuRezervasyonlar(),
  ]);
  return odalar
    .sort(odaSirala)
    .map((o) => dto(o, konaklayanlar[o.id], rezervasyonlar[o.id], gizli));
}

async function oku(id, gizli) {
  const o = await odaSorgusu().where('odalar.id', id).first();
  if (!o) return null;
  const [konaklayanlar, rezervasyonlar] = await Promise.all([
    konaklayanHaritasi(),
    bugunkuRezervasyonlar(),
  ]);
  return dto(o, konaklayanlar[o.id], rezervasyonlar[o.id], gizli);
}

// Giriş yapılabilir mi? zorla: yönetici kirli odaya bile bile yerleştiriyor
async function girisUygunMu(oda, kisi, zorla, trx = db) {
  if (!oda) return { uygun: false, neden: 'Oda bulunamadı' };
  if (oda.tur === 'ortak') return { uygun: false, neden: 'Ortak alana giriş yapılamaz' };
  if (oda.kullanim === 'bakimda')
    return { uygun: false, neden: `${oda.oda_no} numaralı oda bakımda` };
  if (oda.kullanim === 'kapali')
    return { uygun: false, neden: `${oda.oda_no} numaralı oda kapalı` };
  const dolu = await trx('konaklamalar')
    .where({ oda_id: oda.id, durum: 'konakliyor' })
    .count('id as n')
    .first();
  if (Number(dolu.n) + kisi > oda.kapasite) {
    return {
      uygun: false,
      neden: `${oda.oda_no} numaralı odanın kapasitesi ${oda.kapasite}, sığmıyor`,
    };
  }
  if (oda.temizlik !== 'temiz' && !zorla) {
    const etiket =
      { kirli: 'kirli', temizleniyor: 'temizleniyor', kontrol: 'kontrol bekliyor' }[oda.temizlik] ||
      oda.temizlik;
    return {
      uygun: false,
      neden: `${oda.oda_no} numaralı oda ${etiket}; önce temizlik tamamlanmalı`,
      temizlik: true,
    };
  }
  return { uygun: true };
}

async function olayKaydet(trx, odaId, tur, kullaniciId, notlar) {
  await trx('oda_olaylari').insert({
    oda_id: odaId,
    tur,
    zaman: simdi(),
    kullanici_id: kullaniciId || null,
    notlar: notlar || '',
  });
}

module.exports = {
  TEMIZLIK,
  KULLANIM,
  hepsi,
  oku,
  dto,
  girisUygunMu,
  odaSirala,
  olayKaydet,
  odaSorgusu,
};
