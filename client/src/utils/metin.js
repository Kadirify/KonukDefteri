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

export const ISLEM = {
  giris: 'Oturum açtı',
  parola_degistir: 'Parolasını değiştirdi',
  tesis_guncelle: 'Tesis ayarlarını güncelledi',
  kullanici_ekle: 'Kullanıcı ekledi',
  kullanici_duzenle: 'Kullanıcı düzenledi',
  ayar_guncelle: 'Ayarları güncelledi',
  oda_ekle: 'Oda ekledi',
  oda_duzenle: 'Oda düzenledi',
  konuk_ekle: 'Konuk kartı açtı',
  konuk_duzenle: 'Konuk kartını düzenledi',
  tc_goruntule: 'TC numarasını görüntüledi',
  giris_kaydi: 'Giriş kaydı yaptı',
  cikis_kaydi: 'Çıkış kaydı yaptı',
  oda_degisikligi: 'Oda değiştirdi',
  bildirim_tekrar: 'Bildirimi yeniden gönderdi',
  bildirim_manuel: 'Bildirimi portala girdi olarak işaretledi',
  kbs_test: 'KBS bağlantı testi yaptı',
  kesinti_tutanagi: 'Kesinti tutanağı oluşturdu',
  gunluk_liste_tam: 'Günlük listeyi tam TC ile aldı',
};

export function islemMetni(kod) {
  return ISLEM[kod] || kod;
}

export function konukAdi(k) {
  return [k.ad, k.soyad].filter(Boolean).join(' ');
}

export function kimlikMetni(k) {
  if (!k) return '';
  if (k.kimlikTuru === 'pasaport') return `${k.pasaportNo} (${k.uyruk})`;
  return k.tcMaskeli || '';
}
