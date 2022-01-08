import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { auth } from '../api';
import { oturumDusunce } from '../api/istemci';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [kullanici, setKullanici] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    oturumDusunce(() => setKullanici(null));
    auth
      .ben()
      .then(setKullanici)
      .catch(() => setKullanici(null))
      .finally(() => setYukleniyor(false));
  }, []);

  const giris = useCallback(async (v) => {
    const k = await auth.giris(v);
    setKullanici(k);
    return k;
  }, []);

  const cikis = useCallback(async () => {
    try {
      await auth.cikis();
    } finally {
      setKullanici(null);
    }
  }, []);

  const guncelle = useCallback((parca) => {
    setKullanici((k) => (k ? { ...k, ...parca } : k));
  }, []);

  return (
    <AuthContext.Provider value={{ kullanici, yukleniyor, giris, cikis, guncelle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
