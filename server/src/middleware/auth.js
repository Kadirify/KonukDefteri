const jwt = require('jsonwebtoken');
const { config } = require('../config');

function oturum(req, res, next) {
  const token = req.cookies && req.cookies.kd_token;
  if (!token) {
    return res.status(401).json({ hata: 'Oturum açmanız gerekiyor' });
  }
  try {
    const veri = jwt.verify(token, config.jwtGizli);
    req.kullanici = { id: veri.id, rol: veri.rol, adSoyad: veri.adSoyad };
    return next();
  } catch (e) {
    res.clearCookie('kd_token');
    return res.status(401).json({ hata: 'Oturum süresi dolmuş, tekrar giriş yapın' });
  }
}

function yetki(...roller) {
  return (req, res, next) => {
    if (!req.kullanici || !roller.includes(req.kullanici.rol)) {
      return res.status(403).json({ hata: 'Bu işlem için yetkiniz yok' });
    }
    return next();
  };
}

module.exports = { oturum, yetki };
