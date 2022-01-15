import { useEffect, useState } from 'react';
import { uyruklar } from '../api';

let onbellek = null;

export default function useUyruklar() {
  const [liste, setListe] = useState(onbellek || []);

  useEffect(() => {
    if (onbellek) return;
    uyruklar
      .liste()
      .then((l) => {
        onbellek = l;
        setListe(l);
      })
      .catch(() => {});
  }, []);

  return liste;
}

export function uyrukAdi(liste, kod) {
  const u = liste.find((x) => x.kod === kod);
  return u ? u.ad : kod;
}
