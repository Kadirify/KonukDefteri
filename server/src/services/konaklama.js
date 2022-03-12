const crypto = require('crypto');
const db = require('../db/knex');
const konuk = require('./konuk');
const tesis = require('./tesis');
const kbs = require('./kbs');
const kuyruk = require('./kbs/kuyruk');
const oda = require('./oda');
const temizlik = require('./temizlik');
const hesap = require('./hesap');
const gunluk = require('./gunluk');
const { HttpHata } = require('../middleware/hata');
const { simdi, saatEkle, gunEkle } = require('../utils/tarih');

function grupKodu() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// Planlanan çıkış girilmediyse: gece konaklamada ertesi gün çıkış saati,
// günübirlikte giriş + ayarlardaki saat
function varsayilanCikis(tur, girisZamani, ayarlar) {
  if (tur === 'gunubirlik') return saatEkle(girisZamani, Number(ayarlar.gunubirlik_saat) || 6);
  const ertesi = gunEkle(girisZamani.slice(0, 10) + ' 00:00', 1).slice(0, 10);
  return `${ertesi} ${ayarlar.cikis_saati || '11:00'}`;
}

async function konukIdBul(trx, eleman) {
  if (eleman.konukId) {
    const k = await trx('konuklar').where({ id: eleman.konukId }).first();
    if (!k) throw new HttpHata(400, 'Konuk bulunamadı');
    return k.id;
  }
  const mevcut = await konuk.ayniKimlik(eleman.konuk, null, trx);
  if (mevcut) {
    await konuk.guncelle(mevcut.id, eleman.konuk, trx);
    return mevcut.id;
  }
  return konuk.olustur(eleman.konuk, trx);
}

// b: girisSemasi'dan geçmiş body (routes/konaklamalar.js)
async function girisYap(req, b) {
  const ayarlar = await tesis.ayarlar();
  const girisZamani = b.girisZamani || simdi();
  const tur = b.tur || 'gece';
  if (tur === 'gunubirlik' && ayarlar.gunubirlik_izinli !== '1') {
    throw new HttpHata(400, 'Günübirlik kullanım ayarlardan kapatılmış');
  }
  const planlananCikis = b.planlananCikis || varsayilanCikis(tur, girisZamani, ayarlar);
  if (planlananCikis <= girisZamani)
    throw new HttpHata(400, 'Planlanan çıkış girişten sonra olmalı', {
      planlananCikis: 'Girişten sonra olmalı',
    });

  const odaSatiri = await db('odalar').where({ id: b.odaId }).first();
  const zorla = !!b.zorla && req.kullanici.rol === 'yonetici';
  const uygunluk = await oda.girisUygunMu(odaSatiri, b.konuklar.length, zorla);
  if (!uygunluk.uygun)
    throw new HttpHata(400, uygunluk.neden, {
      odaId: uygunluk.neden,
      temizlik: uygunluk.temizlik || false,
    });

  let rezervasyon = null;
  if (b.rezervasyonId) {
    rezervasyon = await db('rezervasyonlar').where({ id: b.rezervasyonId }).first();
    if (!rezervasyon) throw new HttpHata(400, 'Rezervasyon bulunamadı');
    if (!['bekliyor', 'onayli'].includes(rezervasyon.durum))
      throw new HttpHata(400, 'Bu rezervasyon kapatılmış');
  }

  const baglanti = await tesis.kbsBaglantisi();
  const grup = b.konuklar.length > 1 ? grupKodu() : null;
  const olusanlar = [];

  await db.transaction(async (trx) => {
    for (const eleman of b.konuklar) {
      const konukId = await konukIdBul(trx, eleman);
      const zatenIcerde = await trx('konaklamalar')
        .join('odalar', 'odalar.id', 'konaklamalar.oda_id')
        .where({ konuk_id: konukId, 'konaklamalar.durum': 'konakliyor' })
        .select('odalar.oda_no')
        .first();
      if (zatenIcerde)
        throw new HttpHata(400, `Konuk zaten ${zatenIcerde.oda_no} numaralı odada konaklıyor`);
      const [konaklamaId] = await trx('konaklamalar').insert({
        konuk_id: konukId,
        oda_id: odaSatiri.id,
        grup_kodu: grup,
        giris_zamani: girisZamani,
        plaka: b.plaka || '',
        durum: 'konakliyor',
        tur,
        planlanan_cikis: planlananCikis,
        rezervasyon_id: rezervasyon ? rezervasyon.id : null,
        kisi_sayisi: b.konuklar.length,
        olusturan: req.kullanici.id,
      });
      await trx('konaklama_odalari').insert({
        konaklama_id: konaklamaId,
        oda_id: odaSatiri.id,
        baslangic: girisZamani,
        bitis: null,
      });
      await kbs.bildirimOlustur(trx, konaklamaId, 'giris', baglanti.mod);
      olusanlar.push(konaklamaId);
    }
    if (zorla && odaSatiri.temizlik !== 'temiz') {
      await oda.olayKaydet(
        trx,
        odaSatiri.id,
        'zorla_giris',
        req.kullanici.id,
        `oda ${odaSatiri.temizlik} iken giriş`
      );
    }
    if (rezervasyon) {
      await trx('rezervasyonlar')
        .where({ id: rezervasyon.id })
        .update({ durum: 'geldi', konaklama_id: olusanlar[0], oda_id: odaSatiri.id });
    }
    // Grup için tek hesap, ilk konaklamaya bağlı
    const lider = await trx('konaklamalar').where({ id: olusanlar[0] }).first();
    await hesap.hesapAc(trx, lider, odaSatiri, req.kullanici.id);
  });

  gunluk.kaydet(req, 'giris_kaydi', 'konaklama:' + olusanlar.join(','), {
    oda: odaSatiri.oda_no,
    kisi: olusanlar.length,
    tur,
    zorla,
  });
  kuyruk.tetikle();
  return olusanlar;
}

