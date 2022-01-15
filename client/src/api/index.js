import istemci from './istemci';

const veri = (r) => r.data;

export const auth = {
  giris: (v) => istemci.post('/auth/giris', v).then(veri),
  cikis: () => istemci.post('/auth/cikis').then(veri),
  ben: () => istemci.get('/auth/ben').then(veri),
  parola: (v) => istemci.put('/auth/parola', v).then(veri),
};

export const tesis = {
  oku: () => istemci.get('/tesis').then(veri),
  kaydet: (v) => istemci.put('/tesis', v).then(veri),
};

export const konuklar = {
  liste: (q) => istemci.get('/konuklar', { params: { q: q || '' } }).then(veri),
  oku: (id) => istemci.get(`/konuklar/${id}`).then(veri),
  ekle: (v) => istemci.post('/konuklar', v).then(veri),
  duzenle: (id, v) => istemci.put(`/konuklar/${id}`, v).then(veri),
};

export const ayarlar = {
  oku: () => istemci.get('/ayarlar').then(veri),
  kaydet: (v) => istemci.put('/ayarlar', v).then(veri),
};

export const kullanicilar = {
  liste: () => istemci.get('/kullanicilar').then(veri),
  ekle: (v) => istemci.post('/kullanicilar', v).then(veri),
  duzenle: (id, v) => istemci.put(`/kullanicilar/${id}`, v).then(veri),
};

export const uyruklar = {
  liste: () => istemci.get('/uyruklar').then(veri),
};
