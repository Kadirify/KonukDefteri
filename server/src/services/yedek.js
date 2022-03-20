const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const db = require('../db/knex');
const log = require('../log');
const tesis = require('./tesis');
const { config } = require('../config');
const { HttpHata } = require('../middleware/hata');
const { simdi } = require('../utils/tarih');

// konukdefteri-2022-03-20-0300.sqlite, -manuel ya da -geri-yukleme-oncesi ekli
const DOSYA_DESENI =
  /^konukdefteri-\d{4}-\d{2}-\d{2}-\d{4}(-manuel|-geri-yukleme-oncesi)?\.sqlite$/;

let gorev = null;

async function klasor() {
  const ayar = await tesis.ayar('yedek_klasoru', '');
  const k = ayar && ayar.trim() ? ayar.trim() : path.join(config.veriKlasoru, 'yedek');
  fs.mkdirSync(k, { recursive: true });
  return k;
}

function dosyaAdi(ek) {
  const an = simdi();
  const saat = an.slice(11, 13) + an.slice(14, 16);
  return `konukdefteri-${an.slice(0, 10)}-${saat}${ek ? '-' + ek : ''}.sqlite`;
}

function turu(ad) {
  if (ad.includes('-manuel')) return 'manuel';
  if (ad.includes('-geri-yukleme-oncesi')) return 'guvenlik';
  return 'otomatik';
}

async function dosyaYolu(ad) {
  if (!DOSYA_DESENI.test(ad)) throw new HttpHata(400, 'Geçersiz yedek adı');
  const yol = path.join(await klasor(), ad);
  if (!fs.existsSync(yol)) throw new HttpHata(404, 'Yedek bulunamadı');
  return yol;
}

async function liste() {
  const k = await klasor();
  const dosyalar = fs
    .readdirSync(k)
    .filter((ad) => DOSYA_DESENI.test(ad))
    .map((ad) => {
      const st = fs.statSync(path.join(k, ad));
      return { ad, tur: turu(ad), boyut: st.size, zaman: simdi(st.mtime) };
    })
    .sort((a, b) => (a.ad < b.ad ? 1 : -1));
  return { klasor: k, dosyalar };
}

// En yeni N yedek kalır, gerisi silinir
async function eskileriSil() {
  const adet = Number(await tesis.ayar('yedek_adet', '14')) || 14;
  const { klasor: k, dosyalar } = await liste();
  const fazla = dosyalar.slice(adet);
  fazla.forEach((d) => fs.unlinkSync(path.join(k, d.ad)));
  return fazla.length;
}

// VACUUM INTO çalışan veritabanının tutarlı bir kopyasını tek seferde yazar (SQLite 3.27+),
// dosyayı kopyalamaktan farkı: yarım kalmış yazma ya da journal derdi yok.
async function al(ek) {
  const k = await klasor();
  const ad = dosyaAdi(ek);
  const hedef = path.join(k, ad);
  if (fs.existsSync(hedef)) fs.unlinkSync(hedef);
  await db.raw('VACUUM INTO ?', [hedef]);
  const st = fs.statSync(hedef);
  log.info(`Yedek alındı: ${ad} (${Math.round(st.size / 1024)} KB)`);
  await eskileriSil();
  return { ad, tur: turu(ad), boyut: st.size, zaman: simdi(st.mtime) };
}

async function sil(ad) {
  fs.unlinkSync(await dosyaYolu(ad));
}

// Yedekteki tabloları çalışan veritabanına kopyalar. Önce güvenlik kopyası alınır;
// yedek başka bir sürümden geliyorsa (migration listesi farklı) reddedilir.
async function geriYukle(ad) {
  const kaynak = await dosyaYolu(ad);
  await al('geri-yukleme-oncesi');
  await db.raw('ATTACH DATABASE ? AS yedek', [kaynak]);
  try {
    let yedekteki;
    try {
      yedekteki = await db.raw('SELECT name FROM yedek.knex_migrations ORDER BY id');
    } catch (e) {
      throw new HttpHata(400, 'Dosya okunamadı ya da bir KonukDefteri yedeği değil');
    }
    const mevcut = await db('knex_migrations').orderBy('id').pluck('name');
    if (mevcut.join('|') !== yedekteki.map((r) => r.name).join('|')) {
      throw new HttpHata(400, 'Yedek farklı bir program sürümünden; o sürümle açıp güncelleyin');
    }
    const tablolar = (
      await db.raw(
        "SELECT name FROM yedek.sqlite_master WHERE type = 'table' " +
          "AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'knex_%'"
      )
    ).map((r) => r.name);
    await db.raw('PRAGMA foreign_keys = OFF');
    try {
      await db.transaction(async (trx) => {
        for (const t of tablolar) {
          await trx.raw(`DELETE FROM main."${t}"`);
          await trx.raw(`INSERT INTO main."${t}" SELECT * FROM yedek."${t}"`);
        }
        await trx.raw('DELETE FROM main.sqlite_sequence');
        await trx.raw('INSERT INTO main.sqlite_sequence SELECT * FROM yedek.sqlite_sequence');
      });
    } finally {
      await db.raw('PRAGMA foreign_keys = ON');
    }
    log.info(`Yedek geri yüklendi: ${ad}`);
  } finally {
    await db.raw('DETACH DATABASE yedek');
  }
}

// Pano için: en son yedeğin zamanı, hiç yoksa boş
async function son() {
  try {
    const { dosyalar } = await liste();
    return dosyalar.length ? dosyalar[0].zaman : '';
  } catch (e) {
    return '';
  }
}

async function baslat() {
  if (gorev) gorev.stop();
  if ((await tesis.ayar('yedek_otomatik', '1')) !== '1') return;
  const saat = await tesis.ayar('yedek_saati', '03:00');
  const [sa, dk] = saat.split(':').map(Number);
  gorev = cron.schedule(`${dk} ${sa} * * *`, () => {
    al().catch((e) => log.warn('Otomatik yedek alınamadı: ' + e.message));
  });
  log.info(`Günlük yedek ${saat} saatinde alınacak`);
}

function durdur() {
  if (gorev) gorev.stop();
}

module.exports = { liste, al, sil, geriYukle, dosyaYolu, son, baslat, durdur };
