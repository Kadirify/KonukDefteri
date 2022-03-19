import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { konuklar as konukApi } from '../api';
import useYukle from '../hooks/useYukle';
import useUyruklar, { uyrukAdi } from '../hooks/useUyruklar';
import Sayfa, { BosDurum, Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import Modal from '../components/Modal';
import Rozet from '../components/Rozet';
import KonukFormu from '../components/KonukFormu';
import { trTarih } from '../utils/tarih';
import { kimlikMetni, konukAdi } from '../utils/metin';

export default function Konuklar() {
  const [q, setQ] = useState('');
  const [yeni, setYeni] = useState(false);
  const navigate = useNavigate();
  const uyruklar = useUyruklar();
  const { veri, yukleniyor, hata, yenile } = useYukle(() => konukApi.liste(q), [q]);

  return (
    <Sayfa
      baslik="Konuklar"
      eylemler={
        <button type="button" className="dugme dugme-birincil" onClick={() => setYeni(true)}>
          + Konuk kartı
        </button>
      }
    >
      <div className="arac-cubugu">
        <input
          type="search"
          placeholder="Ad, soyad, TC'nin son 4 hanesi ya da pasaport no"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 320 }}
        />
      </div>
      {hata && <Uyari tur="hata">{hata}</Uyari>}
      {yukleniyor && !veri ? (
        <Yukleniyor />
      ) : (
        <div className="tablo-sarici">
          <table className="tablo">
            <thead>
              <tr>
                <th>Ad soyad</th>
                <th>Kimlik</th>
                <th>Uyruk</th>
                <th>Doğum</th>
                <th>Telefon</th>
                <th>Kayıt</th>
              </tr>
            </thead>
            <tbody>
              {(veri || []).map((k) => (
                <tr key={k.id} className="tiklanir" onClick={() => navigate(`/konuklar/${k.id}`)}>
                  <td>
                    <b>{konukAdi(k)}</b>
                    {k.karaListe && (
                      <>
                        {' '}
                        <Rozet tur="hata">kara liste</Rozet>
                      </>
                    )}
                    {k.notlar && (
                      <div className="soluk" style={{ fontSize: '0.8rem' }}>
                        {k.notlar}
                      </div>
                    )}
                  </td>
                  <td className="mono">{kimlikMetni(k)}</td>
                  <td>{uyrukAdi(uyruklar, k.uyruk)}</td>
                  <td className="sayi">{trTarih(k.dogumTarihi)}</td>
                  <td>{k.telefon}</td>
                  <td className="soluk sayi">{trTarih(String(k.olusturma || '').slice(0, 10))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {veri && veri.length === 0 && (
            <BosDurum>{q ? 'Eşleşen konuk yok.' : 'Konuk yok.'}</BosDurum>
          )}
        </div>
      )}
      {yeni && (
        <Modal baslik="Yeni konuk kartı" onKapat={() => setYeni(false)}>
          <KonukFormu
            onKaydet={async (v) => {
              const k = await konukApi.ekle(v);
              setYeni(false);
              yenile();
              navigate(`/konuklar/${k.id}`);
            }}
            onIptal={() => setYeni(false)}
          />
        </Modal>
      )}
    </Sayfa>
  );
}
