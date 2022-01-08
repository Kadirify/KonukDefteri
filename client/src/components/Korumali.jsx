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
  return (
    <Duzen>
      <Outlet />
    </Duzen>
  );
}
