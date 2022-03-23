const express = require('express');
const db = require('../db/knex');
const { yetki } = require('../middleware/auth');
const { sar } = require('../utils/async');

const router = express.Router();
router.use(yetki('yonetici'));

const SAYFA_BOYU = 50;
const gunDeseni = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/gunluk?q=&islem=&kullanici=&baslangic=&bitis=&sayfa=1
// Kim ne zaman ne yaptı; en yeni üstte, 50'şer sayfa
router.get(
  '/',
  sar(async (req, res) => {
    const sayfa = Math.max(1, Number(req.query.sayfa) || 1);
    const q = String(req.query.q || '').trim();
    const islem = String(req.query.islem || '').trim();
    const kullanici = Number(req.query.kullanici) || 0;
    const baslangic = String(req.query.baslangic || '');
    const bitis = String(req.query.bitis || '');

    const suz = (s) => {
      if (islem) s.where('islem_gunlugu.islem', islem);
      if (kullanici) s.where('islem_gunlugu.kullanici_id', kullanici);
      if (gunDeseni.test(baslangic)) s.where('islem_gunlugu.zaman', '>=', `${baslangic} 00:00`);
      if (gunDeseni.test(bitis)) s.where('islem_gunlugu.zaman', '<=', `${bitis} 23:59`);
      if (q) {
        s.where((w) => {
          w.where('islem_gunlugu.hedef', 'like', `%${q}%`).orWhere(
            'islem_gunlugu.ayrinti',
            'like',
            `%${q}%`
          );
        });
      }
      return s;
    };

    const [toplam, satirlar, islemler] = await Promise.all([
      suz(db('islem_gunlugu')).count('id as n').first(),
      suz(db('islem_gunlugu'))
        .leftJoin('kullanicilar', 'kullanicilar.id', 'islem_gunlugu.kullanici_id')
        .select('islem_gunlugu.*', 'kullanicilar.ad_soyad')
        .orderBy('islem_gunlugu.id', 'desc')
        .limit(SAYFA_BOYU)
        .offset((sayfa - 1) * SAYFA_BOYU),
      db('islem_gunlugu').distinct('islem').orderBy('islem'),
    ]);

    res.json({
      sayfa,
      sayfaBoyu: SAYFA_BOYU,
      toplam: Number(toplam.n),
      islemler: islemler.map((r) => r.islem),
      satirlar: satirlar.map((i) => ({
        id: i.id,
        kullaniciId: i.kullanici_id,
        kullanici: i.ad_soyad || 'sistem',
        islem: i.islem,
        hedef: i.hedef,
        ayrinti: i.ayrinti,
        zaman: i.zaman,
      })),
    });
  })
);

module.exports = router;
