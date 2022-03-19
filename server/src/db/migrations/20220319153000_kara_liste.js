// Sorun çıkaran konuklar: girişte uyarı, yalnız yönetici zorla alabilir
exports.up = async function (knex) {
  await knex.schema.alterTable('konuklar', (t) => {
    t.boolean('kara_liste').notNullable().defaultTo(false);
    t.string('kara_liste_neden').notNullable().defaultTo('');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('konuklar', (t) => {
    t.dropColumn('kara_liste');
    t.dropColumn('kara_liste_neden');
  });
};
