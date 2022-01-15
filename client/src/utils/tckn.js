export function tcknGecerli(tc) {
  if (!/^[0-9]{11}$/.test(tc || '')) return false;
  const h = String(tc).split('').map(Number);
  const toplam = h.slice(0, 10).reduce((a, b) => a + b, 0);
  return toplam % 10 === h[10];
}
