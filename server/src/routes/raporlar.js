const express = require('express');
const db = require('../db/knex');
const tesis = require('../services/tesis');
const konuk = require('../services/konuk');
const { coz } = require('../services/kripto');
const { HttpHata } = require('../middleware/hata');
const { sar } = require('../utils/async');
const { bugun } = require('../utils/tarih');

const router = express.Router();

// Günlük konaklayan listesi: o gün tesiste bulunan herkes.
// Karakol isterse tam TC ile yazdırılır (yalnızca yönetici).
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

module.exports = router;