async function cikisYap(req, id, b) {
  const s = await db('konaklamalar').where({ id }).first();
  if (!s) throw new HttpHata(404, 'Konaklama bulunamadı');
  if (s.durum !== 'konakliyor') throw new HttpHata(400, 'Bu konaklama zaten kapatılmış');
  const cikisZamani = b.cikisZamani || simdi();
  if (cikisZamani < s.giris_zamani)
    throw new HttpHata(400, 'Çıkış zamanı girişten önce olamaz', { cikisZamani: 'Girişten önce' });

  let hedefler = [s];
  if (b.grupHepsi && s.grup_kodu) {
    hedefler = await db('konaklamalar').where({ grup_kodu: s.grup_kodu, durum: 'konakliyor' });
  }
  const baglanti = await tesis.kbsBaglantisi();
  await db.transaction(async (trx) => {
    const bosalanOdalar = new Set();
    for (const h of hedefler) {
      await trx('konaklamalar')
        .where({ id: h.id })
        .update({ durum: 'ayrildi', cikis_zamani: cikisZamani });
      await trx('konaklama_odalari')
        .where({ konaklama_id: h.id })
        .whereNull('bitis')
        .update({ bitis: cikisZamani });
      await kbs.bildirimOlustur(trx, h.id, 'cikis', baglanti.mod);
      bosalanOdalar.add(h.oda_id);
    }
    // Gerçek gece sayısına göre konaklama kalemi
    await hesap.yenidenHesapla(trx, s.id, req.kullanici.id);
    for (const odaId of bosalanOdalar) {
      const kalan = await trx('konaklamalar')
        .where({ oda_id: odaId, durum: 'konakliyor' })
        .count('id as n')
        .first();
      if (Number(kalan.n) === 0) await temizlik.odaKirliYap(trx, odaId, req, 'cikis');
    }
  });
  gunluk.kaydet(req, 'cikis_kaydi', 'konaklama:' + hedefler.map((h) => h.id).join(','));
  kuyruk.tetikle();
}

async function odaDegistir(req, id, odaId) {
  const s = await db('konaklamalar').where({ id }).first();
  if (!s) throw new HttpHata(404, 'Konaklama bulunamadı');
  if (s.durum !== 'konakliyor') throw new HttpHata(400, 'Ayrılmış konuğun odası değiştirilemez');
  if (s.oda_id === odaId) throw new HttpHata(400, 'Konuk zaten bu odada');
  const hedef = await db('odalar').where({ id: odaId }).first();
  const uygunluk = await oda.girisUygunMu(hedef, 1, false);
  if (!uygunluk.uygun) throw new HttpHata(400, uygunluk.neden, { odaId: uygunluk.neden });

  const an = simdi();
  const eskiOda = s.oda_id;
  const baglanti = await tesis.kbsBaglantisi();
  await db.transaction(async (trx) => {
    await trx('konaklamalar').where({ id }).update({ oda_id: odaId });
    await trx('konaklama_odalari')
      .where({ konaklama_id: id })
      .whereNull('bitis')
      .update({ bitis: an });
    await trx('konaklama_odalari').insert({
      konaklama_id: id,
      oda_id: odaId,
      baslangic: an,
      bitis: null,
    });
    await kbs.bildirimOlustur(trx, id, 'guncelle', baglanti.mod);
    const kalan = await trx('konaklamalar')
      .where({ oda_id: eskiOda, durum: 'konakliyor' })
      .count('id as n')
      .first();
    if (Number(kalan.n) === 0) await temizlik.odaKirliYap(trx, eskiOda, req, 'cikis');
    await hesap.yenidenHesapla(trx, id, req.kullanici.id);
  });
  gunluk.kaydet(req, 'oda_degisikligi', 'konaklama:' + id, { yeniOda: hedef.oda_no });
  kuyruk.tetikle();
}

module.exports = { girisYap, cikisYap, odaDegistir, varsayilanCikis };
