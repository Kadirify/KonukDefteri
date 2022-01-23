const db = require('../../db/knex');
const { coz } = require('../kripto');
const { HttpHata } = require('../../middleware/hata');

// jandarma sürücüsü de manuel moddaki "alanları göster" ekranı da buradan besleniyor
async function bildirimAlanlari(bildirimId) {
  const b = await db('kbs_bildirimler').where({ id: bildirimId }).first();
  if (!b) throw new HttpHata(404, 'Bildirim bulunamadı');
  const s = await db('konaklamalar')
    .join('konuklar', 'konuklar.id', 'konaklamalar.konuk_id')
    .join('odalar', 'odalar.id', 'konaklamalar.oda_id')
    .where('konaklamalar.id', b.konaklama_id)
    .select('konaklamalar.*', 'odalar.oda_no', 'konuklar.*', 'konaklamalar.id as konaklama_id')
    .first();
  if (!s) throw new HttpHata(404, 'Konaklama bulunamadı');
  const tesis = (await db('tesis').first()) || {};

  return {
    bildirimId: b.id,
    tur: b.tur,
    durum: b.durum,
    tesisKodu: tesis.tesis_kodu || '',
    tesisAdi: tesis.ad || '',
    konaklamaId: s.konaklama_id,
    odaNo: s.oda_no,
    girisZamani: s.giris_zamani,
    cikisZamani: s.cikis_zamani || '',
    plaka: s.plaka || '',
    konuk: {
      kimlikTuru: s.kimlik_turu,
      tc: s.kimlik_turu === 'tc' && s.tc_sifreli ? coz(s.tc_sifreli) : '',
      pasaportNo: s.pasaport_no || '',
      uyruk: s.uyruk,
      ad: s.ad,
      soyad: s.soyad,
      babaAdi: s.baba_adi || '',
      anneAdi: s.anne_adi || '',
      dogumTarihi: s.dogum_tarihi || '',
      dogumYeri: s.dogum_yeri || '',
      cinsiyet: s.cinsiyet || '',
    },
  };
}

module.exports = { bildirimAlanlari };
