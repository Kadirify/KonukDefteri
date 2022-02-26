// Katlar, odada temizlik + kullanım durumu, konaklama-oda geçmişi, temizlik görevleri,
// oda olayları, rezervasyonlar

function trSirala(a, b) {
  return String(a).localeCompare(String(b), 'tr', { numeric: true });
}

exports.up = async function (knex) {
  await knex.schema.createTable('katlar', (t) => {
    t.increments('id');
    t.string('ad').notNullable();
    t.integer('sira').notNullable().defaultTo(0); // 0 en üstte
    t.string('koridor').notNullable().defaultTo('orta'); // orta | yok
    t.boolean('aktif').notNullable().defaultTo(true);
  });

  // kat_id'de FK tanımı yok: sqlite'ta references ile ADD COLUMN tabloyu yeniden kurmaya
  // kalkıyor ve dolu tabloda FOREIGN KEY hatası veriyor. İlişki uygulama tarafında korunuyor.
  await knex.schema.alterTable('odalar', (t) => {
    t.integer('kat_id');
    t.integer('sira').notNullable().defaultTo(0);
    t.string('tur').notNullable().defaultTo('oda'); // oda | ortak
    t.string('temizlik').notNullable().defaultTo('temiz'); // temiz | kirli | temizleniyor | kontrol
    t.string('kullanim').notNullable().defaultTo('kullanimda'); // kullanimda | bakimda | kapali
    t.string('bakim_notu').notNullable().defaultTo('');
    t.string('bakim_bitis', 10);
    t.string('ozellikler').notNullable().defaultTo('');
    t.string('son_temizlik', 16);
  });

  // Eski "kat" metinlerinden kat satırları: en yüksek kat en üstte
  const odalar = await knex('odalar');
  const adlar = [...new Set(odalar.map((o) => (o.kat || '').trim()).filter(Boolean))].sort(
    trSirala
  );
  const katIdleri = {};
  for (let i = 0; i < adlar.length; i++) {
    const ad = /^\d+$/.test(adlar[i]) ? adlar[i] + '. Kat' : adlar[i];
    const [id] = await knex('katlar').insert({ ad, sira: adlar.length - 1 - i });
    katIdleri[adlar[i]] = id;
  }
  if (odalar.some((o) => !(o.kat || '').trim())) {
    const [id] = await knex('katlar').insert({ ad: 'Zemin', sira: adlar.length });
    katIdleri[''] = id;
  }
  const sayac = {};
  for (const o of [...odalar].sort((a, b) => trSirala(a.oda_no, b.oda_no))) {
    const katId = katIdleri[(o.kat || '').trim()];
    sayac[katId] = (sayac[katId] || 0) + 1;
    await knex('odalar')
      .where({ id: o.id })
      .update({ kat_id: katId, sira: sayac[katId], kullanim: o.aktif ? 'kullanimda' : 'kapali' });
  }

  await knex.schema.createTable('konaklama_odalari', (t) => {
    t.increments('id');
    t.integer('konaklama_id').notNullable().references('id').inTable('konaklamalar');
    t.integer('oda_id').notNullable().references('id').inTable('odalar');
    t.string('baslangic', 16).notNullable();
    t.string('bitis', 16);
    t.index(['oda_id', 'baslangic']);
  });
  const konaklamalar = await knex('konaklamalar');
  for (const k of konaklamalar) {
    await knex('konaklama_odalari').insert({
      konaklama_id: k.id,
      oda_id: k.oda_id,
      baslangic: k.giris_zamani,
      bitis: k.cikis_zamani || null,
    });
  }

  await knex.schema.alterTable('konaklamalar', (t) => {
    t.string('tur').notNullable().defaultTo('gece'); // gece | gunubirlik
    t.string('planlanan_cikis', 16);
    t.integer('rezervasyon_id');
    t.integer('kisi_sayisi').notNullable().defaultTo(1);
  });

  await knex.schema.createTable('temizlik_gorevleri', (t) => {
    t.increments('id');
    t.integer('oda_id').notNullable().references('id').inTable('odalar');
    t.string('tur').notNullable().defaultTo('cikis'); // cikis | gunluk | ekstra
    t.string('durum').notNullable().defaultTo('bekliyor'); // bekliyor | yapiliyor | kontrol | tamam
    t.string('olusturma', 16).notNullable();
    t.string('baslama', 16);
    t.string('bitis', 16);
    t.integer('yapan_id');
    t.integer('kontrol_eden_id');
    t.string('notlar').notNullable().defaultTo('');
    t.index(['oda_id', 'durum']);
  });

  await knex.schema.createTable('oda_olaylari', (t) => {
    t.increments('id');
    t.integer('oda_id').notNullable().references('id').inTable('odalar');
    t.string('tur').notNullable(); // bakim_basladi | bakim_bitti | kapatildi | acildi | temizlik | zorla_giris
    t.string('zaman', 16).notNullable();
    t.integer('kullanici_id');
    t.string('notlar').notNullable().defaultTo('');
    t.index(['oda_id', 'zaman']);
  });

  await knex.schema.createTable('rezervasyonlar', (t) => {
    t.increments('id');
    t.integer('konuk_id').references('id').inTable('konuklar');
    t.string('ad_soyad').notNullable().defaultTo('');
    t.string('telefon').notNullable().defaultTo('');
    t.integer('oda_id').references('id').inTable('odalar');
    t.string('giris_tarihi', 10).notNullable();
    t.string('cikis_tarihi', 10).notNullable();
    t.integer('kisi_sayisi').notNullable().defaultTo(1);
    t.string('durum').notNullable().defaultTo('onayli'); // bekliyor | onayli | geldi | iptal | gelmedi
    t.string('kaynak').notNullable().defaultTo('telefon'); // telefon | booking | airbnb | kapidan | diger
    t.string('notlar').notNullable().defaultTo('');
    t.integer('konaklama_id');
    t.integer('olusturan');
    t.timestamp('olusturma').defaultTo(knex.fn.now());
    t.index(['oda_id', 'giris_tarihi']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('rezervasyonlar');
  await knex.schema.dropTableIfExists('oda_olaylari');
  await knex.schema.dropTableIfExists('temizlik_gorevleri');
  await knex.schema.dropTableIfExists('konaklama_odalari');
  await knex.schema.alterTable('konaklamalar', (t) => {
    t.dropColumns('tur', 'planlanan_cikis', 'rezervasyon_id', 'kisi_sayisi');
  });
  await knex.schema.alterTable('odalar', (t) => {
    t.dropColumns(
      'kat_id',
      'sira',
      'tur',
      'temizlik',
      'kullanim',
      'bakim_notu',
      'bakim_bitis',
      'ozellikler',
      'son_temizlik'
    );
  });
  await knex.schema.dropTableIfExists('katlar');
};
