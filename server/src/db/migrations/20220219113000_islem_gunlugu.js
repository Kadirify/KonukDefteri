exports.up = async function (knex) {
  await knex.schema.createTable('islem_gunlugu', (t) => {
    t.increments('id');
    t.integer('kullanici_id');
    t.string('islem').notNullable();
    t.string('hedef').notNullable().defaultTo('');
    t.text('ayrinti').notNullable().defaultTo('');
    t.string('zaman', 16).notNullable().index();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('islem_gunlugu');
};
