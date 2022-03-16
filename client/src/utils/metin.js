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
  kat_gorevlisi: 'Kat görevlisi',
};

export const TEMIZLIK = {
  temiz: { etiket: 'Temiz', tur: 'basari' },
  kirli: { etiket: 'Kirli', tur: 'uyari' },
  temizleniyor: { etiket: 'Temizleniyor', tur: 'uyari' },
  kontrol: { etiket: 'Kontrol bekliyor', tur: 'bilgi' },
};

export const KULLANIM = {
  kullanimda: 'Kullanımda',
  bakimda: 'Bakımda',
  kapali: 'Kapalı',
};

export const KONAKLAMA_TUR = {
  gece: 'Gece konaklama',
  gunubirlik: 'Günübirlik',
};

export const GOREV_TUR = {
  cikis: 'Çıkış temizliği',
  gunluk: 'Günlük temizlik',
  ekstra: 'Ekstra',
};

export const GOREV_DURUM = {
  bekliyor: { etiket: 'Bekliyor', tur: 'uyari' },
  yapiliyor: { etiket: 'Yapılıyor', tur: 'bilgi' },
  kontrol: { etiket: 'Kontrol bekliyor', tur: 'bilgi' },
  tamam: { etiket: 'Tamam', tur: 'basari' },
};

export const REZ_DURUM = {
  bekliyor: { etiket: 'Bekliyor', tur: 'uyari' },
  onayli: { etiket: 'Onaylı', tur: 'bilgi' },
  geldi: { etiket: 'Geldi', tur: 'basari' },
  iptal: { etiket: 'İptal', tur: 'notr' },
  gelmedi: { etiket: 'Gelmedi', tur: 'hata' },
};

export const YONTEM = {
  nakit: 'Nakit',
  kart: 'Kart',
  havale: 'Havale',
  diger: 'Diğer',
};

export const KALEM_TUR = {
  konaklama: 'Konaklama',
  ekstra: 'Ekstra',
  indirim: 'İndirim',
};

export const REZ_KAYNAK = {
  telefon: 'Telefon',
  booking: 'Booking',
  airbnb: 'Airbnb',
  kapidan: 'Kapıdan',
  diger: 'Diğer',
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
  kayit_formu: 'Kayıt formunu açtı (kimlik numaraları açık)',
  giris_kaydi: 'Giriş kaydı yaptı',
  cikis_kaydi: 'Çıkış kaydı yaptı',
  oda_degisikligi: 'Oda değiştirdi',
  bildirim_tekrar: 'Bildirimi yeniden gönderdi',
  bildirim_manuel: 'Bildirimi portala girdi olarak işaretledi',
  kbs_test: 'KBS bağlantı testi yaptı',
  kesinti_tutanagi: 'Kesinti tutanağı oluşturdu',
  gunluk_liste_tam: 'Günlük listeyi tam TC ile aldı',
  temizlik_basla: 'Temizliğe başladı',
  temizlik_bitir: 'Temizliği bitirdi',
  temizlik_kontrol: 'Temizliği kontrol etti',
  temizlik_gunluk: 'Günlük temizlik görevlerini açtı',
  oda_temizlik: 'Oda temizlik durumunu değiştirdi',
  oda_bakima_al: 'Odayı bakıma aldı',
  oda_bakimdan_cikar: 'Odayı bakımdan çıkardı',
  kat_ekle: 'Kat ekledi',
  kat_duzenle: 'Kat düzenledi',
  kat_sil: 'Kat sildi',
  rezervasyon_ekle: 'Rezervasyon aldı',
  rezervasyon_duzenle: 'Rezervasyon düzenledi',
  rezervasyon_iptal: 'Rezervasyonu iptal etti',
  rezervasyon_gelmedi: 'Rezervasyonu gelmedi olarak kapattı',
  hesap_kalem: 'Hesaba kalem ekledi',
  hesap_kalem_sil: 'Hesaptan kalem sildi',
  hesap_kalem_duzelt: 'Hesap kalemini düzeltti',
  tahsilat: 'Tahsilat aldı',
  tahsilat_sil: 'Tahsilat sildi',
  hesap_kapat: 'Hesabı kapattı',
  hesap_ac: 'Hesabı yeniden açtı',
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
