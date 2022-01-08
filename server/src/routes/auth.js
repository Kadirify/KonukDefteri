const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const db = require('../db/knex');
const { config } = require('../config');
const { oturum } = require('../middleware/auth');
const { dogrula } = require('../middleware/dogrula');
const { HttpHata } = require('../middleware/hata');
const { sar } = require('../utils/async');
const { simdi } = require('../utils/tarih');

const router = express.Router();

const girisSemasi = Joi.object({
  kullaniciAdi: Joi.string().trim().lowercase().min(3).max(40).required(),
  parola: Joi.string().min(4).max(100).required(),
});

const parolaSemasi = Joi.object({
  eskiParola: Joi.string().required(),
  yeniParola: Joi.string().min(8).max(100).required(),
});

function tokenUret(k) {
  return jwt.sign({ id: k.id, rol: k.rol, adSoyad: k.ad_soyad }, config.jwtGizli, {
    expiresIn: config.tokenSuresi,
  });
}

function cerez() {
  // Yerel ağda http çalışıyor, secure açılamıyor
  return { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 12 * 60 * 60 * 1000 };
}

function dto(k) {
  return {
    id: k.id,
    adSoyad: k.ad_soyad,
    kullaniciAdi: k.kullanici_adi,
    rol: k.rol,
    ilkParola: !!k.ilk_parola,
  };
}

router.post(
  '/giris',
  dogrula(girisSemasi),
  sar(async (req, res) => {
    const { kullaniciAdi, parola } = req.body;
    const k = await db('kullanicilar').where({ kullanici_adi: kullaniciAdi }).first();
    if (!k || !k.aktif || !bcrypt.compareSync(parola, k.parola_hash)) {
      throw new HttpHata(401, 'Kullanıcı adı ya da parola hatalı');
    }
    await db('kullanicilar').where({ id: k.id }).update({ son_giris: simdi() });
    res.cookie('kd_token', tokenUret(k), cerez());
    req.kullanici = { id: k.id };
    res.json(dto(k));
  })
);

router.post('/cikis', (req, res) => {
  res.clearCookie('kd_token');
  res.json({ tamam: true });
});

router.get(
  '/ben',
  oturum,
  sar(async (req, res) => {
    const k = await db('kullanicilar').where({ id: req.kullanici.id }).first();
    if (!k || !k.aktif) {
      res.clearCookie('kd_token');
      return res.status(401).json({ hata: 'Kullanıcı bulunamadı' });
    }
    return res.json(dto(k));
  })
);

router.put(
  '/parola',
  oturum,
  dogrula(parolaSemasi),
  sar(async (req, res) => {
    const k = await db('kullanicilar').where({ id: req.kullanici.id }).first();
    if (!bcrypt.compareSync(req.body.eskiParola, k.parola_hash)) {
      throw new HttpHata(400, 'Mevcut parola hatalı', { eskiParola: 'Mevcut parola hatalı' });
    }
    await db('kullanicilar')
      .where({ id: k.id })
      .update({ parola_hash: bcrypt.hashSync(req.body.yeniParola, 10), ilk_parola: false });
    res.json({ tamam: true });
  })
);

module.exports = router;
