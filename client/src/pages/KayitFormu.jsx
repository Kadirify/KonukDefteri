import { Link, useParams } from 'react-router-dom';
import { konaklamalar } from '../api';
import useYukle from '../hooks/useYukle';
import useUyruklar, { uyrukAdi } from '../hooks/useUyruklar';
import Sayfa, { Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import { trGun, trTarih } from '../utils/tarih';
import { KONAKLAMA_TUR } from '../utils/metin';

// Konuğun imzaladığı kayıt formu: kimlik numaraları açık yazılır, altında KVKK metni
export default function KayitFormu() {
  const { id } = useParams();
  const uyruklar = useUyruklar();
  const { veri, yukleniyor, hata } = useYukle(() => konaklamalar.form(id), [id]);

  if (yukleniyor && !veri) return <Yukleniyor />;
  if (hata) return <Uyari tur="hata">{hata}</Uyari>;

  const f = veri;
  const k = f.konaklama;
  return (
    <Sayfa
      baslik="Konaklama kayıt formu"
      eylemler={
        <>
          <Link to={`/konaklamalar/${f.id}`} className="dugme">
            Konaklamaya dön
          </Link>
          <button type="button" className="dugme dugme-birincil" onClick={() => window.print()}>
            Yazdır
          </button>
        </>
      }
    >
      <Uyari tur="bilgi">Kimlik numaraları açık, açılış günlüğe yazıldı.</Uyari>
      <div className="kart fis kayit-formu">
        <div className="fis-ust">
          <div>
            <b style={{ fontSize: '1.1rem' }}>{f.tesis.ad || 'Tesis'}</b>
            <div className="soluk">
              {[
                f.tesis.adres,
                [f.tesis.ilce, f.tesis.il].filter(Boolean).join(' / '),
                f.tesis.telefon,
              ]
                .filter(Boolean)
                .join(' - ')}
            </div>
          </div>
          <div className="sag">
            <div>
              Form no <b className="mono">K-{f.id}</b>
            </div>
            <div className="soluk">{trTarih(k.girisZamani)}</div>
          </div>
        </div>

        <div className="detay-izgara" style={{ marginTop: 14 }}>
          <div>
            <span>Oda</span>
            {k.odaNo}
          </div>
          <div>
            <span>Konaklama</span>
            {KONAKLAMA_TUR[k.tur] || k.tur}
            {k.kisiSayisi > 1 ? ` - ${k.kisiSayisi} kişi` : ''}
          </div>
          <div>
            <span>Giriş</span>
            {trTarih(k.girisZamani)}
          </div>
          <div>
            <span>Planlanan çıkış</span>
            {k.planlananCikis ? trTarih(k.planlananCikis) : '-'}
          </div>
          <div>
            <span>Plaka</span>
            {k.plaka || '-'}
          </div>
          {k.grupKodu && (
            <div>
              <span>Grup</span>
              {k.grupKodu}
            </div>
          )}
        </div>

        <table className="tablo" style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th>Ad soyad</th>
              <th>Kimlik</th>
              <th>Uyruk</th>
              <th>Doğum</th>
              <th>Anne / baba adı</th>
              <th>Telefon</th>
            </tr>
          </thead>
          <tbody>
            {f.konuklar.map((x) => (
              <tr key={x.id}>
                <td>
                  <b>
                    {x.ad} {x.soyad}
                  </b>
                </td>
                <td className="mono">
                  {x.kimlikTuru === 'tc' ? x.tc || x.tcMaskeli : `${x.pasaportNo} (pasaport)`}
                </td>
                <td>{uyrukAdi(uyruklar, x.uyruk)}</td>
                <td className="sayi">
                  {x.dogumTarihi ? trGun(x.dogumTarihi) : '-'}
                  {x.dogumYeri ? ` ${x.dogumYeri}` : ''}
                </td>
                <td>{[x.anneAdi, x.babaAdi].filter(Boolean).join(' / ') || '-'}</td>
                <td className="mono">{x.telefon || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 style={{ marginTop: 22, fontSize: '0.95rem' }}>Kişisel verilerin korunması</h3>
        <div className="kvkk-metin">{f.kvkkMetni}</div>
        <p className="kvkk-onay">
          <span className="kutu" /> Yukarıdaki aydınlatma metnini okudum; kimlik bilgilerimin 1774
          sayılı Kanun gereği kolluk kuvvetlerine bildirileceğini biliyorum.
        </p>

        <div className="imza-alani">
          <div>Konuk imzası</div>
          <div>Teslim alan görevli</div>
        </div>
      </div>
    </Sayfa>
  );
}
