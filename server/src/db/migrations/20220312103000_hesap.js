// Oda fiyatları, konaklama hesabı, kalemler ve tahsilatlar

exports.up = async function (knex) {
  await knex.schema.alterTable('odalar', (t) => {
    t.decimal('gecelik_fiyat', 10, 2).notNullable().defaultTo(0);
    t.decimal('gunubirlik_fiyat', 10, 2).notNullable().defaultTo(0);
  });

  await knex.schema.createTable('hesaplar', (t) => {
    t.increments('id');
    t.integer('konaklama_id').notNullable().references('id').inTable('konaklamalar');
    t.string('grup_kodu', 8);
    t.string('durum').notNullable().defaultTo('acik'); // acik | kapali
    t.string('olusturma', 16).notNullable();
    t.string('kapanis', 16);
    t.integer('kapatan');
    t.string('notlar').notNullable().defaultTo('');
    t.index(['konaklama_id']);
    t.index(['grup_kodu']);
  });

  await knex.schema.createTable('hesap_kalemleri', (t) => {
    t.increments('id');
    t.integer('hesap_id').notNullable().references('id').inTable('hesaplar');
    t.string('tur').notNullable().defaultTo('ekstra'); // konaklama | ekstra | indirim
    t.string('aciklama').notNullable();
    t.decimal('adet', 10, 2).notNullable().defaultTo(1);
    t.decimal('birim_fiyat', 10, 2).notNullable().defaultTo(0);
    t.decimal('tutar', 10, 2).notNullable().defaultTo(0);
    t.string('tarih', 16).notNullable();
    t.boolean('otomatik').notNullable().defaultTo(false); // konaklama kalemi program tarafından hesaplanır
    t.integer('kullanici_id');
  });

  await knex.schema.createTable('tahsilatlar', (t) => {
    t.increments('id');
    t.integer('hesap_id').notNullable().references('id').inTable('hesaplar');
    t.decimal('tutar', 10, 2).notNullable();
    t.string('yontem').notNullable().defaultTo('nakit'); // nakit | kart | havale | diger
    t.string('tarih', 16).notNullable();
    t.string('notlar').notNullable().defaultTo('');
    t.integer('kullanici_id');
    t.index(['tarih']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('tahsilatlar');
  await knex.schema.dropTableIfExists('hesap_kalemleri');
  await knex.schema.dropTableIfExists('hesaplar');
  await knex.schema.alterTable('odalar', (t) => {
    t.dropColumns('gecelik_fiyat', 'gunubirlik_fiyat');
  });
};
