// .env için rastgele anahtar üretir. Çıktıyı .env'e yapıştırın.
const crypto = require('crypto');

console.log('Aşağıdaki satırları .env dosyanıza yazın:\n');
console.log('JWT_GIZLI=' + crypto.randomBytes(32).toString('base64'));
console.log('SIFRE_ANAHTARI=' + crypto.randomBytes(32).toString('hex'));
console.log('\nSIFRE_ANAHTARI kaybolursa kayıtlı TC numaraları okunamaz; bir yere not edin.');
