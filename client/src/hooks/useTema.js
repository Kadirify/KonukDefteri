import { useCallback, useEffect, useState } from 'react';

const ANAHTAR = 'kd-tema';
const SIRA = ['sistem', 'acik', 'koyu'];
export const TEMA_ETIKET = { sistem: 'Sistem teması', acik: 'Açık tema', koyu: 'Koyu tema' };

function oku() {
  try {
    const t = localStorage.getItem(ANAHTAR);
    return SIRA.includes(t) ? t : 'sistem';
  } catch (e) {
    return 'sistem';
  }
}

function uygula(tema) {
  const kok = document.documentElement;
  if (tema === 'sistem') delete kok.dataset.tema;
  else kok.dataset.tema = tema;
  const koyuSistem = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  kok.classList.toggle('sistem-koyu', tema === 'sistem' && koyuSistem);
}

export default function useTema() {
  const [tema, setTemaState] = useState(oku);

  useEffect(() => {
    uygula(tema);
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const dinle = () => uygula(tema);
    if (mq && mq.addEventListener) mq.addEventListener('change', dinle);
    return () => {
      if (mq && mq.removeEventListener) mq.removeEventListener('change', dinle);
    };
  }, [tema]);

  const setTema = useCallback((t) => {
    try {
      localStorage.setItem(ANAHTAR, t);
    } catch (e) {
      // gizli pencere vs., sorun değil
    }
    setTemaState(t);
  }, []);

  const siradaki = useCallback(() => {
    setTema(SIRA[(SIRA.indexOf(tema) + 1) % SIRA.length]);
  }, [tema, setTema]);

  return { tema, setTema, siradaki };
}
