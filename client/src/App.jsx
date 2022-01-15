import { Navigate, Route, Routes } from 'react-router-dom';
import Korumali from './components/Korumali';
import Giris from './pages/Giris';
import Pano from './pages/Pano';
import Konuklar from './pages/Konuklar';
import KonukDetay from './pages/KonukDetay';
import Ayarlar from './pages/Ayarlar';

export default function App() {
  return (
    <Routes>
      <Route path="/giris" element={<Giris />} />
      <Route element={<Korumali />}>
        <Route index element={<Pano />} />
        <Route path="konuklar" element={<Konuklar />} />
        <Route path="konuklar/:id" element={<KonukDetay />} />
        <Route path="ayarlar/*" element={<Ayarlar />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
