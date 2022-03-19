const Joi = require('joi');
const db = require('../db/knex');
const { sifrele, coz, ozet } = require('./kripto');
const { tcknGecerli } = require('../utils/tckn');
const { HttpHata } = require('../middleware/hata');
const { simdi } = require('../utils/tarih');

const temelSema = {
  kimlikTuru: Joi.string().valid('tc', 'pasaport').required(),
  pasaportNo: Joi.string()
    .trim()
    .uppercase()
    .max(20)
    .when('kimlikTuru', { is: 'pasaport', then: Joi.required(), otherwise: Joi.allow('') }),
  uyruk: Joi.string().trim().uppercase().min(3).max(4).required(),
  ad: Joi.string().trim().min(1).max(60).required(),
  soyad: Joi.string().trim().min(1).max(60).required(),
  babaAdi: Joi.string().trim().max(60).allow(''),
  anneAdi: Joi.string().trim().max(60).allow(''),
  dogumTarihi: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .allow(''),
  dogumYeri: Joi.string().trim().max(60).allow(''),
  cinsiyet: Joi.string().valid('E', 'K', '').default(''),
  telefon: Joi.string().trim().max(30).allow(''),
  kvkkOnay: Joi.boolean().default(false),
  notlar: Joi.string().trim().max(300).allow(''),
  // Girişte gönderilmez; gönderilmediyse kayıttaki değer korunur
  karaListe: Joi.boolean(),
  karaListeNeden: Joi.string().trim().max(200).allow(''),
};

// Yeni kayıtta TC zorunlu, düzenlemede boş bırakılırsa eskisi kalır
const yeniSema = Joi.object({
  ...temelSema,
  tc: Joi.string()
    .trim()
    .pattern(/^[0-9]{11}$/)
    .when('kimlikTuru', { is: 'tc', then: Joi.required(), otherwise: Joi.allow('') }),
});

const duzenleSema = Joi.object({
  ...temelSema,
  tc: Joi.string()
    .trim()
    .pattern(/^[0-9]{11}$/)
    .allow(''),
});

function maskele(son4) {
  return son4 ? '*******' + son4 : '';
}

function dto(k, tamTc) {
  const sonuc = {
    id: k.id,
    kimlikTuru: k.kimlik_turu,
    tcMaskeli: k.kimlik_turu === 'tc' ? maskele(k.tc_son4) : '',
    pasaportNo: k.pasaport_no || '',
    uyruk: k.uyruk,
    ad: k.ad,
    soyad: k.soyad,
    babaAdi: k.baba_adi || '',
    anneAdi: k.anne_adi || '',
    dogumTarihi: k.dogum_tarihi || '',
    dogumYeri: k.dogum_yeri || '',
    cinsiyet: k.cinsiyet || '',
    telefon: k.telefon || '',
    kvkkOnay: !!k.kvkk_onay,
    notlar: k.notlar || '',
    karaListe: !!k.kara_liste,
    karaListeNeden: k.kara_liste_neden || '',
    olusturma: k.olusturma,
    guncelleme: k.guncelleme || null,
  };
  if (tamTc && k.tc_sifreli) sonuc.tc = coz(k.tc_sifreli);
  return sonuc;
}

function satirHazirla(b, tcZorunlu) {
  const satir = {
    kimlik_turu: b.kimlikTuru,
    uyruk: b.kimlikTuru === 'tc' ? 'TUR' : b.uyruk,
    ad: b.ad,
    soyad: b.soyad,
    baba_adi: b.babaAdi || '',
    anne_adi: b.anneAdi || '',
    dogum_tarihi: b.dogumTarihi || null,
    dogum_yeri: b.dogumYeri || '',
    cinsiyet: b.cinsiyet || '',
    telefon: b.telefon || '',
    kvkk_onay: !!b.kvkkOnay,
    notlar: b.notlar || '',
    guncelleme: simdi(),
  };
  if (b.karaListe !== undefined) {
    satir.kara_liste = !!b.karaListe;
    satir.kara_liste_neden = b.karaListe ? b.karaListeNeden || '' : '';
  }
  if (b.kimlikTuru === 'tc') {
    if (b.tc) {
      if (!tcknGecerli(b.tc)) {
        throw new HttpHata(400, 'TC kimlik numarası geçersiz', { tc: 'Geçersiz numara' });
      }
      satir.tc_sifreli = sifrele(b.tc);
      satir.tc_hash = ozet(b.tc);
      satir.tc_son4 = b.tc.slice(-4);
    } else if (tcZorunlu) {
      throw new HttpHata(400, 'TC kimlik numarası gerekli', { tc: 'Zorunlu alan' });
    }
    satir.pasaport_no = '';
  } else {
    satir.tc_sifreli = null;
    satir.tc_hash = null;
    satir.tc_son4 = null;
    satir.pasaport_no = b.pasaportNo;
  }
  return satir;
}

// Aynı kimlikle kayıtlı konuk var mı
async function ayniKimlik(b, haricId, trx = db) {
  let q = trx('konuklar');
  if (b.kimlikTuru === 'tc') {
    if (!b.tc) return null;
    q = q.where({ tc_hash: ozet(b.tc) });
  } else {
    q = q.where({ pasaport_no: b.pasaportNo, uyruk: b.uyruk });
  }
  if (haricId) q = q.whereNot({ id: haricId });
  return q.first();
}

async function olustur(b, trx = db) {
  const [id] = await trx('konuklar').insert(satirHazirla(b, true));
  return id;
}

async function guncelle(id, b, trx = db) {
  await trx('konuklar').where({ id }).update(satirHazirla(b, false));
}

module.exports = { yeniSema, duzenleSema, dto, ayniKimlik, olustur, guncelle, maskele };
