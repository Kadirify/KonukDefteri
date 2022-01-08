// Testlerde yerel tarih (toISOString UTC verir, gece yarısı civarı gün kayar)
function yerelGun(fark = 0) {
  const d = new Date();
  d.setDate(d.getDate() + fark);
  const iki = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())}`;
}

module.exports = { yerelGun };
