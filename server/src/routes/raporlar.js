const express = require('express');
const db = require('../db/knex');
const tesis = require('../services/tesis');
const konuk = require('../services/konuk');
const { coz } = require('../services/kripto');
const { HttpHata } = require('../middleware/hata');
const { sar } = require('../utils/async');
const { bugun } = require('../utils/tarih');
const gunluk = require('../services/gunluk');

const router = express.Router();

// Günlük konaklayan listesi: o gün tesiste bulunan herkes.
// Karakol isterse tam TC ile yazdırılır (yalnızca yönetici, günlüğe düşer).
router.get(
  '/gunluk',
  sar(async (req, res) => {
    const tarih = String(req.query.tarih || bugun());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih))
      throw new HttpHata(400, 'Tarih biçimi YYYY-AA-GG olmalı');
    const tam = req.query.tam === '1' && req.kullanici.rol === 'yonetici';
    const liste = await db('konaklamalar')
      .join('konuklar', 'konuklar.id', 'konaklamalar.konuk_id')
      .join('odalar', 'odalar.id', 'konaklamalar.oda_id')
      .where('konaklamalar.giris_zamani', '<=', `${tarih} 23:59`)
      .where((w) => {
        w.whereNull('konaklamalar.cikis_zamani').orWhere(
          'konaklamalar.cikis_zamani',
          '>=',
          `${tarih} 00:00`
        );
      })
      .select('konaklamalar.*', 'konuklar.*', 'odalar.oda_no', 'konaklamalar.id as id')
      .orderBy('odalar.oda_no');
    if (tam) gunluk.kaydet(req, 'gunluk_liste_tam', 'rapor:' + tarih);
    const t = await tesis.oku();
    res.json({
      tarih,
      tesis: {
        ad: t.ad || '',
        tesisKodu: t.tesis_kodu || '',
        il: t.il || '',
        ilce: t.ilce || '',
        adres: t.adres || '',
      },
      satirlar: liste.map((s) => ({
        id: s.id,
        odaNo: s.oda_no,
        ad: s.ad,
        soyad: s.soyad,
        uyruk: s.uyruk,
        kimlikTuru: s.kimlik_turu,
        kimlikNo:
          s.kimlik_turu === 'tc'
            ? tam && s.tc_sifreli
              ? coz(s.tc_sifreli)
              : konuk.maskele(s.tc_son4)
            : s.pasaport_no,
        dogumTarihi: s.dogum_tarihi || '',
        girisZamani: s.giris_zamani,
        cikisZamani: s.cikis_zamani || '',
        plaka: s.plaka || '',
      })),
    });
  })
);

// Aylık özet: gün gün giriş/çıkış ve bildirim durumu
router.get(
  '/aylik',
  sar(async (req, res) => {
    const ay = String(req.query.ay || bugun().slice(0, 7));
    if (!/^\d{4}-\d{2}$/.test(ay)) throw new HttpHata(400, 'Ay biçimi YYYY-AA olmalı');
    const girisler = await db('konaklamalar')
      .where('giris_zamani', 'like', `${ay}%`)
      .select(db.raw('substr(giris_zamani, 1, 10) as gun'))
      .count('id as n')
      .groupBy('gun');
    const cikislar = await db('konaklamalar')
      .where('cikis_zamani', 'like', `${ay}%`)
      .select(db.raw('substr(cikis_zamani, 1, 10) as gun'))
      .count('id as n')
      .groupBy('gun');
    const bildirimler = await db('kbs_bildirimler')
      .join('konaklamalar', 'konaklamalar.id', 'kbs_bildirimler.konaklama_id')
      .where('konaklamalar.giris_zamani', 'like', `${ay}%`)
      .select('kbs_bildirimler.durum')
      .count('kbs_bildirimler.id as n')
      .groupBy('kbs_bildirimler.durum');
    const uyruklar = await db('konaklamalar')
      .join('konuklar', 'konuklar.id', 'konaklamalar.konuk_id')
      .where('konaklamalar.giris_zamani', 'like', `${ay}%`)
      .select('konuklar.uyruk')
      .count('konaklamalar.id as n')
      .groupBy('konuklar.uyruk')
      .orderBy('n', 'desc');

    const gunler = {};
    girisler.forEach((g) => {
      gunler[g.gun] = { gun: g.gun, giris: Number(g.n), cikis: 0 };
    });
    cikislar.forEach((c) => {
      if (!gunler[c.gun]) gunler[c.gun] = { gun: c.gun, giris: 0, cikis: 0 };
      gunler[c.gun].cikis = Number(c.n);
    });
    const say = {};
    bildirimler.forEach((b) => {
      say[b.durum] = Number(b.n);
    });
    res.json({
      ay,
      gunler: Object.values(gunler).sort((a, b) => a.gun.localeCompare(b.gun)),
      toplamGiris: girisler.reduce((a, g) => a + Number(g.n), 0),
      toplamCikis: cikislar.reduce((a, c) => a + Number(c.n), 0),
      bildirim: {
        gonderildi: say.gonderildi || 0,
        bekleyen: (say.bekliyor || 0) + (say.manuel || 0),
        hata: say.hata || 0,
      },
      uyruklar: uyruklar.map((u) => ({ uyruk: u.uyruk, n: Number(u.n) })),
    });
  })
);

