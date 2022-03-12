const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const log = require('./log');
const { config } = require('./config');
const { oturum } = require('./middleware/auth');
const { hataYakala } = require('./middleware/hata');
const paket = require('../package.json');

const app = express();

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
if (config.ortam !== 'test') {
  app.use(morgan('short', { stream: { write: (m) => log.http(m.trim()) } }));
}

app.get('/api/saglik', (req, res) => res.json({ tamam: true, surum: paket.version }));

app.use('/api/auth', require('./routes/auth'));

// Buradan sonrası oturum ister
app.use('/api', oturum);

// Kat görevlisi yalnız temizlik işlerini ve oda durumlarını görür
app.use('/api', (req, res, next) => {
  if (req.kullanici.rol !== 'kat_gorevlisi') return next();
  const serbest =
    req.path.startsWith('/temizlik') ||
    (req.method === 'GET' && /^\/(odalar|katlar|ayarlar|cizelge)(\/|$)/.test(req.path)) ||
    /^\/odalar\/\d+\/temizlik$/.test(req.path);
  if (serbest) return next();
  return res.status(403).json({ hata: 'Bu bölüm kat görevlisine kapalı' });
});

app.use('/api/tesis', require('./routes/tesis'));
app.use('/api/katlar', require('./routes/katlar'));
app.use('/api/temizlik', require('./routes/temizlik'));
app.use('/api/rezervasyonlar', require('./routes/rezervasyonlar'));
app.use('/api/cizelge', require('./routes/cizelge'));
app.use('/api/hesaplar', require('./routes/hesaplar'));
app.use('/api/kullanicilar', require('./routes/kullanicilar'));
app.use('/api/ayarlar', require('./routes/ayarlar'));
app.use('/api/uyruklar', require('./routes/uyruklar'));
app.use('/api/odalar', require('./routes/odalar'));
app.use('/api/konuklar', require('./routes/konuklar'));
app.use('/api/konaklamalar', require('./routes/konaklamalar'));
app.use('/api/kbs', require('./routes/kbs'));
app.use('/api/pano', require('./routes/pano'));
app.use('/api/raporlar', require('./routes/raporlar'));

app.use('/api', (req, res) => res.status(404).json({ hata: 'Böyle bir adres yok' }));

// Üretimde derlenmiş arayüzü de aynı port sunar
const dist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(hataYakala);

module.exports = app;
