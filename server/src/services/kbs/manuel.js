// Manuel mod: bildirim kuyruğa düşer, resepsiyon alanları kopyalayıp
// KBS portalına kendisi girer ve "bildirildi" olarak işaretler.

async function gonder() {
  throw new Error('Manuel modda otomatik gönderim yapılmaz');
}

async function test() {
  return {
    tamam: true,
    mesaj: 'Manuel modda bağlantı gerekmiyor. Bildirimler portala elle girilir.',
  };
}

module.exports = { ad: 'manuel', gonder, test };
