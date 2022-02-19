const db = require('../db/knex');
const log = require('../log');
const { simdi } = require('../utils/tarih');

// İşlem günlüğü: kim, ne yaptı. Silme yok, yalnızca ekleme.
async function kaydet(req, islem, hedef, ayrinti) {
  try {
    await db('islem_gunlugu').insert({
      kullanici_id: req && req.kullanici ? req.kullanici.id : null,
      islem,
      hedef: hedef || '',
      ayrinti: ayrinti ? JSON.stringify(ayrinti) : '',
      zaman: simdi(),
    });
  } catch (e) {
    // günlük yazılamadı diye asıl işlem bozulmasın
    log.warn('İşlem günlüğü yazılamadı: ' + e.message);
  }
}

module.exports = { kaydet };