// Aylık doluluk: her gece için kullanımdaki oda sayısı ve dolu oda sayısı
router.get(
  '/doluluk',
  sar(async (req, res) => {
    const ay = String(req.query.ay || bugun().slice(0, 7));
    if (!/^\d{4}-\d{2}$/.test(ay)) throw new HttpHata(400, 'Ay biçimi YYYY-AA olmalı');
    const [yil, aySayi] = ay.split('-').map(Number);
    const gunSayisi = new Date(yil, aySayi, 0).getDate();
    const ayBaslangic = `${ay}-01 00:00`;
    const ayBitis = `${ay}-${String(gunSayisi).padStart(2, '0')} 23:59`;
    const odaSayisi = Number(
      (
        await db('odalar')
          .where({ tur: 'oda' })
          .whereNot({ kullanim: 'kapali' })
          .count('id as n')
          .first()
      ).n
    );
    const segmentler = await db('konaklama_odalari')
      .join('konaklamalar', 'konaklamalar.id', 'konaklama_odalari.konaklama_id')
      .where('konaklama_odalari.baslangic', '<=', ayBitis)
      .where((w) => {
        w.whereNull('konaklama_odalari.bitis').orWhere(
          'konaklama_odalari.bitis',
          '>=',
          ayBaslangic
        );
      })
      .select(
        'konaklama_odalari.oda_id',
        'konaklama_odalari.baslangic',
        'konaklama_odalari.bitis',
        'konaklamalar.tur'
      );

    const gunler = [];
    let toplamDoluGece = 0;
    for (let g = 1; g <= gunSayisi; g++) {
      const gun = `${ay}-${String(g).padStart(2, '0')}`;
      const geceYarisi = `${gun} 23:59`;
      const dolu = new Set();
      segmentler.forEach((s) => {
        if (s.tur === 'gunubirlik') return;
        if (s.baslangic <= geceYarisi && (!s.bitis || s.bitis > geceYarisi)) dolu.add(s.oda_id);
      });
      toplamDoluGece += dolu.size;
      gunler.push({
        gun,
        dolu: dolu.size,
        oran: odaSayisi ? Math.round((dolu.size / odaSayisi) * 100) : 0,
      });
    }

    const ayrilanlar = await db('konaklamalar')
      .where('cikis_zamani', 'like', `${ay}%`)
      .where({ tur: 'gece' })
      .select('giris_zamani', 'cikis_zamani');
    let toplamGece = 0;
    ayrilanlar.forEach((k) => {
      const fark =
        (new Date(k.cikis_zamani.replace(' ', 'T')) - new Date(k.giris_zamani.replace(' ', 'T'))) /
        86400000;
      toplamGece += Math.max(1, Math.round(fark));
    });
    const kaynaklar = await db('rezervasyonlar')
      .where('giris_tarihi', 'like', `${ay}%`)
      .where({ durum: 'geldi' })
      .select('kaynak')
      .count('id as n')
      .groupBy('kaynak')
      .orderBy('n', 'desc');
    const temizlikler = await db('temizlik_gorevleri')
      .where('bitis', 'like', `${ay}%`)
      .whereNotNull('baslama')
      .select('baslama', 'bitis');
    let toplamDakika = 0;
    temizlikler.forEach((t) => {
      toplamDakika += Math.max(
        0,
        (new Date(t.bitis.replace(' ', 'T')) - new Date(t.baslama.replace(' ', 'T'))) / 60000
      );
    });
    const gunubirlik = Number(
      (
        await db('konaklamalar')
          .where('giris_zamani', 'like', `${ay}%`)
          .where({ tur: 'gunubirlik' })
          .count('id as n')
          .first()
      ).n
    );

    res.json({
      ay,
      odaSayisi,
      gunler,
      dolulukOrani: odaSayisi ? Math.round((toplamDoluGece / (odaSayisi * gunSayisi)) * 100) : 0,
      ortalamaKalis: ayrilanlar.length ? Math.round((toplamGece / ayrilanlar.length) * 10) / 10 : 0,
      gunubirlik,
      kaynaklar: kaynaklar.map((k) => ({ kaynak: k.kaynak, n: Number(k.n) })),
      temizlik: {
        gorev: temizlikler.length,
        ortalamaDakika: temizlikler.length ? Math.round(toplamDakika / temizlikler.length) : 0,
      },
    });
  })
);

module.exports = router;
