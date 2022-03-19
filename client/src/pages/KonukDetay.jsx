import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { konuklar as konukApi } from '../api';
import useYukle from '../hooks/useYukle';
import useUyruklar, { uyrukAdi } from '../hooks/useUyruklar';
import Sayfa, { Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import Modal from '../components/Modal';
import Rozet from '../components/Rozet';
import KonukFormu from '../components/KonukFormu';
import { trTarih } from '../utils/tarih';
import { konukAdi } from '../utils/metin';

export default function KonukDetay() {
  const { id } = useParams();
  const uyruklar = useUyruklar();
  const { veri, yukleniyor, hata, yenile } = useYukle(() => konukApi.oku(id), [id]);
  const [duzenle, setDuzenle] = useState(false);
  const [tcGoster, setTcGoster] = useState(false);

  if (yukleniyor && !veri) return <Yukleniyor />;
  if (hata) return <Uyari tur="hata">{hata}</Uyari>;

  const k = veri;
  const konakliyor = k.konaklamalar.find((s) => s.durum === 'konakliyor');

  return (
    <Sayfa
      baslik={konukAdi(k)}
      aciklama={
        konakliyor
          ? `Şu an ${konakliyor.odaNo} numaralı odada`
          : `${k.konaklamalar.length} konaklama`
      }
      eylemler={
        <button type="button" className="dugme" onClick={() => setDuzenle(true)}>
          Kartı düzenle
        </button>
      }
    >
      {k.karaListe && (
        <Uyari tur="hata">
          Bu konuk kara listede{k.karaListeNeden ? ': ' + k.karaListeNeden : ''}.
        </Uyari>
      )}
      <div className="kart">
        <div className="detay-izgara">
          <div>
            <span>{k.kimlikTuru === 'tc' ? 'TC kimlik no' : 'Pasaport no'}</span>
            <span className="mono">
              {k.kimlikTuru === 'tc' ? (tcGoster && k.tc ? k.tc : k.tcMaskeli) : k.pasaportNo}
            </span>
            {k.kimlikTuru === 'tc' && k.tc && (
              <button
                type="button"
                className="dugme dugme-sade dugme-kucuk"
                onClick={() => setTcGoster((g) => !g)}
              >
                {tcGoster ? 'Gizle' : 'Göster'}
              </button>
            )}
          </div>
          <div>
            <span>Uyruk</span>
            {uyrukAdi(uyruklar, k.uyruk)}
          </div>
          <div>
            <span>Doğum</span>
            {trTarih(k.dogumTarihi) || '-'} {k.dogumYeri && `- ${k.dogumYeri}`}
          </div>
          <div>
            <span>Anne / baba</span>
            {[k.anneAdi, k.babaAdi].filter(Boolean).join(' / ') || '-'}
          </div>
          <div>
            <span>Cinsiyet</span>
            {k.cinsiyet === 'K' ? 'Kadın' : k.cinsiyet === 'E' ? 'Erkek' : '-'}
          </div>
          <div>
            <span>Telefon</span>
            {k.telefon || '-'}
          </div>
          <div>
            <span>KVKK</span>
            {k.kvkkOnay ? 'Bilgilendirildi' : 'İşaretlenmedi'}
          </div>
          <div>
            <span>Not</span>
            {k.notlar || '-'}
          </div>
          <div>
            <span>Durum</span>
            {k.karaListe ? <Rozet tur="hata">kara liste</Rozet> : 'Sorun yok'}
          </div>
        </div>
      </div>

      <div className="kart">
        <div className="kart-baslik">
          <h2>Konaklamalar</h2>
        </div>
        {k.konaklamalar.length === 0 ? (
          <p className="soluk">Konaklama yok.</p>
        ) : (
          <div className="tablo-sarici" style={{ boxShadow: 'none' }}>
            <table className="tablo">
              <thead>
                <tr>
                  <th>Oda</th>
                  <th>Giriş</th>
                  <th>Çıkış</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {k.konaklamalar.map((s) => (
                  <tr key={s.id}>
                    <td className="mono">{s.odaNo}</td>
                    <td className="sayi">{trTarih(s.girisZamani)}</td>
                    <td className="sayi">{s.cikisZamani ? trTarih(s.cikisZamani) : '-'}</td>
                    <td>
                      <Link to={`/konaklamalar/${s.id}`}>
                        {s.durum === 'konakliyor' ? 'Konaklıyor' : 'Ayrıldı'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {duzenle && (
        <Modal baslik="Konuk kartını düzenle" onKapat={() => setDuzenle(false)}>
          <KonukFormu
            duzenleme
            varsayilan={{ ...k, tc: '' }}
            onKaydet={async (v) => {
              await konukApi.duzenle(k.id, v);
              setDuzenle(false);
              yenile();
            }}
            onIptal={() => setDuzenle(false)}
          />
        </Modal>
      )}
    </Sayfa>
  );
}
