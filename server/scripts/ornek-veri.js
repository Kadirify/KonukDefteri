// Deneme ve ekran görüntüsü için örnek veri. Boş bir veritabanına çalıştırın:
//   npm run ornek
// Var olan kayıtlara dokunmaz; oda ya da konuk varsa çıkar.

const path = require('path');
const { kontrol } = require(path.join(__dirname, '..', 'src', 'config'));

kontrol();

const db = require('../src/db/knex');
const konuk = require('../src/services/konuk');
const { simdi } = require('../src/utils/tarih');

// Sağlama hanesi tutan rastgele TC
function tcUret() {
  const h = [];
  h.push(1 + Math.floor(Math.random() * 9));
  for (let i = 1; i < 9; i++) h.push(Math.floor(Math.random() * 10));
  const tekler = h[0] + h[2] + h[4] + h[6] + h[8];
  const ciftler = h[1] + h[3] + h[5] + h[7];
  h.push((((tekler * 7 - ciftler) % 10) + 10) % 10);
  h.push(h.reduce((a, b) => a + b, 0) % 10);
  return h.join('');
}

function gunOnce(n, saat) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const [s, dk] = (saat || '14:00').split(':');
  d.setHours(Number(s), Number(dk), 0, 0);
  return simdi(d);
}

function gun(fark) {
  return gunOnce(-fark, '00:00').slice(0, 10);
}

// [kat adı, koridor]
const katlar = [
  ['2. Kat', 'orta'],
  ['1. Kat', 'orta'],
  ['Zemin', 'yok'],
];

// [oda no, kat, tip, kapasite, özellikler, tür]
const odalar = [
  ['201', '2. Kat', 'Çift kişilik', 2, 'balkon, deniz manzarası'],
  ['202', '2. Kat', 'Aile', 3, 'balkon'],
  ['203', '2. Kat', 'Çift kişilik', 2, 'deniz manzarası'],
  ['204', '2. Kat', 'Tek kişilik', 1, ''],
  ['101', '1. Kat', 'Çift kişilik', 2, 'bahçe'],
  ['102', '1. Kat', 'Çift kişilik', 2, ''],
  ['103', '1. Kat', 'Aile', 4, 'bahçe, mutfak'],
  ['104', '1. Kat', 'Tek kişilik', 1, ''],
  ['Z1', 'Zemin', 'Engelli erişimli', 2, 'zemin, geniş kapı'],
  ['Resepsiyon', 'Zemin', '', 1, '', 'ortak'],
  ['Kahvaltı', 'Zemin', '', 1, '', 'ortak'],
];

const konuklar = [
  {
    ad: 'Ayşe',
    soyad: 'Kaya',
    dogumTarihi: '1988-03-12',
    dogumYeri: 'İzmir',
    cinsiyet: 'K',
    telefon: '0532 417 28 93',
  },
  {
    ad: 'Mehmet',
    soyad: 'Kaya',
    dogumTarihi: '1985-07-30',
    dogumYeri: 'Manisa',
    cinsiyet: 'E',
    telefon: '0532 417 28 94',
  },
  { ad: 'Elif', soyad: 'Kaya', dogumTarihi: '2015-11-02', dogumYeri: 'İzmir', cinsiyet: 'K' },
  {
    ad: 'Can',
    soyad: 'Demir',
    dogumTarihi: '1994-01-20',
    dogumYeri: 'Ankara',
    cinsiyet: 'E',
    telefon: '0505 263 71 15',
  },
  { ad: 'Zeynep', soyad: 'Arslan', dogumTarihi: '1979-09-09', dogumYeri: 'Bursa', cinsiyet: 'K' },
  {
    ad: 'Hasan',
    soyad: 'Yıldız',
    dogumTarihi: '1962-05-15',
    dogumYeri: 'Muğla',
    cinsiyet: 'E',
    telefon: '0542 836 40 27',
  },
  { ad: 'Selin', soyad: 'Öztürk', dogumTarihi: '1999-12-24', dogumYeri: 'İstanbul', cinsiyet: 'K' },
  {
    kimlikTuru: 'pasaport',
    pasaportNo: 'C4KH7N2X1',
    uyruk: 'DEU',
    ad: 'Julia',
    soyad: 'Weber',
    dogumTarihi: '1991-04-18',
    dogumYeri: 'Hamburg',
    cinsiyet: 'K',
  },
  {
    kimlikTuru: 'pasaport',
    pasaportNo: '517366082',
    uyruk: 'GBR',
    ad: 'Thomas',
    soyad: 'Hill',
    dogumTarihi: '1976-08-03',
    dogumYeri: 'Leeds',
    cinsiyet: 'E',
  },
  {
    kimlikTuru: 'pasaport',
    pasaportNo: '72 4061938',
    uyruk: 'RUS',
    ad: 'Anna',
    soyad: 'Petrova',
    dogumTarihi: '1989-02-11',
    dogumYeri: 'Kazan',
    cinsiyet: 'K',
  },
];

