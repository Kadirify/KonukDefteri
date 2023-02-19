const os = require('os');
const { config, kontrol } = require('./config');

try {
  kontrol();
} catch (e) {
  // log modülü de .env ister, o yüzden düz console
  console.error(e.message);
  process.exit(1);
}

const db = require('./db/knex');
const log = require('./log');
const app = require('./app');
const kuyruk = require('./services/kbs/kuyruk');
const yedek = require('./services/yedek');

function yerelAdresler() {
  const liste = [];
  Object.values(os.networkInterfaces()).forEach((arayuz) => {
    (arayuz || []).forEach((a) => {
      // Node 18.0'da family bir ara sayı oldu, ikisini de kabul et
      if ((a.family === 'IPv4' || a.family === 4) && !a.internal) liste.push(a.address);
    });
  });
  return liste;
}

async function baslat() {
  await db.migrate.latest();
  await db.seed.run();
  await kuyruk.baslat();
  await yedek.baslat();

  const sunucu = app.listen(config.port, '0.0.0.0', () => {
    log.info(`KonukDefteri API hazır: http://localhost:${config.port}`);
    const adresler = yerelAdresler();
    if (adresler.length) {
      log.info('Yerel ağdan: ' + adresler.map((a) => `http://${a}:${config.port}`).join(', '));
    }
  });

  const kapat = () => {
    log.info('Kapatılıyor');
    kuyruk.durdur();
    yedek.durdur();
    sunucu.close(() => {
      db.destroy().then(() => process.exit(0));
    });
  };
  process.on('SIGINT', kapat);
  process.on('SIGTERM', kapat);
}

baslat().catch((e) => {
  log.error('Başlatılamadı: ' + (e.stack || e.message));
  process.exit(1);
});
