const db = require('../db/knex');

async function oku() {
  const t = await db('tesis').first();
  return t || {};
}

async function ayar(anahtar, varsayilan) {
  const satir = await db('ayarlar').where({ anahtar }).first();
  return satir ? satir.deger : varsayilan;
}

const VARSAYILAN_AYARLAR = {
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
