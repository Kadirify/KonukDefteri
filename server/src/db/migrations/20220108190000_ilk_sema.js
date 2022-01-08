exports.up = async function (knex) {
  await knex.schema.createTable('tesis', (t) => {
    t.increments('id');
    t.string('ad').notNullable().defaultTo('');
    t.string('tesis_kodu', 6).notNullable().defaultTo('');
    t.string('bolge').notNullable().defaultTo('emniyet'); // emniyet | jandarma
    t.string('il').notNullable().defaultTo('');
    t.string('ilce').notNullable().defaultTo('');
    t.string('adres').notNullable().defaultTo('');
    t.string('telefon').notNullable().defaultTo('');
    t.string('kbs_mod').notNullable().defaultTo('manuel'); // manuel | jandarma
    t.string('kbs_kullanici').notNullable().defaultTo('');
    t.text('kbs_sifre').notNullable().defaultTo(''); // şifreli saklanır
    t.string('kbs_wsdl').notNullable().defaultTo('');
    t.string('guncelleme', 16);
  });

  await knex.schema.createTable('kullanicilar', (t) => {
    t.increments('id');
    t.string('ad_soyad').notNullable();
    t.string('kullanici_adi').notNullable().unique();
    t.string('parola_hash').notNullable();
    t.string('rol').notNullable().defaultTo('resepsiyon'); // yonetici | resepsiyon
    t.boolean('aktif').notNullable().defaultTo(true);
    t.boolean('ilk_parola').notNullable().defaultTo(true);
    t.string('son_giris', 16);
    t.timestamp('olusturma').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('odalar', (t) => {
    t.increments('id');
    t.string('oda_no').notNullable().unique();
    t.string('tip').notNullable().defaultTo('');
    t.integer('kapasite').notNullable().defaultTo(2);
    t.string('kat').notNullable().defaultTo('');
    t.boolean('aktif').notNullable().defaultTo(true);
    t.string('notlar').notNullable().defaultTo('');
  });

  await knex.schema.createTable('konuklar', (t) => {
    t.increments('id');
    t.string('kimlik_turu').notNullable().defaultTo('tc'); // tc | pasaport
    t.text('tc_sifreli');
    t.string('tc_hash', 64).index();
    t.string('tc_son4', 4);
    t.string('pasaport_no').notNullable().defaultTo('');
    t.string('uyruk', 4).notNullable().defaultTo('TUR');
    t.string('ad').notNullable();
    t.string('soyad').notNullable();
    t.string('baba_adi').notNullable().defaultTo('');
    t.string('anne_adi').notNullable().defaultTo('');
    t.string('dogum_tarihi', 10);
    t.string('dogum_yeri').notNullable().defaultTo('');
    t.string('cinsiyet', 1).notNullable().defaultTo('');
    t.string('telefon').notNullable().defaultTo('');
    t.boolean('kvkk_onay').notNullable().defaultTo(false);
    t.string('notlar').notNullable().defaultTo('');
    t.timestamp('olusturma').defaultTo(knex.fn.now());
    t.string('guncelleme', 16);
  });

  await knex.schema.createTable('konaklamalar', (t) => {
    t.increments('id');
    t.integer('konuk_id').notNullable().references('id').inTable('konuklar');
    t.integer('oda_id').notNullable().references('id').inTable('odalar');
    t.string('grup_kodu', 8).index();
    t.string('giris_zamani', 16).notNullable(); // YYYY-MM-DD HH:mm, yerel saat
    t.string('cikis_zamani', 16);
    t.string('plaka').notNullable().defaultTo('');
    t.string('durum').notNullable().defaultTo('konakliyor'); // konakliyor | ayrildi
    t.integer('olusturan').references('id').inTable('kullanicilar');
    t.timestamp('olusturma').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('kbs_bildirimler', (t) => {
    t.increments('id');
    t.integer('konaklama_id').notNullable().references('id').inTable('konaklamalar');
    t.string('tur').notNullable(); // giris | cikis | guncelle
    t.string('durum').notNullable().defaultTo('bekliyor'); // bekliyor | gonderildi | hata | manuel
    t.string('mod').notNullable().defaultTo('manuel');
    t.integer('deneme').notNullable().defaultTo(0);
    t.text('son_hata');
    t.string('gonderim_zamani', 16);
    t.string('yanit_ref').notNullable().defaultTo('');
    t.timestamp('olusturma').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('ayarlar', (t) => {
    t.string('anahtar').primary();
    t.text('deger');
  });
};

exports.down = async function (knex) {
  const tablolar = [
    'kbs_bildirimler',
    'konaklamalar',
    'konuklar',
    'odalar',
    'kullanicilar',
    'tesis',
    'ayarlar',
  ];
  for (const tablo of tablolar) {
    await knex.schema.dropTableIfExists(tablo);
  }
};
