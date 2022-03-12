import { Link, useParams } from 'react-router-dom';
import { hesaplar as hesapApi } from '../api';
import useYukle from '../hooks/useYukle';
import Sayfa, { Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import { tl } from '../utils/para';
import { trTarih } from '../utils/tarih';
import { YONTEM } from '../utils/metin';

export default function HesapFisi() {
  const { id } = useParams();
  const { veri, yukleniyor, hata } = useYukle(() => hesapApi.fis(id), [id]);

  if (yukleniyor && !veri) return <Yukleniyor />;
  if (hata) return <Uyari tur="hata">{hata}</Uyari>;

  const h = veri;
  const k = h.konaklama;
  return (
    <Sayfa
      baslik="Konaklama fişi"
      eylemler={
        <>
          <Link to={`/konaklamalar/${h.konaklamaId}`} className="dugme">
            Konaklamaya dön
          </Link>
          <button type="button" className="dugme dugme-birincil" onClick={() => window.print()}>
            Yazdır
          </button>
        </>
      }
    >
      <div className="kart fis">
        <div className="fis-ust">
          <div>
            <b style={{ fontSize: '1.1rem' }}>{h.tesis.ad || 'Tesis'}</b>
            <div className="soluk">
              {[
                h.tesis.adres,
                [h.tesis.ilce, h.tesis.il].filter(Boolean).join(' / '),
                h.tesis.telefon,
              ]
                .filter(Boolean)
                .join(' - ')}
            </div>
          </div>
          <div className="sag">
            <div>
              Fiş no <b className="mono">H-{h.id}</b>
            </div>
            <div className="soluk">{trTarih(h.kapanis || h.olusturma)}</div>
          </div>
        </div>
        <div className="detay-izgara" style={{ marginTop: 14 }}>
          <div>
            <span>Konuk</span>
            {h.konuklar.map((x) => x.adSoyad).join(', ')}
          </div>
          <div>
            <span>Oda</span>
            {k.odaNo} {k.kisiSayisi > 1 ? `(${k.kisiSayisi} kişi)` : ''}
          </div>
          <div>
            <span>Giriş</span>
            {trTarih(k.girisZamani)}
          </div>
          <div>
            <span>Çıkış</span>
            {k.cikisZamani
              ? trTarih(k.cikisZamani)
              : k.planlananCikis
              ? trTarih(k.planlananCikis) + ' (planlanan)'
              : '-'}
          </div>
        </div>

        <table className="tablo" style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th>Açıklama</th>
              <th className="sag">Adet</th>
              <th className="sag">Birim</th>
              <th className="sag">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {h.kalemler.map((x) => (
              <tr key={x.id}>
                <td>{x.aciklama}</td>
                <td className="sag sayi">{x.adet}</td>
                <td className="sag sayi">{tl(x.birimFiyat)}</td>
                <td className="sag sayi">{tl(x.tutar)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} className="sag">
                <b>Toplam</b>
              </td>
              <td className="sag sayi">
                <b>{tl(h.toplam)}</b>
              </td>
            </tr>
            {h.tahsilatlar.map((t) => (
              <tr key={'t' + t.id}>
                <td colSpan={3} className="sag soluk">
                  Tahsilat ({YONTEM[t.yontem] || t.yontem}, {trTarih(t.tarih)})
                </td>
                <td className="sag sayi">-{tl(t.tutar)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} className="sag">
                <b>{h.bakiye < 0 ? 'İade' : 'Kalan'}</b>
              </td>
              <td className="sag sayi">
                <b>{tl(Math.abs(h.bakiye))}</b>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="soluk" style={{ marginTop: 16, fontSize: '0.82rem' }}>
          Bu belge bilgi amaçlıdır, fatura yerine geçmez.
        </p>
      </div>
    </Sayfa>
  );
}
