const bcrypt = require('bcryptjs');
const { config } = require('../../config');

// Her açılışta çalışır; olmayanı ekler, olanı ellemez.
exports.seed = async function (knex) {
  const tesis = await knex('tesis').first();
  if (!tesis) {
    await knex('tesis').insert({ ad: '' });
  }

  const yonetici = await knex('kullanicilar').where({ rol: 'yonetici' }).first();
  if (!yonetici) {
    await knex('kullanicilar').insert({
      ad_soyad: 'Yönetici',
      kullanici_adi: 'yonetici',
      parola_hash: bcrypt.hashSync(config.yoneticiParola, 10),
      rol: 'yonetici',
      ilk_parola: true,
    });
  }

  const varsayilan = {
    kuyruk_dakika: '2',
    saklama_yil: '5',
    tema: 'sistem',
    giris_saati: '14:00',
    cikis_saati: '11:00',
    cikista_temizlik: '1',
    temizlik_kontrolu: '0',
    gunubirlik_izinli: '1',
    gunubirlik_saat: '6',
  };
  for (const anahtar of Object.keys(varsayilan)) {
    const mevcut = await knex('ayarlar').where({ anahtar }).first();
    if (!mevcut) {
      await knex('ayarlar').insert({ anahtar, deger: varsayilan[anahtar] });
    }
  }
};
