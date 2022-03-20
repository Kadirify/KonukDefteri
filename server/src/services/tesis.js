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
    wsdl: t.kbs_wsdl || config.kbsJandarmaWsdl,
  };
}

// sqlite tek bağlantıyla çalışıyor: bir transaction içindeysen trx'i ver, yoksa kilitlenir
async function ayar(anahtar, varsayilan, baglanti = db) {
  const satir = await baglanti('ayarlar').where({ anahtar }).first();
  return satir ? satir.deger : varsayilan;
}

// Kayıt formunun altına basılan aydınlatma metni; Ayarlar > Genel'den değiştirilebilir
const KVKK_METNI = [
  'Tesisimiz, 1774 sayılı Kimlik Bildirme Kanunu gereği konaklayan her misafirin kimlik ' +
    'bilgilerini kayıt altına almak ve genel kolluk kuvvetlerine (Kimlik Bildirim Sistemi) ' +
    'bildirmekle yükümlüdür.',
  'Bu kapsamda alınan ad, soyad, T.C. kimlik / pasaport numarası, uyruk, doğum tarihi, anne ve ' +
    'baba adı, telefon ve araç plakası bilgileri, 6698 sayılı Kişisel Verilerin Korunması ' +
    'Kanunu\'nun 5. maddesindeki "kanunlarda açıkça öngörülmesi" ve "hukuki yükümlülüğün yerine ' +
    'getirilmesi" şartlarına dayanılarak işlenir.',
  'Kimlik bilgileri yalnızca kolluk kuvvetleriyle, kanunun öngördüğü biçimde paylaşılır; başka ' +
    'bir kişi ya da kurumla paylaşılmaz, pazarlama amacıyla kullanılmaz. Kayıtlar tesisin kayıt ' +
    'sisteminde şifreli olarak saklanır ve yasal saklama süresi dolunca silinir.',
  'Kanunun 11. maddesi uyarınca verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini ya ' +
    'da silinmesini isteme haklarınız vardır; başvurunuzu tesis yönetimine yazılı olarak ' +
    'iletebilirsiniz.',
].join('\n\n');

const VARSAYILAN_AYARLAR = {
  giris_saati: '14:00',
  cikis_saati: '11:00',
  cikista_temizlik: '1',
  temizlik_kontrolu: '0',
  gunubirlik_izinli: '1',
  gunubirlik_saat: '6',
  kuyruk_dakika: '2',
  saklama_yil: '5',
  kvkk_metni: KVKK_METNI,
  yedek_otomatik: '1',
  yedek_saati: '03:00',
  yedek_adet: '14',
  yedek_klasoru: '',
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
