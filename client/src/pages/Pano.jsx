import { Link } from 'react-router-dom';
import { pano } from '../api';
import useYukle from '../hooks/useYukle';
import Sayfa, { Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import { trTarih } from '../utils/tarih';
import { islemMetni, KBS_MOD } from '../utils/metin';

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
            Oda haritası
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
          <b>
            {p.bugunCikis}
            <span className="soluk" style={{ fontSize: '0.9rem', fontWeight: 400 }}>
              {' '}
              / {p.bugunCikacak} planlı
            </span>
          </b>
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
        <div className={'istatistik' + (p.gecikenCikis ? ' dikkat' : '')}>
          <small>Geciken çıkış</small>
          <b>{p.gecikenCikis}</b>
        </div>
        <div className={'istatistik' + (p.oda.kirli ? ' bekle' : '')}>
          <small>Kirli oda</small>
          <b>{p.oda.kirli}</b>
        </div>
        <div className="istatistik">
          <small>Temizleniyor / bakımda</small>
          <b>
            {p.oda.temizleniyor + p.oda.kontrol}
            <span className="soluk" style={{ fontSize: '0.9rem', fontWeight: 400 }}>
              {' '}
              / {p.oda.bakimda}
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
          {p.hatali} bildirim KBS'ye gönderilemedi.
        </Uyari>
      )}

      <div
        className="izgara"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}
      >
        <div className="kart" style={{ marginTop: 0 }}>
          <div className="kart-baslik">
            <h2>Son işlemler</h2>
            <span className="soluk">
              KBS: {KBS_MOD[p.kbsMod] || p.kbsMod}
            </span>
          </div>
          {p.sonIslemler.length === 0 ? (
            <p className="soluk">Kayıt yok.</p>
          ) : (
            p.sonIslemler.map((i) => (
              <div className="liste-satir" key={i.id}>
                <span>
                  <b>{i.kullanici}</b> {islemMetni(i.islem).toLowerCase()}
                  {i.hedef && <span className="soluk mono"> - {i.hedef}</span>}
                </span>
                <span className="soluk sayi">{trTarih(i.zaman)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </Sayfa>
  );
}
