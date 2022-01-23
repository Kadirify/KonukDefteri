const manuel = require('./manuel');
const jandarma = require('./jandarma');

// TODO egm: resmi web servis dokümanı elimde yok, şimdilik manuel moda düşüyor
function surucu(mod) {
  if (mod === 'jandarma') return jandarma;
  return manuel;
}

// manuel: durum 'manuel' (elle girilecek), diğerleri 'bekliyor' (kuyruk gönderir)
async function bildirimOlustur(trx, konaklamaId, tur, mod) {
  const [id] = await trx('kbs_bildirimler').insert({
    konaklama_id: konaklamaId,
    tur,
    durum: mod === 'manuel' ? 'manuel' : 'bekliyor',
    mod,
  });
  return id;
}

module.exports = { surucu, bildirimOlustur };
