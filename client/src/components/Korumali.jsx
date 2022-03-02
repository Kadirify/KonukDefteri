import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Duzen from './Duzen';

export default function Korumali() {
  const { kullanici, yukleniyor } = useAuth();
  const konum = useLocation();

  if (yukleniyor) {
    return <div className="tam-ekran soluk">Yükleniyor...</div>;
  }
  if (!kullanici) {
    return <Navigate to="/giris" replace state={{ nereden: konum.pathname }} />;
  }
  // Kat görevlisi yalnız temizlik, oda haritası, çizelge ve parola ekranını görür
  if (kullanici.rol === 'kat_gorevlisi') {
    const serbest = ['/temizlik', '/odalar', '/cizelge', '/ayarlar/parola', '/ayarlar'];
    if (!serbest.some((y) => konum.pathname === y || konum.pathname.startsWith(y + '/'))) {
      return <Navigate to="/temizlik" replace />;
    }
  }
  return (
    <Duzen>
      <Outlet />
    </Duzen>
  );
}
