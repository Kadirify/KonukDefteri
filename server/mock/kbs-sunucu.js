// Geliştirme için sahte Jandarma KBS servisi. Gerçek servisin WSDL'i ve alan
// adları karakoldan gelen dokümana göre; burası aynı metot adlarıyla cevap verir.
//
//   npm run mock:kbs            -> http://localhost:3002/kbs?wsdl
//   MOCK_SIFRE=123456           -> kabul edilen şifre
//   MOCK_HATA_ORANI=0.3         -> isteklerin %30'unu hata ile döndürür (kuyruk denemesi için)
//   MOCK_KAPALI=1               -> her isteğe "sistem bakımda" der

const http = require('http');
const soap = require('soap');
const { tcknGecerli } = require('../src/utils/tckn');

const PORT = Number(process.env.MOCK_PORT) || 3002;
const SIFRE = process.env.MOCK_SIFRE || '123456';
const HATA_ORANI = Number(process.env.MOCK_HATA_ORANI) || 0;
const KAPALI = process.env.MOCK_KAPALI === '1';
const NS = 'http://kbs.mock/tesis';

const ortakAlanlar = ['TesisKodu', 'KullaniciTc', 'Sifre', 'OdaNo', 'Tarih', 'Plaka'];
const tcAlanlar = ['TcKimlikNo'];
const yabanciAlanlar = [
  'PasaportNo',
  'Uyruk',
  'Ad',
  'Soyad',
  'BabaAdi',
  'AnneAdi',
  'DogumTarihi',
  'DogumYeri',
  'Cinsiyet',
];

const metotlar = [
  ['MusteriKimlikNoGiris', tcAlanlar],
  ['MusteriKimlikNoCikis', tcAlanlar],
  ['MusteriKimlikNoGuncelle', tcAlanlar],
  ['MusteriYabanciGiris', yabanciAlanlar],
  ['MusteriYabanciCikis', yabanciAlanlar],
  ['MusteriYabanciGuncelle', yabanciAlanlar],
];

function eleman(ad, alanlar) {
  const satirlar = alanlar
    .map((a) => `          <xsd:element name="${a}" type="xsd:string" minOccurs="0"/>`)
    .join('\n');
  return `      <xsd:element name="${ad}">
        <xsd:complexType><xsd:sequence>
${satirlar}
        </xsd:sequence></xsd:complexType>
      </xsd:element>
      <xsd:element name="${ad}Response">
        <xsd:complexType><xsd:sequence>
          <xsd:element name="${ad}Result">
            <xsd:complexType><xsd:sequence>
              <xsd:element name="Basarili" type="xsd:boolean"/>
              <xsd:element name="Mesaj" type="xsd:string"/>
              <xsd:element name="Referans" type="xsd:string"/>
            </xsd:sequence></xsd:complexType>
          </xsd:element>
        </xsd:sequence></xsd:complexType>
      </xsd:element>`;
}

