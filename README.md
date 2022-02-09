# KonukDefteri

Pansiyon ve apart için konaklayan kaydı ve KBS kimlik bildirimi.

1774 sayılı kanun gereği konaklayan herkesin kimliği aynı gün Emniyet'in ya da Jandarma'nın Kimlik Bildirim Sistemi'ne (KBS) bildiriliyor. Küçük pansiyonlarda bu iş resepsiyondaki defter ve akşam KBS sayfasına tek tek giriş demek; unutulan konuk, yanlış yazılan TC, sistem çökünce ne yapılacağının bilinmemesi. Bu program o defterin yerine geçsin diye yazıldı: konuk kartı bir kere açılır, giriş çıkış kaydedilir, bildirim kendiliğinden kuyruğa düşer ve gider. KBS'ye ulaşılamıyorsa bildirim bekler, servis açılınca sırayla gönderilir.

Tek bilgisayarda çalışır (Node.js + SQLite), aynı ağdaki tablet ya da ikinci bilgisayar tarayıcıdan bağlanır. Veri dışarı çıkmaz; internet yalnızca KBS'ye gönderim için lazım.

## Neler yapıyor

- Konuk kartı: TC kimlik ya da pasaport. TC numarası veritabanında şifreli durur (AES-256-GCM), ekranda son 4 hanesi görünür; tamamını yalnızca yönetici açar.
- Giriş, çıkış, oda değişimi. Aile ya da grup tek işlemde girer.
- KBS bildirimi: her giriş, çıkış ve oda değişimi bir bildirim satırı üretir. Jandarma bölgesinde web servisiyle otomatik gönderim; Emniyet bölgesinde manuel mod: portala girilecek alanlar kopyalanmaya hazır gelir, girildikten sonra "bildirildi" işaretlenir. Hangi konuğu bildirdim, hangisini unuttum sorusu böylece kalmıyor.
- Kuyruk: gönderilemeyen bildirim bekler, iki dakikada bir yeniden denenir, hata mesajı satırda görünür. KBS'nin çalışmadığı aralık için kesinti tutanağı yazdırılır.
- Raporlar: günlük konaklayan listesi (karakolun istediği biçimde, yazdırılır), aylık giriş çıkış özeti, uyruk dağılımı.
- Kullanıcılar: yönetici ve resepsiyon.

## Kurulum

Gereken: Windows 10 ya da 11 (Linux'ta da çalışıyor), Node.js 16 ve biraz boş alan. Jandarma web servisi kullanılacaksa internet ve karakola bildirilmiş sabit IP.

```bash
git clone https://github.com/Kadirify/KonukDefteri.git
cd KonukDefteri
npm run kur
copy .env.example .env
npm run anahtar
```

`npm run anahtar` iki satır üretir (`JWT_GIZLI` ve `SIFRE_ANAHTARI`), bunları `.env` içine yapıştırın. `SIFRE_ANAHTARI` kaybolursa kayıtlı TC numaraları bir daha okunamaz, bir yere not edin.

Çalıştırmak için:

```bash
npm run build
npm start
```

Tarayıcıdan `http://localhost:3001` açılır. Aynı ağdaki cihazlar için sunucu açılışta kendi adresini yazar . Bilgisayar her açıldığında kendiliğinden başlasın isterseniz Görev Zamanlayıcı ve NSSM ile servis olarak çalıştırma [docs/kurulum.md](docs/kurulum.md) içinde.

İlk kullanıcı `yonetici`, parolası `.env` içindeki `YONETICI_PAROLA`. İlk girişte parolayı değiştirmeniz istenir. Ayarlar > Tesis ve KBS'den tesis adı, karakolun verdiği 6 haneli tesis kodu ve bağlı olunan birim girilir; Ayarlar > Kullanıcılar'dan resepsiyon için ayrı kullanıcı açın.

## KBS bağlantısı

| | Emniyet (belediye sınırı içi) | Jandarma (köy, yayla, kırsal) |
|---|---|---|
| Portal | kbs.egm.gov.tr | Jandarma KBS |
| Programdan gönderim | Manuel mod | Web servisi ile |
| Gereken | Tesis kodu ve kullanıcı | Tesis kodu, web servis yetkili kullanıcı (TC) ve şifresi, karakola bildirilmiş sabit IP |

Jandarma web servisi için karakoldan tesis kodu alınır, KBS'de web servis yetkisi olan bir kullanıcı tanımlanır ve o kullanıcı için IP tanımı yapılır. Bilgiler Ayarlar > Tesis ve KBS'ye girilir, "Bağlantı testi" ile denenir. Servis adresi (WSDL) `.env` içinde ya da ayarlardan verilir.

Manuel modda program yine her olay için bildirim satırı üretir; satırdaki "Alanlar" düğmesi portala girilecek bilgileri kopyalanabilir şekilde gösterir, giriş yapıldıktan sonra "Bildirildi" ile kapatılır.

Geliştirirken gerçek servise gerek yok: `npm run mock:kbs` aynı metot adlarıyla cevap veren sahte bir Jandarma servisi açar (şifre `123456`, `MOCK_KAPALI=1` ile "sistem bakımda" davranışı).

## Teknik

```
server/   Express 4, knex + sqlite3, joi, jsonwebtoken (httpOnly cookie), winston, node-cron, soap
client/   Vite 2, React 17, react-router 6, react-hook-form, axios. UI kiti yok, CSS elle yazıldı.
```

- Tek SQLite dosyası, migration'lar açılışta kendiliğinden çalışır.
- KBS sürücüleri `server/src/services/kbs/` altında: `manuel.js` ve `jandarma.js` (SOAP). Emniyet için bir gün servis açılırsa aynı `gonder` / `test` arayüzüyle eklenir.
- Testler jest + supertest: `npm test`.
- Geliştirme: `npm run dev` ile API (3001) ve Vite (3000) birlikte, `/api` proxy ile.

## Plan

- [ ] oda haritası ve temizlik durumu
- [ ] rezervasyon
- [ ] işlem günlüğü (kim ne zaman ne yaptı)
- [ ] fiyat ve hesap
- [ ] yedekleme
