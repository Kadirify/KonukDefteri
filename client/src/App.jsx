import { Navigate, Route, Routes } from 'react-router-dom';
import Korumali from './components/Korumali';
import Giris from './pages/Giris';
import Pano from './pages/Pano';

export default function App() {
  return (
    <Routes>
      <Route path="/giris" element={<Giris />} />
      <Route element={<Korumali />}>
        <Route index element={<Pano />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