function wsdlUret() {
  const tipler = metotlar
    .map(([ad, alanlar]) => eleman(ad, ortakAlanlar.concat(alanlar)))
    .join('\n');
  const mesajlar = metotlar
    .map(
      ([ad]) => `  <message name="${ad}In"><part name="parameters" element="tns:${ad}"/></message>
  <message name="${ad}Out"><part name="parameters" element="tns:${ad}Response"/></message>`
    )
    .join('\n');
  const portTipi = metotlar
    .map(
      ([ad]) =>
        `    <operation name="${ad}"><input message="tns:${ad}In"/><output message="tns:${ad}Out"/></operation>`
    )
    .join('\n');
  const baglama = metotlar
    .map(
      ([ad]) => `    <operation name="${ad}">
      <soap:operation soapAction="${NS}/${ad}" style="document"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions name="KbsTesis" targetNamespace="${NS}"
  xmlns="http://schemas.xmlsoap.org/wsdl/"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
  xmlns:tns="${NS}"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <types>
    <xsd:schema targetNamespace="${NS}" elementFormDefault="qualified">
${tipler}
    </xsd:schema>
  </types>
${mesajlar}
  <portType name="KbsTesisPort">
${portTipi}
  </portType>
  <binding name="KbsTesisBinding" type="tns:KbsTesisPort">
    <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
${baglama}
  </binding>
  <service name="KbsTesisService">
    <port name="KbsTesisPort" binding="tns:KbsTesisBinding">
      <soap:address location="http://localhost:${PORT}/kbs"/>
    </port>
  </service>
</definitions>`;
}

// Yeniden başlayınca aynı referanslar üretilmesin
let sayac = Math.floor(Date.now() / 1000) % 100000;
const gelenler = [];

function zamanDamgasi() {
  const d = new Date();
  const iki = (n) => String(n).padStart(2, '0');
  return `${iki(d.getDate())}.${iki(d.getMonth() + 1)}.${d.getFullYear()} ${iki(
    d.getHours()
  )}:${iki(d.getMinutes())}:${iki(d.getSeconds())}`;
}

function cevapla(ad, args) {
  const sonuc = (basarili, mesaj, referans) => {
    gelenler.unshift({
      zaman: zamanDamgasi(),
      metot: ad,
      tesis: args.TesisKodu || '',
      oda: args.OdaNo || '',
      kimlik: args.TcKimlikNo
        ? '*******' + String(args.TcKimlikNo).slice(-4)
        : args.PasaportNo || '',
      ad: args.Ad ? `${args.Ad} ${args.Soyad || ''}`.trim() : '',
      tarih: args.Tarih || '',
      sonuc: basarili ? 'kabul' : 'ret',
      mesaj,
      referans: referans || '',
    });
    if (gelenler.length > 500) gelenler.pop();
    return { [ad + 'Result']: { Basarili: basarili, Mesaj: mesaj, Referans: referans || '' } };
  };
  if (KAPALI) return sonuc(false, 'Sistem bakımda, daha sonra tekrar deneyiniz');
  if (HATA_ORANI && Math.random() < HATA_ORANI)
    return sonuc(false, 'Geçici hata, tekrar deneyiniz');
  if (!/^[0-9]{6}$/.test(args.TesisKodu || '')) return sonuc(false, 'Tesis kodu hatalı');
  if (args.Sifre !== SIFRE) return sonuc(false, 'Kullanıcı adı veya şifre hatalı');
  if (!args.OdaNo) return sonuc(false, 'Oda numarası boş olamaz');
  if (ad.indexOf('KimlikNo') > -1 && !tcknGecerli(args.TcKimlikNo))
    return sonuc(false, 'TC kimlik numarası geçersiz');
  if (ad.indexOf('Yabanci') > -1 && !args.PasaportNo)
    return sonuc(false, 'Pasaport numarası boş olamaz');
  sayac += 1;
  console.log(`[mock kbs] ${ad} oda ${args.OdaNo} -> ref J${sayac}`);
  return sonuc(true, 'Kayıt alındı', 'J' + sayac);
}

const servis = { KbsTesisService: { KbsTesisPort: {} } };
metotlar.forEach(([ad]) => {
  servis.KbsTesisService.KbsTesisPort[ad] = (args) => cevapla(ad, args || {});
});

function kacis(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// http://localhost:3002/ -> servise ulaşan bildirimlerin listesi (karşı tarafı görmek için)
function listeSayfasi() {
  const satirlar = gelenler
    .map(
      (g) =>
        `<tr><td>${kacis(g.zaman)}</td><td>${kacis(g.metot)}</td><td>${kacis(
          g.tesis
        )}</td><td>${kacis(g.oda)}</td>` +
        `<td>${kacis(g.kimlik)} ${kacis(g.ad)}</td><td>${kacis(g.tarih)}</td>` +
        `<td class="${g.sonuc}">${g.sonuc === 'kabul' ? 'Kabul' : 'Ret'} - ${kacis(
          g.mesaj
        )}</td><td>${kacis(g.referans)}</td></tr>`
    )
    .join('');
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Sahte KBS - gelen bildirimler</title>
<meta http-equiv="refresh" content="5">
<style>body{font:14px system-ui,sans-serif;margin:24px;color:#1b2430}table{border-collapse:collapse;width:100%}
th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #ddd;font-size:13px}th{background:#eef0f4;font-size:11px;text-transform:uppercase}
.kabul{color:#2e7d5b}.ret{color:#b3372f}p{color:#5f6b7a}</style></head><body>
<h2>Sahte Jandarma KBS - gelen bildirimler</h2>
<p>Bu sayfa gerçek KBS portalındaki "konaklayanlar" listesinin yerine geçer; programın gönderdiği her istek buraya düşer. 5 saniyede bir yenilenir. Kabul edilen şifre: ${kacis(
    SIFRE
  )}.</p>
<table><thead><tr><th>Zaman</th><th>Metot</th><th>Tesis</th><th>Oda</th><th>Kimlik</th><th>Tarih</th><th>Sonuç</th><th>Referans</th></tr></thead>
<tbody>${
    satirlar || '<tr><td colspan="8">Henüz bildirim gelmedi.</td></tr>'
  }</tbody></table></body></html>`;
}

const sunucu = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/gelenler')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(listeSayfasi());
    return;
  }
  if (req.method === 'GET' && req.url === '/gelenler.json') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(gelenler));
    return;
  }
  res.statusCode = 404;
  res.end('KBS mock: /kbs?wsdl ya da / (gelen bildirimler)');
});
sunucu.listen(PORT, () => {
  soap.listen(sunucu, '/kbs', servis, wsdlUret());
  console.log(`Sahte Jandarma KBS servisi: http://localhost:${PORT}/kbs?wsdl (şifre: ${SIFRE})`);
  if (HATA_ORANI) console.log(`Hata oranı: ${HATA_ORANI}`);
  if (KAPALI) console.log('Sistem "bakımda" modunda, her isteğe hata dönecek');
});
