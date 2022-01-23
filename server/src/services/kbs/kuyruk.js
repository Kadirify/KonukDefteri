const cron = require('node-cron');
const db = require('../../db/knex');
const log = require('../../log');
const tesis = require('../tesis');
const { surucu } = require('./index');
const { bildirimAlanlari } = require('./alanlar');
const { simdi } = require('../../utils/tarih');

// TODO: sınıra takılan bildirim için mail ya da sms uyarısı yok, elle tetiklemek gerekiyor
const EN_FAZLA_DENEME = 3;
let gorev = null;
let calisiyor = false;

async function birGonder(b, baglanti) {
  const s = surucu(baglanti.mod);
  try {
    const alanlar = await bildirimAlanlari(b.id);
    const sonuc = await s.gonder(baglanti, alanlar);
    await db('kbs_bildirimler')
      .where({ id: b.id })
      .update({
        durum: 'gonderildi',
        mod: s.ad,
        deneme: b.deneme + 1,
        son_hata: null,
        gonderim_zamani: simdi(),
        yanit_ref: sonuc.ref || '',
      });
    log.info(`KBS bildirim #${b.id} (${b.tur}) gönderildi${sonuc.ref ? ', ref ' + sonuc.ref : ''}`);
    return true;
  } catch (e) {
    await db('kbs_bildirimler')
      .where({ id: b.id })
      .update({
        durum: 'hata',
        mod: s.ad,
        deneme: b.deneme + 1,
        son_hata: String(e.message || e).slice(0, 500),
      });
    log.warn(`KBS bildirim #${b.id} gönderilemedi: ${e.message}`);
    return false;
  }
}

// zorlaId: ekrandaki "tekrar gönder"; deneme sınırına bakmadan sadece o kaydı dener
async function isle(zorlaId) {
  if (calisiyor) return { atlandi: true };
  calisiyor = true;
  try {
    const baglanti = await tesis.kbsBaglantisi();
    if (baglanti.mod === 'manuel' && !zorlaId) return { gonderilen: 0 };
    if (baglanti.mod === 'manuel') throw new Error('Tesis manuel modda, otomatik gönderim kapalı');

    let sorgu = db('kbs_bildirimler').orderBy('id');
    if (zorlaId) sorgu = sorgu.where({ id: zorlaId });
    else sorgu = sorgu.whereIn('durum', ['bekliyor', 'hata']).where('deneme', '<', EN_FAZLA_DENEME);
    const liste = await sorgu;

    let gonderilen = 0;
    for (const b of liste) {
      const tamam = await birGonder(b, baglanti);
      if (tamam) gonderilen += 1;
      else if (!zorlaId) break; // servis yoksa hepsini tek tek denemeye gerek yok
    }
    return { gonderilen, toplam: liste.length };
  } finally {
    calisiyor = false;
  }
}

function tetikle() {
  setTimeout(() => {
    isle().catch((e) => log.warn('Kuyruk: ' + e.message));
  }, 300);
}

async function baslat() {
  const dakika = Number(await tesis.ayar('kuyruk_dakika', '2')) || 2;
  if (gorev) gorev.stop();
  gorev = cron.schedule(`*/${dakika} * * * *`, () => {
    isle().catch((e) => log.warn('Kuyruk: ' + e.message));
  });
  log.info('KBS kuyruğu başladı');
}

function durdur() {
  if (gorev) gorev.stop();
}

module.exports = { isle, tetikle, baslat, durdur, EN_FAZLA_DENEME };
