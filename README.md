# KonukDefteri

Pansiyon ve apart için konaklayan kaydı ve KBS kimlik bildirimi. Şimdilik iskelet.

1774 sayılı kanun gereği konaklayan herkesin kimliği aynı gün Emniyet'in ya da Jandarma'nın Kimlik Bildirim Sistemi'ne (KBS) bildiriliyor. Küçük pansiyonlarda bu iş resepsiyondaki defter ve akşam KBS sayfasına tek tek giriş demek. Bu program o defterin yerine geçsin istiyorum: konuk kartı bir kere açılsın, giriş çıkış kaydedilsin, bildirim kendiliğinden gitsin.

Tek bilgisayarda çalışacak (Node.js + SQLite), aynı ağdaki tablet ya da ikinci bilgisayar tarayıcıdan bağlanacak. Veri dışarı çıkmayacak.

## Çalıştırma

```bash
npm run kur
copy .env.example .env
npm run anahtar
npm run dev
```

`npm run anahtar` iki anahtar üretir, `.env` içine yapıştırın. API 3001, arayüz 3000 portunda.

İlk kullanıcı `yonetici`, parolası `.env` içindeki `YONETICI_PAROLA`.

## Plan

- [ ] konuk kartı, TC numarası şifreli
- [ ] giriş ve çıkış kaydı, oda değişimi
- [ ] KBS bildirim kuyruğu, manuel mod
- [ ] Jandarma web servisi
- [ ] günlük konaklayan listesi
