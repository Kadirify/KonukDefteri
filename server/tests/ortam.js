const os = require('os');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.JWT_GIZLI = 'test-icin-uzun-bir-gizli-metin-1234';
process.env.SIFRE_ANAHTARI = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.YONETICI_PAROLA = 'test1234';
// Her test dosyası kendi veritabanını kullansın (aynı süreçte sırayla koşuyorlar)
process.env.VERI_KLASORU = path.join(
  os.tmpdir(),
  'konukdefteri-test-' + process.pid + '-' + Math.random().toString(36).slice(2, 8)
);
