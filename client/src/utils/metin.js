export const BILDIRIM_DURUM = {
  bekliyor: { etiket: 'Bekliyor', tur: 'uyari' },
  manuel: { etiket: 'Portala girilecek', tur: 'uyari' },
  gonderildi: { etiket: 'Gönderildi', tur: 'basari' },
  hata: { etiket: 'Hata', tur: 'hata' },
};

export const BILDIRIM_TUR = {
  giris: 'Giriş',
  cikis: 'Çıkış',
  guncelle: 'Oda değişimi',
};

export const KBS_MOD = {
  manuel: 'Manuel (portala elle giriş)',
  jandarma: 'Jandarma web servisi',
};

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
