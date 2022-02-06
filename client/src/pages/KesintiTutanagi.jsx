import { Link, useParams } from 'react-router-dom';
import { kbs } from '../api';
import useYukle from '../hooks/useYukle';
import Sayfa, { Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import { BildirimRozeti } from '../components/Rozet';
import { trTarih } from '../utils/tarih';
import { BILDIRIM_TUR, kimlikMetni, konukAdi } from '../utils/metin';

export default function KesintiTutanagi() {
  const { id } = useParams();
  const { veri, yukleniyor, hata } = useYukle(() => kbs.kesinti(id), [id]);

  if (yukleniyor && !veri) return <Yukleniyor />;
  if (hata) return <Uyari tur="hata">{hata}</Uyari>;

  const k = veri;
  return (
    <Sayfa
      baslik={`Kesinti tutanağı ${k.tutanakNo}`}
      aciklama={`${trTarih(k.baslangic)} - ${trTarih(k.bitis)}`}
      eylemler={
        <>
          <Link to="/kbs" className="dugme">
            Kuyruğa dön
          </Link>
          <button type="button" className="dugme dugme-birincil" onClick={() => window.print()}>
            Yazdır
          </button>
        </>
      }
    >
      <div className="kart">
        <div className="yazdir-baslik">
          <h1>Kimlik Bildirim Sistemi Kesinti Tutanağı</h1>
          <p>
            Tutanak no: <b>{k.tutanakNo}</b>
          </p>
        </div>
        <div className="detay-izgara">
          <div>
            <span>Tesis</span>
            {k.tesis.ad || '-'} {k.tesis.tesisKodu && `(${k.tesis.tesisKodu})`}
          </div>
          <div>
            <span>Yer</span>
            {[k.tesis.ilce, k.tesis.il].filter(Boolean).join(' / ') || '-'}
          </div>
          <div>
            <span>Bağlı birim</span>
            {k.tesis.bolge === 'jandarma' ? 'Jandarma' : 'Emniyet'}
          </div>
          <div>
            <span>Kesinti</span>
            {trTarih(k.baslangic)} - {trTarih(k.bitis)}
          </div>
          <div>
            <span>Tutanağı düzenleyen</span>
            {k.olusturanAd || '-'} - {trTarih(String(k.olusturma).replace('T', ' ').slice(0, 16))}
          </div>
        </div>
        <p style={{ marginTop: 14 }}>
          Yukarıda belirtilen tarih ve saatler arasında Kimlik Bildirim Sistemi'ne erişilememiş, bu
          süre içinde yapılan giriş ve çıkışlar aşağıda listelenmiş olup sistem açıldığında
          bildirimleri yapılmıştır / yapılacaktır.
        </p>
        {k.neden && (
          <p>
            <b>Açıklama:</b> {k.neden}
          </p>
        )}
      </div>

      <div className="tablo-sarici">
        <table className="tablo">
          <thead>
            <tr>
              <th>İşlem</th>
              <th>Konuk</th>
              <th>Kimlik</th>
              <th>Oda</th>
              <th>Giriş</th>
              <th>Çıkış</th>
              <th>Bildirim</th>
            </tr>
          </thead>
          <tbody>
            {k.bildirimler.map((b) => (
              <tr key={b.id}>
                <td>{BILDIRIM_TUR[b.tur]}</td>
                <td>{konukAdi(b)}</td>
                <td className="mono">{kimlikMetni(b)}</td>
                <td className="mono">{b.odaNo}</td>
                <td className="sayi">{trTarih(b.girisZamani)}</td>
                <td className="sayi">{b.cikisZamani ? trTarih(b.cikisZamani) : '-'}</td>
                <td>
                  <BildirimRozeti durum={b.durum} />
                  {b.gonderimZamani && <span className="soluk"> {trTarih(b.gonderimZamani)}</span>}
                </td>
              </tr>
            ))}
            {k.bildirimler.length === 0 && (
              <tr>
                <td colSpan={7} className="soluk">
                  Bu aralıkta bekleyen bildirim yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="imza-alani">
        <div>Tesis yetkilisi</div>
        <div>Teslim alan</div>
      </div>
    </Sayfa>
  );
}
