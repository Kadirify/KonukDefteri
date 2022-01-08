// Sunucudaki biçim: "YYYY-MM-DD HH:mm". Ekranda "28.02.2022 14:05".

function iki(n) {
  return String(n).padStart(2, '0');
}

export function simdiYerel(d = new Date()) {
  return (
    `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())} ` +
    `${iki(d.getHours())}:${iki(d.getMinutes())}`
  );
}

export function bugunYerel() {
  return simdiYerel().slice(0, 10);
}

export function buAy() {
  return simdiYerel().slice(0, 7);
}

export function trTarih(s) {
  if (!s) return '';
  const [gun, saat] = String(s).split(' ');
  const [y, a, g] = gun.split('-');
  if (!y || !a || !g) return s;
  return saat ? `${g}.${a}.${y} ${saat}` : `${g}.${a}.${y}`;
}

export function trGun(s) {
  return trTarih(String(s || '').slice(0, 10));
}

// <input type="datetime-local"> değeri "YYYY-MM-DDTHH:mm"
export function girisDegerine(s) {
  return s ? String(s).replace(' ', 'T').slice(0, 16) : '';
}

export function girisDegerinden(v) {
  return v ? String(v).replace('T', ' ').slice(0, 16) : '';
}

// "YYYY-MM-DD HH:mm" -> Date (yerel)
export function tarihten(s) {
  if (!s) return null;
  const [gun, saat] = String(s).split(' ');
  const [y, a, g] = gun.split('-').map(Number);
  const [sa, dk] = (saat || '00:00').split(':').map(Number);
  return new Date(y, a - 1, g, sa, dk, 0, 0);
}

export function saatDakika(s) {
  return s ? String(s).slice(11, 16) : '';
}

// "3 saat", "2 gün" gibi kabaca ne kadar oldu
export function neKadarOldu(s) {
  const d = tarihten(s);
  if (!d) return '';
  const dk = Math.round((Date.now() - d.getTime()) / 60000);
  if (dk < 60) return `${Math.max(dk, 0)} dk`;
  if (dk < 48 * 60) return `${Math.round(dk / 60)} saat`;
  return `${Math.round(dk / 1440)} gün`;
}

export function saatEkleYerel(s, saat) {
  const d = tarihten(s);
  d.setMinutes(d.getMinutes() + Math.round(saat * 60));
  return simdiYerel(d);
}

export function gunEkleYerel(s, gun) {
  const d = tarihten(s.length === 10 ? s + ' 00:00' : s);
  d.setDate(d.getDate() + gun);
  return simdiYerel(d);
}

// Çizelgede bir bloğun yatay konumu (yüzde)
export function konumYuzde(bas, bit, aralikBas, aralikBit) {
  const a = tarihten(aralikBas).getTime();
  const b = tarihten(aralikBit).getTime();
  const x1 = Math.max(tarihten(bas).getTime(), a);
  const x2 = Math.min(tarihten(bit).getTime(), b);
  if (x2 <= x1) return null;
  return { sol: ((x1 - a) / (b - a)) * 100, genislik: ((x2 - x1) / (b - a)) * 100 };
}

// 2022-02-28 -> gün sayısı farkı (bugüne göre)
export function kacGun(s) {
  if (!s) return 0;
  const [y, a, g] = String(s).slice(0, 10).split('-').map(Number);
  const o = new Date(y, a - 1, g);
  const simdi = new Date();
  simdi.setHours(0, 0, 0, 0);
  return Math.round((simdi - o) / 86400000);
}
