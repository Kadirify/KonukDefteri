# Kurulum notları

## Windows'ta servis olarak çalıştırma

Resepsiyon bilgisayarı açılınca program da açılsın istiyorsanız iki yol var.

### Görev Zamanlayıcı

1. `npm run build` ile arayüzü bir kez derleyin.
2. Görev Zamanlayıcı > Görev Oluştur. Tetikleyici: "Oturum açıldığında". Eylem: program `node.exe`, bağımsız değişken `server\src\index.js`, başlangıç klasörü projenin klasörü.
3. "Kullanıcı oturum açmış olsun ya da olmasın çalıştır" seçilebilir; o zaman pencere görünmez.

### NSSM

```
nssm install KonukDefteri "C:\Program Files\nodejs\node.exe" "D:\konukdefteri\server\src\index.js"
nssm set KonukDefteri AppDirectory D:\konukdefteri
nssm set KonukDefteri AppStdout D:\konukdefteri\server\data\log\servis.log
nssm set KonukDefteri AppStderr D:\konukdefteri\server\data\log\servis.log
nssm start KonukDefteri
```

`.env` dosyası proje kökünde olmalı; servis onu oradan okur.

## Yerel ağdan erişim

Sunucu `0.0.0.0` üzerinde dinler. Tablet ya da ikinci bilgisayar `http://<sunucu-ip>:3001` adresine girer.
Sunucu bilgisayara sabit yerel IP verin (modem arayüzünden DHCP rezervasyonu), yoksa adres değişince tablet bağlanamaz.

## Jandarma web servisi için sabit IP

KBS web servisi yalnızca tesisin bildirdiği IP'den gelen isteği kabul eder. İnternet sağlayıcıdan statik IP alınır (çoğu sağlayıcıda aylık küçük bir ücret), karakoldaki KBS sorumlusuna bildirilir ve KBS sayfasından web servis kullanıcısına IP tanımı yapılır. IP değişirse bildirimler "yetkisiz IP" hatasıyla kuyrukta bekler; IP yeniden tanımlanınca kendiliğinden gider.

## Yedekleme

Veritabanı tek dosya: `server/data/konukdefteri.sqlite`. Program kapalıyken kopyalamak yeterli. Harici diske ya da başka bilgisayara düzenli kopyalayın; `.env` dosyasını da yedekleyin, içindeki `SIFRE_ANAHTARI` olmadan TC numaraları çözülemez.

## Sorun giderme

- Açılışta ".env dosyasında eksik ya da hatalı ayar" diyorsa `npm run anahtar` çıktısı `.env` içine yapıştırılmamıştır.
- "Sunucuya ulaşılamıyor" çıkıyorsa API kapalıdır; `npm start` penceresine ya da `server/data/log/sunucu.log` son satırlarına bakın.
- Giriş ekranı 10 dakika bekleyin diyorsa aynı adresten 10 hatalı deneme yapılmıştır, beklemek gerekiyor.
- KBS "Servise ulaşılamadı" diyorsa internet, WSDL adresi ve sabit IP kontrol edilir; Ayarlar > Tesis ve KBS > Bağlantı testi.
