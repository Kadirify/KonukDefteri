import { useCallback, useEffect, useState } from 'react';
import { hataMesaji } from '../api/istemci';

export default function useYukle(fn, bagimliliklar = []) {
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [sayac, setSayac] = useState(0);

  useEffect(() => {
    let iptal = false;
    setYukleniyor(true);
    setHata('');
    fn()
      .then((v) => {
        if (!iptal) setVeri(v);
      })
      .catch((e) => {
        if (!iptal) setHata(hataMesaji(e));
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...bagimliliklar, sayac]);

  const yenile = useCallback(() => setSayac((s) => s + 1), []);

  return { veri, setVeri, yukleniyor, hata, yenile };
}
