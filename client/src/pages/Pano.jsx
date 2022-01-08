import { tesis } from '../api';
import useYukle from '../hooks/useYukle';
import Sayfa, { Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import { bugunYerel, trGun } from '../utils/tarih';

export default function Pano() {
  const { veri, yukleniyor, hata } = useYukle(() => tesis.oku(), []);

  if (yukleniyor) return <Yukleniyor />;
  if (hata) return <Uyari tur="hata">{hata}</Uyari>;

  return (
    <Sayfa baslik="Pano" aciklama={trGun(bugunYerel()) + (veri.ad ? ' - ' + veri.ad : '')}>
      {!veri.ad && <Uyari tur="bilgi">Tesis bilgileri henüz girilmemiş.</Uyari>}
      <div className="kart">
        <p className="soluk">Konaklama kayıtları gelince burada günün özeti olacak.</p>
      </div>
    </Sayfa>
  );
}
