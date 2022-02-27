import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import useTema, { TEMA_ETIKET } from '../hooks/useTema';
import { kbs, tesis } from '../api';
import { ROL } from '../utils/metin';
import Logo from './Logo';

const menu = [
  { yol: '/', ad: 'Pano', son: true },
  { yol: '/odalar', ad: 'Oda haritası', gorevli: true },
  { yol: '/konaklamalar', ad: 'Konaklamalar' },
  { yol: '/konuklar', ad: 'Konuklar' },
  { yol: '/kbs', ad: 'KBS kuyruğu', sayac: true },
  { yol: '/raporlar', ad: 'Raporlar' },
  { yol: '/ayarlar', ad: 'Ayarlar' },
];

export default function Duzen({ children }) {
  const { kullanici, cikis } = useAuth();
  const { tema, siradaki } = useTema();
  const [acik, setAcik] = useState(false);
  const [bekleyen, setBekleyen] = useState(0);
  const [tesisAdi, setTesisAdi] = useState('');
  const konum = useLocation();

  useEffect(() => {
    setAcik(false);
  }, [konum.pathname]);

  useEffect(() => {
    let durdu = false;
    const oku = () => {
      kbs
        .durum()
        .then((d) => {
          if (!durdu) setBekleyen(d.bekleyen + d.hatali);
        })
        .catch(() => {});
    };
    oku();
    const z = setInterval(oku, 60000);
    return () => {
      durdu = true;
      clearInterval(z);
    };
  }, [konum.pathname]);

  useEffect(() => {
    tesis
      .oku()
      .then((t) => setTesisAdi(t.ad))
      .catch(() => {});
  }, [konum.pathname]);

  return (
    <div className="uygulama">
      <div className="ust-cubuk">
        <button type="button" onClick={() => setAcik((a) => !a)} aria-label="Menü">
          ☰
        </button>
        <Logo boyut={20} zemin="yok" />
      </div>
      <aside className={'kenar' + (acik ? ' acik' : '')}>
        <div className="marka">
          <Logo boyut={26} zemin="yok" />
        </div>
        <div className="tesis-adi">{tesisAdi || 'Tesis adı girilmedi'}</div>
        <nav>
          {menu
            .map((m) => (
              <NavLink
                key={m.yol}
                to={m.yol}
                end={m.son}
                className={({ isActive }) => (isActive ? 'aktif' : '')}
              >
                <span>{m.ad}</span>
                {m.sayac && bekleyen > 0 && <span className="sayac">{bekleyen}</span>}
              </NavLink>
            ))}
        </nav>
        <div className="alt">
          <div>
            <b>{kullanici.adSoyad}</b>
            <br />
            {ROL[kullanici.rol] || kullanici.rol}
          </div>
          <div className="satir">
            <button type="button" onClick={siradaki} title={TEMA_ETIKET[tema]}>
              {tema === 'koyu' ? 'Koyu' : tema === 'acik' ? 'Açık' : 'Sistem'}
            </button>
            <button type="button" onClick={cikis}>
              Çıkış
            </button>
          </div>
        </div>
      </aside>
      <main className="icerik">
        {kullanici.ilkParola && konum.pathname !== '/ayarlar/parola' && (
          <div className="uyari uyari-uyari yazdirma-gizle">
            <div>
              İlk kurulum parolasıyla giriş yaptınız. Devam etmeden önce parolanızı değiştirin.
            </div>
            <Link to="/ayarlar/parola" className="dugme dugme-kucuk">
              Parolayı değiştir
            </Link>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
