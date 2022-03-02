const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const db = require('../db/knex');
const { yetki } = require('../middleware/auth');
const { dogrula } = require('../middleware/dogrula');
const { HttpHata } = require('../middleware/hata');
const { sar } = require('../utils/async');
const gunluk = require('../services/gunluk');

const router = express.Router();
router.use(yetki('yonetici'));

const yeniSema = Joi.object({
  adSoyad: Joi.string().trim().min(2).max(80).required(),
  kullaniciAdi: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9._-]{3,40}$/)
    .required(),
  parola: Joi.string().min(8).max(100).required(),
  rol: Joi.string().valid('yonetici', 'resepsiyon', 'kat_gorevlisi').required(),
});

const duzenleSema = Joi.object({
  adSoyad: Joi.string().trim().min(2).max(80).required(),
  rol: Joi.string().valid('yonetici', 'resepsiyon', 'kat_gorevlisi').required(),
  aktif: Joi.boolean().required(),
  parola: Joi.string().min(8).max(100).allow(''),
});

function dto(k) {
  return {
    id: k.id,
    adSoyad: k.ad_soyad,
    kullaniciAdi: k.kullanici_adi,
    rol: k.rol,
    aktif: !!k.aktif,
    sonGiris: k.son_giris || null,
  };
}

router.get(
  '/',
  sar(async (req, res) => {
    const liste = await db('kullanicilar').orderBy('ad_soyad');
    res.json(liste.map(dto));
  })
);

router.post(
  '/',
  dogrula(yeniSema),
  sar(async (req, res) => {
    const b = req.body;
    const var_ = await db('kullanicilar').where({ kullanici_adi: b.kullaniciAdi }).first();
    if (var_)
      throw new HttpHata(409, 'Bu kullanıcı adı kullanılıyor', { kullaniciAdi: 'Kullanılıyor' });
    const [id] = await db('kullanicilar').insert({
      ad_soyad: b.adSoyad,
      kullanici_adi: b.kullaniciAdi,
      parola_hash: bcrypt.hashSync(b.parola, 10),
      rol: b.rol,
      ilk_parola: true,
    });
    gunluk.kaydet(req, 'kullanici_ekle', 'kullanici:' + id, { rol: b.rol });
    const k = await db('kullanicilar').where({ id }).first();
    res.status(201).json(dto(k));
  })
);

router.put(
  '/:id',
  dogrula(duzenleSema),
  sar(async (req, res) => {
    const id = Number(req.params.id);
    const k = await db('kullanicilar').where({ id }).first();
    if (!k) throw new HttpHata(404, 'Kullanıcı bulunamadı');
    const b = req.body;
    if (id === req.kullanici.id && (!b.aktif || b.rol !== 'yonetici')) {
      throw new HttpHata(400, 'Kendi hesabınızı pasifleştiremez ya da yetkinizi düşüremezsiniz');
    }
    const veri = { ad_soyad: b.adSoyad, rol: b.rol, aktif: b.aktif };
    if (b.parola) {
      veri.parola_hash = bcrypt.hashSync(b.parola, 10);
      veri.ilk_parola = true;
    }
    await db('kullanicilar').where({ id }).update(veri);
    gunluk.kaydet(req, 'kullanici_duzenle', 'kullanici:' + id, { rol: b.rol, aktif: b.aktif });
    res.json(dto(await db('kullanicilar').where({ id }).first()));
  })
);

module.exports = router;
