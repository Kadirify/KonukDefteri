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

