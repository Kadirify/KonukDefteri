import { Link } from 'react-router-dom';
import { pano } from '../api';
import useYukle from '../hooks/useYukle';
import Sayfa, { Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import { trTarih } from '../utils/tarih';
import { KBS_MOD } from '../utils/metin';

export default function Pano() {
  const { veri, yukleniyor, hata } = useYukle(() => pano.oku(), []);

  if (yukleniyor) return <Yukleniyor />;
  if (hata) return <Uyari tur="hata">{hata}</Uyari>;

  const p = veri;
  return (
    <Sayfa
      baslik="Pano"
      aciklama={trTarih(p.tarih) + (p.tesisAdi ? ' - ' + p.tesisAdi : '')}
      eylemler={
        <>
          <Link to="/odalar" className="dugme">
            Odalar
          </Link>
          <Link to="/konaklamalar?yeni=1" className="dugme dugme-birincil">
            + Giriş kaydı
          </Link>
        </>
      }
    >
      {!p.tesisAdi && (
        <Uyari
          tur="bilgi"
          eylem={
            <Link to="/ayarlar" className="dugme dugme-kucuk">
              Ayarlara git
            </Link>
          }
        >
          Tesis bilgileri ve KBS bağlantısı henüz girilmemiş.
        </Uyari>
      )}
      <div className="istatistikler">
        <div className="istatistik">
          <small>Bugün giriş</small>
          <b>{p.bugunGiris}</b>
        </div>
        <div className="istatistik">
          <small>Bugün çıkış</small>
          <b>{p.bugunCikis}</b>
        </div>
        <div className="istatistik">
          <small>Konaklayan</small>
          <b>{p.konaklayan}</b>
        </div>
        <div className="istatistik">
          <small>Dolu oda</small>
          <b>
            {p.odaDolu}
            <span className="soluk" style={{ fontSize: '0.9rem', fontWeight: 400 }}>
              {' '}
              / {p.odaToplam}
            </span>
          </b>
        </div>
        <div className={'istatistik' + (p.bekleyen ? ' bekle' : '')}>
          <small>Bekleyen bildirim</small>
          <b>{p.bekleyen}</b>
        </div>
        <div className={'istatistik' + (p.hatali ? ' dikkat' : '')}>
          <small>Hatalı bildirim</small>
          <b>{p.hatali}</b>
        </div>
      </div>

      {p.hatali > 0 && (
        <Uyari
          tur="hata"
          eylem={
            <Link to="/kbs" className="dugme dugme-kucuk">
              Kuyruğa git
            </Link>
          }
        >
          {p.hatali} bildirim KBS'ye gönderilemedi. Servis açılınca kendiliğinden yeniden denenir.
        </Uyari>
      )}

      <p className="soluk" style={{ marginTop: 16 }}>
        KBS: {KBS_MOD[p.kbsMod] || p.kbsMod} - <Link to="/kbs">kuyruğu aç</Link>
      </p>
    </Sayfa>
  );
}
