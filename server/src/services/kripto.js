const crypto = require('crypto');
const { config } = require('../config');

// TC kimlik numaraları veritabanında açık durmasın diye AES-256-GCM.
// Anahtar .env'deki SIFRE_ANAHTARI. Anahtar değişirse eski kayıtlar çözülemez.

function anahtar() {
  return Buffer.from(config.sifreAnahtari, 'hex');
}

function sifrele(metin) {
  if (!metin) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', anahtar(), iv);
  const sifreli = Buffer.concat([cipher.update(String(metin), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), sifreli.toString('base64')].join('.');
}

function coz(paket) {
  if (!paket) return null;
  const [iv, tag, veri] = paket.split('.').map((p) => Buffer.from(p, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', anahtar(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(veri), decipher.final()]).toString('utf8');
}

// Aynı TC'yi aramak için deterministik özet (HMAC). Düz SHA256 olsaydı
// 11 haneli sayılar kolayca denenebilirdi.
function ozet(metin) {
  return crypto.createHmac('sha256', anahtar()).update(String(metin)).digest('hex');
}

module.exports = { sifrele, coz, ozet };
