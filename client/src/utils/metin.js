export const ROL = {
  yonetici: 'Yönetici',
  resepsiyon: 'Resepsiyon',
};

export function konukAdi(k) {
  return [k.ad, k.soyad].filter(Boolean).join(' ');
}

export function kimlikMetni(k) {
  if (!k) return '';
  if (k.kimlikTuru === 'pasaport') return `${k.pasaportNo} (${k.uyruk})`;
  return k.tcMaskeli || '';
}
