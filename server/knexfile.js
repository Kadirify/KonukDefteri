const path = require('path');
const { config } = require('./src/config');

module.exports = {
  client: 'sqlite3',
  connection: {
    filename: path.join(config.veriKlasoru, 'konukdefteri.sqlite'),
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, 'src', 'db', 'migrations'),
  },
  seeds: {
    directory: path.join(__dirname, 'src', 'db', 'seeds'),
  },
  pool: {
    afterCreate: (baglanti, bitti) => baglanti.run('PRAGMA foreign_keys = ON', bitti),
  },
};
