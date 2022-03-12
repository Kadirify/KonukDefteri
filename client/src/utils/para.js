export function tl(n) {
  const sayi = Number(n || 0);
  return (
    sayi.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL'
  );
}

export function sayiOku(s) {
  if (s === '' || s === null || s === undefined) return 0;
  return Number(String(s).replace(',', '.')) || 0;
}
