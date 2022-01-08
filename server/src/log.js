const fs = require('fs');
const path = require('path');
const winston = require('winston');
const { config } = require('./config');

const klasor = path.join(config.veriKlasoru, 'log');
fs.mkdirSync(klasor, { recursive: true });

const bicim = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((b) => `${b.timestamp} ${b.level}: ${b.message}`)
);

const log = winston.createLogger({
  level: config.ortam === 'production' ? 'info' : 'debug',
  format: bicim,
  transports: [
    new winston.transports.File({
      filename: path.join(klasor, 'sunucu.log'),
      maxsize: 2 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

if (config.ortam !== 'test') {
  log.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), bicim),
    })
  );
}

module.exports = log;
