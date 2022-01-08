const log = require('../log');

class HttpHata extends Error {
  constructor(durum, mesaj, alanlar) {
    super(mesaj);
    this.durum = durum;
    this.alanlar = alanlar;
  }
}

// Joi'nin İngilizce mesajları yerine
const joiMesajlari = {
  'any.required': 'Zorunlu alan',
  'any.only': 'Geçersiz değer',
  'string.empty': 'Boş bırakılamaz',
  'string.min': 'Çok kısa',
  'string.max': 'Çok uzun',
  'string.length': 'Uzunluk hatalı',
  'string.pattern.base': 'Biçim hatalı',
  'string.email': 'E-posta biçimi hatalı',
  'number.base': 'Sayı olmalı',
  'number.min': 'Çok küçük',
  'number.max': 'Çok büyük',
  'number.integer': 'Tam sayı olmalı',
  'date.base': 'Tarih hatalı',
  'array.min': 'En az bir kayıt gerekli',
  'object.base': 'Hatalı veri',
};

// eslint-disable-next-line no-unused-vars
function hataYakala(err, req, res, next) {
  if (err.isJoi) {
    const alanlar = {};
    err.details.forEach((d) => {
      alanlar[d.path.join('.')] = joiMesajlari[d.type] || d.message;
    });
    return res.status(400).json({ hata: 'Girilen bilgilerde hata var', alanlar });
  }
  if (err.durum) {
    return res.status(err.durum).json({ hata: err.message, alanlar: err.alanlar });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ hata: 'İstek gövdesi okunamadı' });
  }
  log.error(err.stack || err.message);
  return res.status(500).json({ hata: 'Sunucuda beklenmeyen bir hata oldu' });
}

module.exports = { HttpHata, hataYakala };
