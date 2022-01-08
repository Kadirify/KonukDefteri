const fs = require('fs');
const path = require('path');
const knex = require('knex');
const ayar = require('../../knexfile');

fs.mkdirSync(path.dirname(ayar.connection.filename), { recursive: true });

module.exports = knex(ayar);
