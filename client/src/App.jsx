import { Navigate, Route, Routes } from 'react-router-dom';
import Korumali from './components/Korumali';
import Giris from './pages/Giris';
import Pano from './pages/Pano';
import Konaklamalar from './pages/Konaklamalar';
import KonaklamaDetay from './pages/KonaklamaDetay';
import Odalar from './pages/Odalar';
import Temizlik from './pages/Temizlik';
import Konuklar from './pages/Konuklar';
import KonukDetay from './pages/KonukDetay';
import KbsKuyrugu from './pages/KbsKuyrugu';
import KesintiTutanagi from './pages/KesintiTutanagi';
import Raporlar from './pages/Raporlar';
import Ayarlar from './pages/Ayarlar';

export default function App() {
  return (
    <Routes>
      <Route path="/giris" element={<Giris />} />
      <Route element={<Korumali />}>
        <Route index element={<Pano />} />
        <Route path="konaklamalar" element={<Konaklamalar />} />
        <Route path="konaklamalar/:id" element={<KonaklamaDetay />} />
        <Route path="odalar" element={<Odalar />} />
        <Route path="temizlik" element={<Temizlik />} />
        <Route path="konuklar" element={<Konuklar />} />
        <Route path="konuklar/:id" element={<KonukDetay />} />
        <Route path="kbs" element={<KbsKuyrugu />} />
        <Route path="kbs/kesintiler/:id" element={<KesintiTutanagi />} />
        <Route path="raporlar" element={<Raporlar />} />
        <Route path="ayarlar/*" element={<Ayarlar />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
