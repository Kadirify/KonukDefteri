# KonukDefteri

Pansiyon ve apart için konaklayan kaydı ve KBS kimlik bildirimi.

1774 sayılı kanun gereği konaklayan herkesin kimliği aynı gün Emniyet'in ya da Jandarma'nın Kimlik Bildirim Sistemi'ne (KBS) bildiriliyor. Küçük pansiyonlarda bu iş resepsiyondaki defter ve akşam KBS sayfasına tek tek giriş demek; unutulan konuk, yanlış yazılan TC, sistem çökünce ne yapılacağının bilinmemesi. Bu program o defterin yerine geçsin diye yazılıyor: konuk kartı bir kere açılır, giriş çıkış kaydedilir, bildirim kendiliğinden kuyruğa düşer ve gider. KBS'ye ulaşılamıyorsa bildirim bekler, servis açılınca sırayla gönderilir.

Tek bilgisayarda çalışır (Node.js + SQLite), aynı ağdaki tablet ya da ikinci bilgisayar tarayıcıdan bağlanır. Veri dışarı çıkmaz; internet yalnızca KBS'ye gönderim için lazım.

## Şu an ne yapıyor

- Konuk kartı: TC kimlik ya da pasaport. TC numarası veritabanında şifreli durur, ekranda son 4 hanesi görünür.
- Giriş, çıkış, oda değişimi. Aile ya da grup tek işlemde girer.
- KBS bildirimi: her giriş, çıkış ve oda değişimi bir bildirim satırı üretir. Jandarma bölgesinde web servisiyle otomatik gönderim; Emniyet bölgesinde manuel mod, yani portala girilecek alanlar hazır gelir, girildikten sonra "bildirildi" işaretlenir.
- Kuyruk: gönderilemeyen bildirim bekler, iki dakikada bir yeniden denenir, hata mesajı satırda görünür.
- Kullanıcılar: yönetici ve resepsiyon.

## Kurulum

Node.js 16 gerekiyor.

```bash
git clone https://github.com/Kadirify/KonukDefteri.git
cd KonukDefteri
npm run kur
copy .env.example .env
npm run anahtar
```

`npm run anahtar` iki satır üretir (`JWT_GIZLI` ve `SIFRE_ANAHTARI`), bunları `.env` içine yapıştırın. `SIFRE_ANAHTARI` kaybolursa kayıtlı TC numaraları bir daha okunamaz, bir yere not edin.

Çalıştırmak için `npm run build` ve `npm start`; tarayıcıdan `http://localhost:3001`. Geliştirirken `npm run dev` (API 3001, Vite 3000).

İlk kullanıcı `yonetici`, parolası `.env` içindeki `YONETICI_PAROLA`. İlk girişte parolayı değiştirmeniz istenir. Ayarlar > Tesis ve KBS'den tesis adı, karakolun verdiği 6 haneli tesis kodu ve bağlı olunan birim girilir.

## KBS bağlantısı

| | Emniyet (belediye sınırı içi) | Jandarma (köy, yayla, kırsal) |
|---|---|---|
| Portal | kbs.egm.gov.tr | Jandarma KBS |
| Programdan gönderim | Manuel mod | Web servisi ile |
| Gereken | Tesis kodu ve kullanıcı | Tesis kodu, web servis yetkili kullanıcı (TC) ve şifresi, karakola bildirilmiş sabit IP |

Jandarma web servisi için karakoldan tesis kodu alınır, KBS'de web servis yetkisi olan bir kullanıcı tanımlanır ve o kullanıcı için IP tanımı yapılır. Bilgiler Ayarlar > Tesis ve KBS'ye girilir, "Bağlantı testi" ile denenir.

Geliştirirken gerçek servise gerek yok: `npm run mock:kbs` aynı metot adlarıyla cevap veren sahte bir Jandarma servisi açar (şifre `123456`).

## Plan

- [x] konuk kartı, TC numarası şifreli
- [x] giriş ve çıkış kaydı, oda değişimi
- [x] KBS bildirim kuyruğu, manuel mod
- [x] Jandarma web servisi
- [ ] günlük konaklayan listesi, aylık özet
- [ ] KBS kesinti tutanağı
