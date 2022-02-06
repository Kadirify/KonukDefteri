exports.up = async function (knex) {
  await knex.schema.createTable('kesintiler', (t) => {
    t.increments('id');
    t.string('tutanak_no', 20).notNullable().unique();
    t.string('baslangic', 16).notNullable();
    t.string('bitis', 16).notNullable();
    t.string('neden').notNullable().defaultTo('');
    t.integer('olusturan').references('id').inTable('kullanicilar');
    t.timestamp('olusturma').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('kesintiler');
};
