const https = require('https');
const soap = require('soap');

// Jandarma KBS Tesis web servisi. Metot adları "KBS Tesis 2 Web Servis Tanım
// Dokümanı"ndan; istek alan adları karakoldan gelen dokümanla karşılaştırılacak.
// Geliştirmede server/mock/kbs-sunucu.js aynı adlarla cevap veriyor.

// Şubat 2023: sunucu TLS 1.3 el sıkışmasında bağlantıyı kesmeye başladı, 1.2'ye sabitlendi
const ajan = new https.Agent({ minVersion: 'TLSv1.2', maxVersion: 'TLSv1.2', keepAlive: true });

let istemci = null;
let istemciWsdl = '';

const metotlar = {
  giris: ['MusteriKimlikNoGiris', 'MusteriYabanciGiris'],
  cikis: ['MusteriKimlikNoCikis', 'MusteriYabanciCikis'],
  guncelle: ['MusteriKimlikNoGuncelle', 'MusteriYabanciGuncelle'],
};

async function istemciAl(wsdl) {
  if (!istemci || istemciWsdl !== wsdl) {
    istemci = await soap.createClientAsync(wsdl, {
      wsdl_options: { timeout: 10000, httpsAgent: ajan },
    });
    istemciWsdl = wsdl;
  }
  return istemci;
}

function sifirla() {
  istemci = null;
  istemciWsdl = '';
}

function istekHazirla(baglanti, a) {
  const ortak = {
    TesisKodu: baglanti.tesisKodu,
    KullaniciTc: baglanti.kullanici,
    Sifre: baglanti.sifre,
    OdaNo: a.odaNo,
    Tarih: a.tur === 'cikis' ? a.cikisZamani : a.girisZamani,
    Plaka: a.plaka || '',
  };
  const k = a.konuk;
  if (k.kimlikTuru === 'tc') {
    return { ...ortak, TcKimlikNo: k.tc };
  }
  return {
    ...ortak,
    PasaportNo: k.pasaportNo,
    Uyruk: k.uyruk,
    Ad: k.ad,
    Soyad: k.soyad,
    BabaAdi: k.babaAdi || '',
    AnneAdi: k.anneAdi || '',
    DogumTarihi: k.dogumTarihi || '',
    DogumYeri: k.dogumYeri || '',
    Cinsiyet: k.cinsiyet || '',
  };
}

function kontrol(baglanti) {
  if (!baglanti.wsdl) throw new Error('KBS servis adresi (WSDL) tanımlı değil');
  if (!/^[0-9]{6}$/.test(baglanti.tesisKodu)) throw new Error('Tesis kodu 6 haneli olmalı');
  if (!baglanti.kullanici || !baglanti.sifre) throw new Error('KBS kullanıcı ya da şifre eksik');
}

async function gonder(baglanti, alanlar) {
  kontrol(baglanti);
  const c = await istemciAl(baglanti.wsdl);
  const [tcMetot, yabanciMetot] = metotlar[alanlar.tur];
  const metot = alanlar.konuk.kimlikTuru === 'tc' ? tcMetot : yabanciMetot;
  if (typeof c[metot + 'Async'] !== 'function') {
    throw new Error('Serviste ' + metot + ' metodu bulunamadı');
  }
  let sonuc;
  try {
    [sonuc] = await c[metot + 'Async'](istekHazirla(baglanti, alanlar), { httpsAgent: ajan });
  } catch (e) {
    sifirla(); // bağlantı koptuysa bir sonraki denemede yeniden kurulsun
    throw new Error('Servise ulaşılamadı: ' + (e.message || e));
  }
  const cevap = (sonuc && (sonuc[metot + 'Result'] || sonuc.return)) || sonuc || {};
  const basarili = cevap.Basarili === true || cevap.Basarili === 'true';
  if (!basarili) {
    throw new Error(cevap.Mesaj || 'Servis olumsuz yanıt verdi');
  }
  return { ref: String(cevap.Referans || ''), mesaj: cevap.Mesaj || '' };
}

async function test(baglanti) {
  kontrol(baglanti);
  sifirla();
  const c = await istemciAl(baglanti.wsdl);
  const tanim = c.describe();
  const adlar = [];
  Object.values(tanim).forEach((servis) => {
    Object.values(servis).forEach((port) => {
      adlar.push(...Object.keys(port));
    });
  });
  const eksik = Object.values(metotlar)
    .flat()
    .filter((m) => !adlar.includes(m));
  if (eksik.length) {
    return { tamam: false, mesaj: 'Serviste eksik metot: ' + eksik.join(', ') };
  }
  return { tamam: true, mesaj: 'Servis yanıt verdi, ' + adlar.length + ' metot tanımlı.' };
}

module.exports = { ad: 'jandarma', gonder, test };
