// Tarihler veritabanında "YYYY-MM-DD HH:mm" biçiminde, yerel saatle tutulur.
// Tesis tek bir yerde, saat dilimi derdi yok; ISO/UTC karmaşasına girmedim.

function iki(n) {
  return String(n).padStart(2, '0');
}

function simdi(d = new Date()) {
  return (
    `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())} ` +
    `${iki(d.getHours())}:${iki(d.getMinutes())}`
  );
}

function bugun(d = new Date()) {
  return simdi(d).slice(0, 10);
}

// "YYYY-MM-DD HH:mm" ya da "YYYY-MM-DD" geçerli mi
function gecerliZaman(s) {
  return /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/.test(s || '');
}

// "YYYY-MM-DD HH:mm" -> Date (yerel)
function tarihten(s) {
  const [gun, saat] = String(s).split(' ');
  const [y, a, g] = gun.split('-').map(Number);
  const [sa, dk] = (saat || '00:00').split(':').map(Number);
  return new Date(y, a - 1, g, sa, dk, 0, 0);
}

function saatEkle(s, saat) {
  const d = tarihten(s);
  d.setMinutes(d.getMinutes() + Math.round(saat * 60));
  return simdi(d);
}

function gunEkle(s, gun) {
  const d = tarihten(s);
  d.setDate(d.getDate() + gun);
  return simdi(d);
}

module.exports = { simdi, bugun, gecerliZaman, tarihten, saatEkle, gunEkle };
