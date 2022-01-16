import { useState } from 'react';
import { odalar as odaApi } from '../api';
import useYukle from '../hooks/useYukle';
import { useAuth } from '../hooks/useAuth';
import Sayfa, { BosDurum, Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import Modal from '../components/Modal';
import OdaFormu from '../components/OdaFormu';

export default function Odalar() {
  const { kullanici } = useAuth();
  const yonetici = kullanici.rol === 'yonetici';
  const { veri, yukleniyor, hata, yenile } = useYukle(() => odaApi.liste(), []);
  const [form, setForm] = useState(null);
  const [mesaj, setMesaj] = useState('');

  const kaydet = async (v) => {
    if (form.id) await odaApi.duzenle(form.id, v);
    else await odaApi.ekle(v);
    setForm(null);
    setMesaj(form.id ? `Oda ${v.odaNo} güncellendi.` : `Oda ${v.odaNo} eklendi.`);
    yenile();
  };

  if (yukleniyor && !veri) return <Yukleniyor />;
  if (hata) return <Uyari tur="hata">{hata}</Uyari>;

  const liste = veri || [];

  return (
    <Sayfa
      baslik="Odalar"
      eylemler={
        yonetici ? (
          <button type="button" className="dugme dugme-birincil" onClick={() => setForm({})}>
            + Oda
          </button>
        ) : null
      }
    >
      {mesaj && (
        <Uyari
          tur="basari"
          eylem={
            <button type="button" className="dugme dugme-kucuk" onClick={() => setMesaj('')}>
              Tamam
            </button>
          }
        >
          {mesaj}
        </Uyari>
      )}
      <div className="tablo-sarici">
        <table className="tablo">
          <thead>
            <tr>
              <th>Oda</th>
              <th>Tip</th>
              <th>Kat</th>
              <th>Kapasite</th>
              <th>Durum</th>
              <th>Aktif</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {liste.map((o) => (
              <tr key={o.id}>
                <td className="mono">{o.odaNo}</td>
                <td>{o.tip || '-'}</td>
                <td>{o.kat || '-'}</td>
                <td className="sayi">{o.kapasite}</td>
                <td>
                  {o.konaklayanlar.length ? (
                    <>
                      <b>
                        Dolu ({o.konaklayanlar.length}/{o.kapasite})
                      </b>{' '}
                      <span className="soluk">
                        {o.konaklayanlar.map((k) => `${k.ad} ${k.soyad}`).join(', ')}
                      </span>
                    </>
                  ) : (
                    'Boş'
                  )}
                </td>
                <td>{o.aktif ? 'Evet' : <span className="soluk">Hayır</span>}</td>
                <td className="eylem">
                  {yonetici && (
                    <button type="button" className="dugme dugme-kucuk" onClick={() => setForm(o)}>
                      Düzenle
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {liste.length === 0 && <BosDurum>Oda tanımlı değil, Ayarlar > Katlar ve odalar</BosDurum>}
      </div>

      {form && (
        <Modal baslik={form.id ? `Oda ${form.odaNo}` : 'Yeni oda'} onKapat={() => setForm(null)}>
          <OdaFormu
            varsayilan={form.id ? form : null}
            onKaydet={kaydet}
            onIptal={() => setForm(null)}
          />
        </Modal>
      )}
    </Sayfa>
  );
}
