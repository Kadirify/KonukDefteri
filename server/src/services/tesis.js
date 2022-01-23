const db = require('../db/knex');
const { coz } = require('./kripto');
const { config } = require('../config');

async function oku() {
  const t = await db('tesis').first();
  return t || {};
}

// KBS sürücülerinin ihtiyaç duyduğu haliyle: şifre çözülmüş, WSDL doldurulmuş
async function kbsBaglantisi() {
  const t = await oku();
  return {
    tesisKodu: t.tesis_kodu || '',
    bolge: t.bolge || 'emniyet',
    mod: t.kbs_mod || 'manuel',
    kullanici: t.kbs_kullanici || '',
    sifre: t.kbs_sifre ? coz(t.kbs_sifre) : '',
    wsdl: t.kbs_wsdl,
  };
}

async function ayar(anahtar, varsayilan) {
  const satir = await db('ayarlar').where({ anahtar }).first();
  return satir ? satir.deger : varsayilan;
}

const VARSAYILAN_AYARLAR = {
  kuyruk_dakika: '2',
  saklama_yil: '5',
};

async function ayarlar() {
  const satirlar = await db('ayarlar');
  const sonuc = { ...VARSAYILAN_AYARLAR };
  satirlar.forEach((s) => {
    sonuc[s.anahtar] = s.deger;
  });
  return sonuc;
}

module.exports = { oku, kbsBaglantisi, ayar, ayarlar, VARSAYILAN_AYARLAR };
