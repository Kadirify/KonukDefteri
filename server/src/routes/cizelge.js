const express = require('express');
const db = require('../db/knex');
const tesis = require('../services/tesis');
const { odaSirala } = require('../services/oda');
const { HttpHata } = require('../middleware/hata');
const { sar } = require('../utils/async');
const { bugun, gunEkle, simdi, tarihten } = require('../utils/tarih');

const router = express.Router();

// GET /api/cizelge?gun=YYYY-MM-DD&gorunum=gun|hafta|ay
// Odalar kat kat; bloklar: konaklama, gunubirlik, temizlik, bakim, rezervasyon
// Ay görünümü rezervasyon tahtası için: verilen günün ayı baştan sona, temizlik blokları yok
router.get(
  '/',
  sar(async (req, res) => {
    const gun = String(req.query.gun || bugun());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(gun)) throw new HttpHata(400, 'Tarih biçimi YYYY-AA-GG olmalı');
    const gorunum = ['hafta', 'ay'].includes(req.query.gorunum) ? req.query.gorunum : 'gun';
    let baslangic = `${gun} 00:00`;
    let bitis = gunEkle(baslangic, gorunum === 'hafta' ? 7 : 1);
    if (gorunum === 'ay') {
      baslangic = `${gun.slice(0, 7)}-01 00:00`;
      const d = tarihten(baslangic);
      d.setMonth(d.getMonth() + 1);
      bitis = simdi(d);
    }
    const gizli = req.kullanici.rol === 'kat_gorevlisi';
    const an = simdi();
    const ayarlar = await tesis.ayarlar();

    const odalar = (
      await db('odalar')
        .leftJoin('katlar', 'katlar.id', 'odalar.kat_id')
        .select('odalar.*', 'katlar.ad as kat_ad', 'katlar.sira as kat_sira')
    ).sort(odaSirala);

    const katlar = [];
    odalar.forEach((o) => {
      let kat = katlar.find((k) => k.id === (o.kat_id || 0));
      if (!kat) {
        kat = { id: o.kat_id || 0, ad: o.kat_ad || 'Kat yok', odalar: [] };
        katlar.push(kat);
      }
      kat.odalar.push({
        id: o.id,
        odaNo: o.oda_no,
        tur: o.tur,
        kapasite: o.kapasite,
        temizlik: o.temizlik,
        kullanim: o.kullanim,
      });
    });

    const [segmentler, gorevler, olaylar, rezervasyonlar] = await Promise.all([
      db('konaklama_odalari')
        .join('konaklamalar', 'konaklamalar.id', 'konaklama_odalari.konaklama_id')
        .join('konuklar', 'konuklar.id', 'konaklamalar.konuk_id')
        .where('konaklama_odalari.baslangic', '<', bitis)
        .where((w) => {
          w.whereNull('konaklama_odalari.bitis').orWhere('konaklama_odalari.bitis', '>', baslangic);
        })
        .select(
          'konaklama_odalari.id',
          'konaklama_odalari.oda_id',
          'konaklama_odalari.baslangic',
          'konaklama_odalari.bitis',
          'konaklamalar.id as konaklama_id',
          'konaklamalar.tur',
          'konaklamalar.planlanan_cikis',
          'konaklamalar.kisi_sayisi',
          'konaklamalar.grup_kodu',
          'konuklar.ad',
          'konuklar.soyad'
        ),
      gorunum === 'ay'
        ? []
        : db('temizlik_gorevleri')
            .where((w) => {
              w.where('temizlik_gorevleri.olusturma', '<', bitis);
            })
            .where((w) => {
              w.whereNull('bitis').orWhere('bitis', '>', baslangic);
            }),
      db('oda_olaylari').whereIn('tur', ['bakim_basladi', 'bakim_bitti']).orderBy(['oda_id', 'id']),
      db('rezervasyonlar')
        .whereIn('durum', ['bekliyor', 'onayli'])
        .whereNotNull('oda_id')
        .where('giris_tarihi', '<', bitis.slice(0, 10))
        .where('cikis_tarihi', '>', baslangic.slice(0, 10)),
    ]);

    const bloklar = [];
    segmentler.forEach((s) => {
      bloklar.push({
        tur: s.tur === 'gunubirlik' ? 'gunubirlik' : 'konaklama',
        odaId: s.oda_id,
        baslangic: s.baslangic,
        bitis: s.bitis || (s.planlanan_cikis && s.planlanan_cikis > an ? s.planlanan_cikis : an),
        acik: !s.bitis,
        etiket: gizli
          ? 'dolu'
          : `${s.ad} ${s.soyad}` + (s.kisi_sayisi > 1 ? ` +${s.kisi_sayisi - 1}` : ''),
        konaklamaId: s.konaklama_id,
        grupKodu: s.grup_kodu || '',
      });
    });
    gorevler.forEach((g) => {
      const b = g.baslama || g.olusturma;
      bloklar.push({
        tur: 'temizlik',
        odaId: g.oda_id,
        baslangic: b,
        bitis: g.bitis || (g.durum === 'bekliyor' ? b : an),
        acik: !g.bitis,
        etiket:
          g.durum === 'bekliyor'
            ? 'temizlik bekliyor'
            : g.durum === 'yapiliyor'
            ? 'temizleniyor'
            : 'temizlik',
        durum: g.durum,
      });
    });
    // bakım blokları: başladı -> bitti çiftleri
    const acikBakim = {};
    olaylar.forEach((o) => {
      if (o.tur === 'bakim_basladi') {
        acikBakim[o.oda_id] = o;
      } else if (acikBakim[o.oda_id]) {
        const b = acikBakim[o.oda_id];
        if (b.zaman < bitis && o.zaman > baslangic) {
          bloklar.push({
            tur: 'bakim',
            odaId: o.oda_id,
            baslangic: b.zaman,
            bitis: o.zaman,
            etiket: 'bakım' + (b.notlar ? ': ' + b.notlar : ''),
          });
        }
        delete acikBakim[o.oda_id];
      }
    });
    Object.values(acikBakim).forEach((b) => {
      if (b.zaman < bitis) {
        bloklar.push({
          tur: 'bakim',
          odaId: b.oda_id,
          baslangic: b.zaman,
          bitis: bitis,
          acik: true,
          etiket: 'bakım' + (b.notlar ? ': ' + b.notlar : ''),
        });
      }
    });
    rezervasyonlar.forEach((r) => {
      bloklar.push({
        tur: 'rezervasyon',
        odaId: r.oda_id,
        baslangic: `${r.giris_tarihi} ${ayarlar.giris_saati || '14:00'}`,
        bitis: `${r.cikis_tarihi} ${ayarlar.cikis_saati || '11:00'}`,
        etiket: gizli ? 'rezerve' : `${r.ad_soyad || 'rezervasyon'} - ${r.kaynak}`,
        rezervasyonId: r.id,
      });
    });

    res.json({ gun, gorunum, baslangic, bitis, an, katlar, bloklar });
  })
);

module.exports = router;
