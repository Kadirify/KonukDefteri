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

app.use('/api/tesis', require('./routes/tesis'));
app.use('/api/kullanicilar', require('./routes/kullanicilar'));
app.use('/api/ayarlar', require('./routes/ayarlar'));
app.use('/api/uyruklar', require('./routes/uyruklar'));
app.use('/api/konuklar', require('./routes/konuklar'));

app.use('/api', (req, res) => res.status(404).json({ hata: 'Böyle bir adres yok' }));

// Üretimde derlenmiş arayüzü de aynı port sunar
const dist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(hataYakala);

module.exports = app;
