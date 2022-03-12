const express = require('express');
const db = require('../db/knex');
const tesis = require('../services/tesis');
const { sar } = require('../utils/async');
const { bugun, simdi } = require('../utils/tarih');

const router = express.Router();

router.get(
  '/',
  sar(async (req, res) => {
    const gun = bugun();
    const an = simdi();
    const [
      giris,
      cikis,
      konaklayan,
      odaToplam,
      odaDolu,
      bildirimler,
      sonIslemler,
      t,
      cikacak,
      geciken,
      odaDurumlari,
      gelecek,
      temizlikAcik,
    ] = await Promise.all([
      db('konaklamalar').where('giris_zamani', 'like', `${gun}%`).count('id as n').first(),
      db('konaklamalar').where('cikis_zamani', 'like', `${gun}%`).count('id as n').first(),
      db('konaklamalar').where({ durum: 'konakliyor' }).count('id as n').first(),
      db('odalar').where({ kullanim: 'kullanimda', tur: 'oda' }).count('id as n').first(),
      db('konaklamalar').where({ durum: 'konakliyor' }).countDistinct('oda_id as n').first(),
      db('kbs_bildirimler').select('durum').count('id as n').groupBy('durum'),
      db('islem_gunlugu')
        .leftJoin('kullanicilar', 'kullanicilar.id', 'islem_gunlugu.kullanici_id')
        .select('islem_gunlugu.*', 'kullanicilar.ad_soyad')
        .orderBy('islem_gunlugu.id', 'desc')
        .limit(12),
      tesis.oku(),
      db('konaklamalar')
        .where({ durum: 'konakliyor' })
        .where('planlanan_cikis', 'like', `${gun}%`)
        .countDistinct('oda_id as n')
        .first(),
      db('konaklamalar')
        .where({ durum: 'konakliyor' })
        .where('planlanan_cikis', '<', an)
        .countDistinct('oda_id as n')
        .first(),
      db('odalar')
        .where({ tur: 'oda' })
        .select('temizlik', 'kullanim')
        .count('id as n')
        .groupBy('temizlik', 'kullanim'),
      db('rezervasyonlar')
        .leftJoin('odalar', 'odalar.id', 'rezervasyonlar.oda_id')
        .where('rezervasyonlar.giris_tarihi', gun)
        .whereIn('rezervasyonlar.durum', ['bekliyor', 'onayli'])
        .select('rezervasyonlar.*', 'odalar.oda_no')
        .orderBy('rezervasyonlar.id'),
      db('temizlik_gorevleri')
        .whereIn('durum', ['bekliyor', 'yapiliyor', 'kontrol'])
        .count('id as n')
        .first(),
    ]);
    const bugunTahsilat = await db('tahsilatlar')
      .where('tarih', 'like', `${gun}%`)
      .sum('tutar as t')
      .first();
    // TODO: açık hesap başına 2 sorgu, çok hesap olunca yavaşlar; tek sorguya çekilecek
    const acikHesaplar = await db('hesaplar').where({ durum: 'acik' }).select('id');
    let acikBorc = 0;
    for (const h of acikHesaplar) {
      const k = await db('hesap_kalemleri').where({ hesap_id: h.id }).sum('tutar as t').first();
      const ta = await db('tahsilatlar').where({ hesap_id: h.id }).sum('tutar as t').first();
      acikBorc += Number(k.t || 0) - Number(ta.t || 0);
    }
    const say = {};
    bildirimler.forEach((b) => {
      say[b.durum] = Number(b.n);
    });
    const oda = { kirli: 0, temizleniyor: 0, kontrol: 0, bakimda: 0, kapali: 0 };
    odaDurumlari.forEach((d) => {
      if (d.kullanim === 'bakimda') oda.bakimda += Number(d.n);
      else if (d.kullanim === 'kapali') oda.kapali += Number(d.n);
      else if (oda[d.temizlik] !== undefined) oda[d.temizlik] += Number(d.n);
    });
    res.json({
      tarih: gun,
      tesisAdi: t.ad || '',
      bugunGiris: Number(giris.n),
      bugunCikis: Number(cikis.n),
      konaklayan: Number(konaklayan.n),
      odaToplam: Number(odaToplam.n),
      odaDolu: Number(odaDolu.n),
      bugunCikacak: Number(cikacak.n),
      gecikenCikis: Number(geciken.n),
      oda,
      temizlikAcik: Number(temizlikAcik.n),
      bekleyen: (say.bekliyor || 0) + (say.manuel || 0),
      hatali: say.hata || 0,
      kbsMod: t.kbs_mod || 'manuel',
      bugunTahsilat: Math.round(Number(bugunTahsilat.t || 0) * 100) / 100,
      acikBorc: Math.round(acikBorc * 100) / 100,
      bugunGelecek: gelecek.map((r) => ({
        id: r.id,
        adSoyad: r.ad_soyad || '',
        odaNo: r.oda_no || '',
        kisiSayisi: r.kisi_sayisi,
        kaynak: r.kaynak,
        cikisTarihi: r.cikis_tarihi,
      })),
      sonIslemler: sonIslemler.map((i) => ({
        id: i.id,
        kullanici: i.ad_soyad || 'sistem',
        islem: i.islem,
        hedef: i.hedef,
        zaman: i.zaman,
      })),
    });
  })
);

module.exports = router;
