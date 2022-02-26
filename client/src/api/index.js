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

export const odalar = {
  liste: () => istemci.get('/odalar').then(veri),
  ekle: (v) => istemci.post('/odalar', v).then(veri),
  duzenle: (id, v) => istemci.put(`/odalar/${id}`, v).then(veri),
  gecmis: (id, gun) =>
    istemci.get(`/odalar/${id}/gecmis`, { params: { gun: gun || 30 } }).then(veri),
  temizlik: (id, v) => istemci.put(`/odalar/${id}/temizlik`, v).then(veri),
  bakim: (id, v) => istemci.put(`/odalar/${id}/bakim`, v).then(veri),
  sira: (katId, idler) => istemci.put('/odalar/sira', { katId, idler }).then(veri),
};

export const katlar = {
  liste: () => istemci.get('/katlar').then(veri),
  ekle: (v) => istemci.post('/katlar', v).then(veri),
  duzenle: (id, v) => istemci.put(`/katlar/${id}`, v).then(veri),
  sira: (idler) => istemci.put('/katlar/sira', { idler }).then(veri),
  sil: (id) => istemci.delete(`/katlar/${id}`).then(veri),
};

export const konuklar = {
  liste: (q) => istemci.get('/konuklar', { params: { q: q || '' } }).then(veri),
  oku: (id) => istemci.get(`/konuklar/${id}`).then(veri),
  ekle: (v) => istemci.post('/konuklar', v).then(veri),
  duzenle: (id, v) => istemci.put(`/konuklar/${id}`, v).then(veri),
};

export const konaklamalar = {
  liste: (params) => istemci.get('/konaklamalar', { params }).then(veri),
  oku: (id) => istemci.get(`/konaklamalar/${id}`).then(veri),
  giris: (v) => istemci.post('/konaklamalar', v).then(veri),
  cikis: (id, v) => istemci.put(`/konaklamalar/${id}/cikis`, v || {}).then(veri),
  odaDegistir: (id, odaId) => istemci.put(`/konaklamalar/${id}/oda`, { odaId }).then(veri),
  plan: (id, planlananCikis) =>
    istemci.put(`/konaklamalar/${id}/plan`, { planlananCikis }).then(veri),
};

export const kbs = {
  durum: () => istemci.get('/kbs/durum').then(veri),
  bildirimler: (durum) => istemci.get('/kbs/bildirimler', { params: { durum } }).then(veri),
  alanlar: (id) => istemci.get(`/kbs/bildirimler/${id}/alanlar`).then(veri),
  gonder: (id) => istemci.post(`/kbs/bildirimler/${id}/gonder`).then(veri),
  manuelTamam: (id, referans) =>
    istemci.post(`/kbs/bildirimler/${id}/manuel-tamam`, { referans }).then(veri),
  test: () => istemci.post('/kbs/test').then(veri),
  kesintiler: () => istemci.get('/kbs/kesintiler').then(veri),
  kesintiEkle: (v) => istemci.post('/kbs/kesintiler', v).then(veri),
  kesinti: (id) => istemci.get(`/kbs/kesintiler/${id}`).then(veri),
};

export const pano = {
  oku: () => istemci.get('/pano').then(veri),
};

export const raporlar = {
  gunluk: (tarih, tam) =>
    istemci.get('/raporlar/gunluk', { params: { tarih, tam: tam ? '1' : '0' } }).then(veri),
  aylik: (ay) => istemci.get('/raporlar/aylik', { params: { ay } }).then(veri),
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
