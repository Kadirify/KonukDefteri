// TC kimlik numarası sağlama kontrolü. NVİ sorgusu yok, sadece biçim.
function tcknGecerli(tc) {
  if (!/^[1-9][0-9]{10}$/.test(tc || '')) return false;
  const h = String(tc).split('').map(Number);
  const tekler = h[0] + h[2] + h[4] + h[6] + h[8];
  const ciftler = h[1] + h[3] + h[5] + h[7];
  const onuncu = (((tekler * 7 - ciftler) % 10) + 10) % 10;
  if (onuncu !== h[9]) return false;
  const toplam = h.slice(0, 10).reduce((a, b) => a + b, 0);
  return toplam % 10 === h[10];
}

module.exports = { tcknGecerli };
