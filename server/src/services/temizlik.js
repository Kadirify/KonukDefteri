const db = require('../db/knex');
const tesis = require('./tesis');
const { olayKaydet } = require('./oda');
const { HttpHata } = require('../middleware/hata');
const { simdi } = require('../utils/tarih');
const gunluk = require('./gunluk');

const ACIK = ['bekliyor', 'yapiliyor', 'kontrol'];

async function acikGorev(trx, odaId) {
  return trx('temizlik_gorevleri')
    .where({ oda_id: odaId })
    .whereIn('durum', ACIK)
    .orderBy('id')
    .first();
}

// Odaya görev açar; zaten açık görev varsa onu döner
async function gorevAc(trx, odaId, tur, notlar) {
  const mevcut = await acikGorev(trx, odaId);
  if (mevcut) return mevcut.id;
  const [id] = await trx('temizlik_gorevleri').insert({
    oda_id: odaId,
    tur: tur || 'cikis',
    durum: 'bekliyor',
    olusturma: simdi(),
    notlar: notlar || '',
  });
  return id;
}

// Çıkış ya da oda değişiminden sonra: oda kirli, ayara göre görev açılır
async function odaKirliYap(trx, odaId, req, tur) {
  await trx('odalar').where({ id: odaId }).update({ temizlik: 'kirli' });
  await olayKaydet(trx, odaId, 'temizlik', req && req.kullanici ? req.kullanici.id : null, 'kirli');
  const otomatik = (await tesis.ayar('cikista_temizlik', '1', trx)) === '1';
  if (otomatik) await gorevAc(trx, odaId, tur || 'cikis');
}

async function temizYap(trx, odaId, kullaniciId) {
  await trx('odalar').where({ id: odaId }).update({ temizlik: 'temiz', son_temizlik: simdi() });
  await olayKaydet(trx, odaId, 'temizlik', kullaniciId, 'temiz');
}

async function gorevOku(id) {
  const g = await db('temizlik_gorevleri').where({ id }).first();
  if (!g) throw new HttpHata(404, 'Görev bulunamadı');
  return g;
}

async function basla(id, req) {
  const g = await gorevOku(id);
  if (g.durum !== 'bekliyor') throw new HttpHata(400, 'Bu görev zaten başlamış ya da bitmiş');
  await db.transaction(async (trx) => {
    await trx('temizlik_gorevleri')
      .where({ id })
      .update({ durum: 'yapiliyor', baslama: simdi(), yapan_id: req.kullanici.id });
    await trx('odalar').where({ id: g.oda_id }).update({ temizlik: 'temizleniyor' });
  });
  gunluk.kaydet(req, 'temizlik_basla', 'oda:' + g.oda_id, { gorev: id });
}

async function bitir(id, req, notlar) {
  const g = await gorevOku(id);
  if (!['bekliyor', 'yapiliyor'].includes(g.durum))
    throw new HttpHata(400, 'Bu görev zaten bitmiş');
  const kontrol = (await tesis.ayar('temizlik_kontrolu', '0')) === '1';
  await db.transaction(async (trx) => {
    await trx('temizlik_gorevleri')
      .where({ id })
      .update({
        durum: kontrol ? 'kontrol' : 'tamam',
        baslama: g.baslama || simdi(),
        bitis: simdi(),
        yapan_id: g.yapan_id || req.kullanici.id,
        notlar: notlar ? (g.notlar ? g.notlar + ' | ' : '') + notlar : g.notlar,
      });
    if (kontrol) {
      await trx('odalar').where({ id: g.oda_id }).update({ temizlik: 'kontrol' });
    } else {
      await temizYap(trx, g.oda_id, req.kullanici.id);
    }
  });
  gunluk.kaydet(req, 'temizlik_bitir', 'oda:' + g.oda_id, { gorev: id, kontrol });
}

async function kontrolEt(id, req) {
  const g = await gorevOku(id);
  if (g.durum !== 'kontrol') throw new HttpHata(400, 'Bu görev kontrol beklemiyor');
  await db.transaction(async (trx) => {
    await trx('temizlik_gorevleri')
      .where({ id })
      .update({ durum: 'tamam', kontrol_eden_id: req.kullanici.id });
    await temizYap(trx, g.oda_id, req.kullanici.id);
  });
  gunluk.kaydet(req, 'temizlik_kontrol', 'oda:' + g.oda_id, { gorev: id });
}

// Oda panelinden doğrudan durum değiştirme: açık görevleri de uygun duruma getirir
async function odaDurumAyarla(odaId, durum, req, notlar) {
  const oda = await db('odalar').where({ id: odaId }).first();
  if (!oda) throw new HttpHata(404, 'Oda bulunamadı');
  await db.transaction(async (trx) => {
    const acik = await acikGorev(trx, odaId);
    if (durum === 'temiz') {
      if (acik) {
        await trx('temizlik_gorevleri')
          .where({ id: acik.id })
          .update({
            durum: 'tamam',
            baslama: acik.baslama || simdi(),
            bitis: simdi(),
            yapan_id: acik.yapan_id || req.kullanici.id,
            notlar: notlar || acik.notlar,
          });
      }
      await temizYap(trx, odaId, req.kullanici.id);
    } else if (durum === 'kirli') {
      await trx('odalar').where({ id: odaId }).update({ temizlik: 'kirli' });
      await olayKaydet(
        trx,
        odaId,
        'temizlik',
        req.kullanici.id,
        'kirli' + (notlar ? ': ' + notlar : '')
      );
      if (acik && acik.durum === 'yapiliyor')
        await trx('temizlik_gorevleri')
          .where({ id: acik.id })
          .update({ durum: 'bekliyor', baslama: null });
      if (!acik) await gorevAc(trx, odaId, 'ekstra', notlar);
    } else if (durum === 'temizleniyor') {
      await trx('odalar').where({ id: odaId }).update({ temizlik: 'temizleniyor' });
      if (acik && acik.durum === 'bekliyor') {
        await trx('temizlik_gorevleri')
          .where({ id: acik.id })
          .update({ durum: 'yapiliyor', baslama: simdi(), yapan_id: req.kullanici.id });
      } else if (!acik) {
        const id = await gorevAc(trx, odaId, 'ekstra', notlar);
        await trx('temizlik_gorevleri')
          .where({ id })
          .update({ durum: 'yapiliyor', baslama: simdi(), yapan_id: req.kullanici.id });
      }
    }
  });
  gunluk.kaydet(req, 'oda_temizlik', 'oda:' + odaId, { durum });
}

// Dolu odalara günlük temizlik görevi
async function gunlukGorevleriAc(req) {
  const dolu = await db('konaklamalar').where({ durum: 'konakliyor' }).distinct('oda_id');
  let acilan = 0;
  await db.transaction(async (trx) => {
    for (const s of dolu) {
      const mevcut = await acikGorev(trx, s.oda_id);
      if (mevcut) continue;
      await gorevAc(trx, s.oda_id, 'gunluk');
      acilan += 1;
    }
  });
  gunluk.kaydet(req, 'temizlik_gunluk', 'odalar', { acilan });
  return acilan;
}

module.exports = {
  ACIK,
  acikGorev,
  gorevAc,
  odaKirliYap,
  basla,
  bitir,
  kontrolEt,
  odaDurumAyarla,
  gunlukGorevleriAc,
};
