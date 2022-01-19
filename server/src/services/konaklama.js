const crypto = require('crypto');
const db = require('../db/knex');
const konuk = require('./konuk');
const { HttpHata } = require('../middleware/hata');
const { simdi } = require('../utils/tarih');

function grupKodu() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
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

// Giriş yapılabilir mi: oda açık ve yer var
async function girisUygunMu(oda, kisi) {
  if (!oda) return { uygun: false, neden: 'Oda bulunamadı' };
  if (!oda.aktif) return { uygun: false, neden: `${oda.oda_no} numaralı oda kapalı` };
  const dolu = await db('konaklamalar')
    .where({ oda_id: oda.id, durum: 'konakliyor' })
    .count('id as n')
    .first();
  if (Number(dolu.n) + kisi > oda.kapasite) {
    return {
      uygun: false,
      neden: `${oda.oda_no} numaralı odanın kapasitesi ${oda.kapasite}, sığmıyor`,
    };
  }
  return { uygun: true };
}

// Giriş: tek konuk ya da grup. b: { odaId, girisZamani, plaka, konuklar[] }
async function girisYap(req, b) {
  const girisZamani = b.girisZamani || simdi();
  const odaSatiri = await db('odalar').where({ id: b.odaId }).first();
  const uygunluk = await girisUygunMu(odaSatiri, b.konuklar.length);
  if (!uygunluk.uygun) throw new HttpHata(400, uygunluk.neden, { odaId: uygunluk.neden });

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
        olusturan: req.kullanici.id,
      });
      olusanlar.push(konaklamaId);
    }
  });

  return olusanlar;
}

async function cikisYap(req, id, b) {
  const s = await db('konaklamalar').where({ id }).first();
  if (!s) throw new HttpHata(404, 'Konaklama bulunamadı');
  if (s.durum !== 'konakliyor') throw new HttpHata(400, 'Bu konaklama zaten kapatılmış');
  const cikisZamani = b.cikisZamani || simdi();
  if (cikisZamani < s.giris_zamani)
    throw new HttpHata(400, 'Çıkış zamanı girişten önce olamaz', {
      cikisZamani: 'Girişten önce',
    });

  let hedefler = [s];
  if (b.grupHepsi && s.grup_kodu) {
    hedefler = await db('konaklamalar').where({
      grup_kodu: s.grup_kodu,
      durum: 'konakliyor',
    });
  }
  await db.transaction(async (trx) => {
    for (const h of hedefler) {
      await trx('konaklamalar')
        .where({ id: h.id })
        .update({ durum: 'ayrildi', cikis_zamani: cikisZamani });
    }
  });
}

async function odaDegistir(req, id, odaId) {
  const s = await db('konaklamalar').where({ id }).first();
  if (!s) throw new HttpHata(404, 'Konaklama bulunamadı');
  if (s.durum !== 'konakliyor') throw new HttpHata(400, 'Ayrılmış konuğun odası değiştirilemez');
  if (s.oda_id === odaId) throw new HttpHata(400, 'Konuk zaten bu odada');
  const hedef = await db('odalar').where({ id: odaId }).first();
  const uygunluk = await girisUygunMu(hedef, 1);
  if (!uygunluk.uygun) throw new HttpHata(400, uygunluk.neden, { odaId: uygunluk.neden });

  await db('konaklamalar').where({ id }).update({ oda_id: odaId });
}

module.exports = { girisYap, cikisYap, odaDegistir };
