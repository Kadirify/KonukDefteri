const express = require('express');
const uyruklar = require('../data/uyruklar.json');

const router = express.Router();

router.get('/', (req, res) => {
  res.set('Cache-Control', 'max-age=86400');
  res.json(uyruklar);
});

module.exports = router;
