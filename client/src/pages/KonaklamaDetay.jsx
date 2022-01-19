import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { konaklamalar, odalar as odaApi } from '../api';
import useYukle from '../hooks/useYukle';
import Sayfa, { Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import { CikisModal, OdaDegistirModal } from './Konaklamalar';
import { trTarih } from '../utils/tarih';
import { kimlikMetni, konukAdi } from '../utils/metin';

export default function KonaklamaDetay() {
  const { id } = useParams();
  const { veri, yukleniyor, hata, yenile } = useYukle(() => konaklamalar.oku(id), [id]);
  const odalar = useYukle(() => odaApi.liste(), [veri]);
  const [cikis, setCikis] = useState(false);
  const [tasi, setTasi] = useState(false);

  if (yukleniyor && !veri) return <Yukleniyor />;
  if (hata) return <Uyari tur="hata">{hata}</Uyari>;

  const s = veri;

  return (
    <Sayfa
      baslik={konukAdi(s)}
      aciklama={`Oda ${s.odaNo} - ${s.durum === 'konakliyor' ? 'konaklıyor' : 'ayrıldı'}`}
      eylemler={
        s.durum === 'konakliyor' ? (
          <>
            <button type="button" className="dugme" onClick={() => setTasi(true)}>
              Oda değiştir
            </button>
            <button type="button" className="dugme dugme-birincil" onClick={() => setCikis(true)}>
              Çıkış kaydı
            </button>
          </>
        ) : null
      }
    >
      <div className="kart">
        <div className="detay-izgara">
          <div>
            <span>Konuk</span>
            <Link to={`/konuklar/${s.konukId}`}>{konukAdi(s)}</Link>
          </div>
          <div>
            <span>Kimlik</span>
            <span className="mono">{kimlikMetni(s)}</span>
          </div>
          <div>
            <span>Giriş</span>
            {trTarih(s.girisZamani)}
          </div>
          <div>
            <span>Çıkış</span>
            {s.cikisZamani ? trTarih(s.cikisZamani) : '-'}
          </div>
          <div>
            <span>Kişi</span>
            {s.kisiSayisi}
            {s.grupKodu && <span className="soluk"> - grup {s.grupKodu}</span>}
          </div>
          <div>
            <span>Plaka</span>
            {s.plaka || '-'}
          </div>
        </div>
      </div>

      {cikis && (
        <CikisModal
          konaklama={s}
          onKapat={() => setCikis(false)}
          onTamam={() => {
            setCikis(false);
            yenile();
          }}
        />
      )}
      {tasi && odalar.veri && (
        <OdaDegistirModal
          konaklama={s}
          odalar={odalar.veri}
          onKapat={() => setTasi(false)}
          onTamam={() => {
            setTasi(false);
            yenile();
          }}
        />
      )}
    </Sayfa>
  );
}
