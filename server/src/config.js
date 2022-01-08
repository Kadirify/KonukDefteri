const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const ortam = process.env.NODE_ENV || 'development';

const config = {
  ortam,
  port: Number(process.env.PORT) || 3001,
  jwtGizli: process.env.JWT_GIZLI || '',
  sifreAnahtari: process.env.SIFRE_ANAHTARI || '',
  veriKlasoru: process.env.VERI_KLASORU || path.join(__dirname, '..', 'data'),
  yoneticiParola: process.env.YONETICI_PAROLA || 'konuk2022',
  tokenSuresi: '8h',
};

// .env eksikse hiç açılmasın
function kontrol() {
  const eksik = [];
  if (!config.jwtGizli || config.jwtGizli.length < 16) {
    eksik.push('JWT_GIZLI (en az 16 karakter)');
  }
  if (!/^[0-9a-f]{64}$/i.test(config.sifreAnahtari)) {
    eksik.push('SIFRE_ANAHTARI (64 haneli hex; "npm run anahtar" ile üretin)');
  }
  if (eksik.length) {
    throw new Error('.env dosyasında eksik ya da hatalı ayar: ' + eksik.join(', '));
  }
}

module.exports = { config, kontrol };