async function calistir() {
  await db.migrate.latest();
  await db.seed.run();

  const odaVar = await db('odalar').first();
  const konukVar = await db('konuklar').first();
  if (odaVar || konukVar) {
    console.log('Veritabanında kayıt var, örnek veri eklenmedi.');
    return;
  }

  await db('tesis').update({
    ad: 'Deniz Pansiyon',
    tesis_kodu: '481027',
    bolge: 'jandarma',
    il: 'Muğla',
    ilce: 'Datça',
    adres: 'İskele Mah. Liman Cad. No: 12',
    telefon: '0252 712 36 48',
    kbs_mod: 'manuel',
    guncelleme: simdi(),
  });

  const katIdleri = {};
  for (let i = 0; i < katlar.length; i++) {
    const [ad, koridor] = katlar[i];
    const [id] = await db('katlar').insert({ ad, koridor, sira: i });
    katIdleri[ad] = id;
  }

  const odaIdleri = {};
  const siraSayac = {};
  for (const [odaNo, katAd, tip, kapasite, ozellikler, tur] of odalar) {
    siraSayac[katAd] = (siraSayac[katAd] || 0) + 1;
    const [id] = await db('odalar').insert({
      oda_no: odaNo,
      kat: katAd,
      kat_id: katIdleri[katAd],
      sira: siraSayac[katAd],
      tip,
      kapasite,
      ozellikler,
      tur: tur || 'oda',
    });
    odaIdleri[odaNo] = id;
  }

  const konukIdleri = [];
  for (const k of konuklar) {
    const veri = { kimlikTuru: 'tc', uyruk: 'TUR', kvkkOnay: true, ...k };
    if (veri.kimlikTuru === 'tc') veri.tc = tcUret();
    konukIdleri.push(await konuk.olustur(veri));
  }

  // [konuk sırası, oda, giriş kaç gün önce, çıkış kaç gün önce (null = içeride), bildirim durumu, grup, planlanan çıkış kaç gün sonra]
  const konaklamalar = [
    [0, '103', 1, null, 'gonderildi', 'AILE01', 2],
    [1, '103', 1, null, 'gonderildi', 'AILE01', 2],
    [2, '103', 1, null, 'manuel', 'AILE01', 2],
    [3, '203', 2, null, 'gonderildi', null, 1],
    [7, '201', 1, null, 'hata', null, -1],
    [8, '104', 3, null, 'gonderildi', null, 3],
    [4, '101', 9, 6, 'gonderildi'],
    [5, '202', 12, 8, 'gonderildi'],
    [6, '102', 5, 0, 'gonderildi'],
    [9, '204', 20, 15, 'gonderildi'],
  ];

  for (const [ki, odaNo, girisGun, cikisGun, durum, grup, planGun] of konaklamalar) {
    const giris = gunOnce(girisGun, '14:00');
    const cikis = cikisGun === null ? null : gunOnce(cikisGun, '11:00');
    const planlanan = cikis || (planGun !== undefined ? gunOnce(-planGun, '11:00') : null);
    const [konaklamaId] = await db('konaklamalar').insert({
      konuk_id: konukIdleri[ki],
      oda_id: odaIdleri[odaNo],
      grup_kodu: grup || null,
      giris_zamani: giris,
      cikis_zamani: cikis,
      planlanan_cikis: planlanan,
      kisi_sayisi: grup ? 3 : 1,
      plaka: ki === 3 ? '06 ABC 123' : '',
      durum: cikis ? 'ayrildi' : 'konakliyor',
      olusturan: 1,
    });
    await db('konaklama_odalari').insert({
      konaklama_id: konaklamaId,
      oda_id: odaIdleri[odaNo],
      baslangic: giris,
      bitis: cikis,
    });
    await db('kbs_bildirimler').insert({
      konaklama_id: konaklamaId,
      tur: 'giris',
      durum,
      mod: durum === 'hata' ? 'jandarma' : 'manuel',
      deneme: durum === 'hata' ? 3 : 1,
      son_hata: durum === 'hata' ? 'Servise ulaşılamadı: connect ECONNREFUSED' : null,
      gonderim_zamani: durum === 'gonderildi' ? giris : null,
      yanit_ref: durum === 'gonderildi' ? 'J' + (1000 + konaklamaId) : '',
    });
    if (cikis) {
      await db('kbs_bildirimler').insert({
        konaklama_id: konaklamaId,
        tur: 'cikis',
        durum: 'gonderildi',
        mod: 'manuel',
        deneme: 1,
        gonderim_zamani: cikis,
        yanit_ref: 'J' + (2000 + konaklamaId),
      });
    }
  }

  // Günübirlik kullanım: 204 bugün 13:00-17:00 Zeynep Arslan (ayrıldı)
  const [gunubirlikId] = await db('konaklamalar').insert({
    konuk_id: konukIdleri[4],
    oda_id: odaIdleri['204'],
    giris_zamani: gunOnce(0, '13:00'),
    cikis_zamani: gunOnce(0, '17:00'),
    planlanan_cikis: gunOnce(0, '17:00'),
    tur: 'gunubirlik',
    durum: 'ayrildi',
    olusturan: 1,
  });
  await db('konaklama_odalari').insert({
    konaklama_id: gunubirlikId,
    oda_id: odaIdleri['204'],
    baslangic: gunOnce(0, '13:00'),
    bitis: gunOnce(0, '17:00'),
  });
  await db('kbs_bildirimler').insert([
    {
      konaklama_id: gunubirlikId,
      tur: 'giris',
      durum: 'gonderildi',
      mod: 'manuel',
      deneme: 1,
      gonderim_zamani: gunOnce(0, '13:05'),
      yanit_ref: 'J3001',
    },
    {
      konaklama_id: gunubirlikId,
      tur: 'cikis',
      durum: 'gonderildi',
      mod: 'manuel',
      deneme: 1,
      gonderim_zamani: gunOnce(0, '17:02'),
      yanit_ref: 'J3002',
    },
  ]);

  // Temizlik durumları: 102 bugün çıktı -> kirli, görev bekliyor; 204 temizleniyor; 101 temiz
  await db('odalar').where({ id: odaIdleri['102'] }).update({ temizlik: 'kirli' });
  await db('temizlik_gorevleri').insert({
    oda_id: odaIdleri['102'],
    tur: 'cikis',
    durum: 'bekliyor',
    olusturma: gunOnce(0, '11:05'),
  });
  await db('odalar').where({ id: odaIdleri['204'] }).update({ temizlik: 'temizleniyor' });
  await db('temizlik_gorevleri').insert({
    oda_id: odaIdleri['204'],
    tur: 'cikis',
    durum: 'yapiliyor',
    olusturma: gunOnce(0, '17:05'),
    baslama: gunOnce(0, '17:20'),
    yapan_id: 1,
  });
  // Toplu insert'te eksik alan NULL gider, NOT NULL sütunları tek tek yazmak gerekiyor
  await db('temizlik_gorevleri').insert([
    {
      oda_id: odaIdleri['101'],
      tur: 'cikis',
      durum: 'tamam',
      olusturma: gunOnce(6, '11:10'),
      baslama: gunOnce(6, '11:30'),
      bitis: gunOnce(6, '12:05'),
      yapan_id: 1,
      notlar: '',
    },
    {
      oda_id: odaIdleri['202'],
      tur: 'cikis',
      durum: 'tamam',
      olusturma: gunOnce(8, '11:00'),
      baslama: gunOnce(8, '12:00'),
      bitis: gunOnce(8, '12:40'),
      yapan_id: 1,
      notlar: '',
    },
  ]);
  await db('odalar')
    .where({ id: odaIdleri['101'] })
    .update({ son_temizlik: gunOnce(6, '12:05') });
  await db('odalar')
    .where({ id: odaIdleri['202'] })
    .update({ son_temizlik: gunOnce(8, '12:40') });

  // Bakımda oda: Z1 klima arızası
  await db('odalar')
    .where({ id: odaIdleri.Z1 })
    .update({
      kullanim: 'bakimda',
      aktif: false,
      bakim_notu: 'Klima arızası, servis bekleniyor',
      bakim_bitis: gun(2),
    });
  await db('oda_olaylari').insert({
    oda_id: odaIdleri.Z1,
    tur: 'bakim_basladi',
    zaman: gunOnce(1, '09:30'),
    kullanici_id: 1,
    notlar: 'Klima arızası, servis bekleniyor',
  });

  // Rezervasyonlar
  await db('rezervasyonlar').insert([
    {
      ad_soyad: 'Demir Ailesi',
      telefon: '0533 745 19 60',
      oda_id: odaIdleri['202'],
      giris_tarihi: gun(0),
      cikis_tarihi: gun(3),
      kisi_sayisi: 3,
      durum: 'onayli',
      kaynak: 'booking',
      notlar: 'Geç geliş, 22:00 civarı',
      olusturan: 1,
    },
    {
      konuk_id: konukIdleri[5],
      ad_soyad: '',
      telefon: '',
      oda_id: odaIdleri['102'],
      giris_tarihi: gun(1),
      cikis_tarihi: gun(4),
      kisi_sayisi: 1,
      durum: 'onayli',
      kaynak: 'telefon',
      notlar: '',
      olusturan: 1,
    },
    {
      ad_soyad: 'Laura Bianchi',
      telefon: '+39 333 418 2276',
      oda_id: odaIdleri['201'],
      giris_tarihi: gun(2),
      cikis_tarihi: gun(6),
      kisi_sayisi: 2,
      durum: 'bekliyor',
      kaynak: 'airbnb',
      notlar: '',
      olusturan: 1,
    },
    {
      ad_soyad: 'Okan Çetin',
      telefon: '0544 208 53 77',
      oda_id: null,
      giris_tarihi: gun(5),
      cikis_tarihi: gun(7),
      kisi_sayisi: 2,
      durum: 'onayli',
      kaynak: 'kapidan',
      notlar: 'Oda henüz atanmadı',
      olusturan: 1,
    },
  ]);

  await db('kesintiler').insert({
    tutanak_no: 'KT-' + new Date().getFullYear() + '-001',
    baslangic: gunOnce(4, '09:00'),
    bitis: gunOnce(4, '17:30'),
    neden: 'KBS portalı gün boyu açılmadı, 444 0 425 arandı.',
    olusturan: 1,
  });

  await db('islem_gunlugu').insert([
    {
      kullanici_id: 1,
      islem: 'giris_kaydi',
      hedef: 'konaklama:1,2,3',
      ayrinti: '{"oda":"103","kisi":3}',
      zaman: gunOnce(1, '14:05'),
    },
    {
      kullanici_id: 1,
      islem: 'giris_kaydi',
      hedef: 'konaklama:5',
      ayrinti: '{"oda":"201","kisi":1}',
      zaman: gunOnce(1, '19:40'),
    },
    {
      kullanici_id: 1,
      islem: 'cikis_kaydi',
      hedef: 'konaklama:9',
      ayrinti: '',
      zaman: gunOnce(0, '11:05'),
    },
    {
      kullanici_id: 1,
      islem: 'oda_bakima_al',
      hedef: 'oda:' + odaIdleri.Z1,
      ayrinti: '{"not":"Klima arızası"}',
      zaman: gunOnce(1, '09:30'),
    },
  ]);

  console.log(
    `Örnek veri eklendi: ${katlar.length} kat, ${odalar.length} oda, ${konuklar.length} konuk, ${
      konaklamalar.length + 1
    } konaklama, 4 rezervasyon.`
  );
}

calistir()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
