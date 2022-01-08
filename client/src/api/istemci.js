import axios from 'axios';

const istemci = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 20000,
});

let oturumDustu = null;

// 401 gelince AuthProvider kullanıcıyı düşürsün diye
export function oturumDusunce(fn) {
  oturumDustu = fn;
}

istemci.interceptors.response.use(
  (r) => r,
  (e) => {
    const url = (e.config && e.config.url) || '';
    if (e.response && e.response.status === 401 && oturumDustu && url.indexOf('/auth/') === -1) {
      oturumDustu();
    }
    return Promise.reject(e);
  }
);

export function hataMesaji(e) {
  if (e && e.response && e.response.data && e.response.data.hata) return e.response.data.hata;
  if (e && e.code === 'ECONNABORTED') return 'Sunucu zamanında yanıt vermedi';
  if (e && !e.response) return 'Sunucuya ulaşılamıyor';
  return 'Beklenmeyen bir hata oldu';
}

export function hataAlanlari(e) {
  return (e && e.response && e.response.data && e.response.data.alanlar) || {};
}

export default istemci;
