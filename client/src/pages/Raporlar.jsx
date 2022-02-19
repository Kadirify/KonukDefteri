import { useState } from 'react';
import { raporlar } from '../api';
import useYukle from '../hooks/useYukle';
import useUyruklar, { uyrukAdi } from '../hooks/useUyruklar';
import { useAuth } from '../hooks/useAuth';
import Sayfa, { Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import { buAy, bugunYerel, trGun, trTarih } from '../utils/tarih';

function GunlukListe() {
  const { kullanici } = useAuth();
  const [tarih, setTarih] = useState(bugunYerel());
  const [tam, setTam] = useState(false);
  const { veri, yukleniyor, hata } = useYukle(() => raporlar.gunluk(tarih, tam), [tarih, tam]);
  const uyruklar = useUyruklar();

  return (
    <>
      <div className="arac-cubugu yazdirma-gizle">
        <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
        {kullanici.rol === 'yonetici' && (
          <label className="secenekler">
            <input type="checkbox" checked={tam} onChange={(e) => setTam(e.target.checked)} />
            <span>TC numaralarını tam göster (günlüğe yazılır)</span>
          </label>
        )}
        <button
          type="button"
          className="dugme"
          onClick={() => window.print()}
          style={{ marginLeft: 'auto' }}
        >
          Yazdır
        </button>
      </div>
      {hata && <Uyari tur="hata">{hata}</Uyari>}
      {yukleniyor && !veri ? (
        <Yukleniyor />
      ) : (
        veri && (
          <>
            <div className="yazdir-baslik">
              <h1>Günlük konaklayan listesi - {trGun(veri.tarih)}</h1>
              <p>
                {veri.tesis.ad} {veri.tesis.tesisKodu && `(${veri.tesis.tesisKodu})`} -{' '}
                {veri.tesis.adres}
              </p>
            </div>
            <div className="tablo-sarici">
              <table className="tablo">
                <thead>
                  <tr>
                    <th>Oda</th>
                    <th>Ad soyad</th>
                    <th>Kimlik no</th>
                    <th>Uyruk</th>
                    <th>Doğum</th>
                    <th>Giriş</th>
                    <th>Çıkış</th>
                    <th>Plaka</th>
                  </tr>
                </thead>
                <tbody>
                  {veri.satirlar.map((s) => (
                    <tr key={s.id}>
                      <td className="mono">{s.odaNo}</td>
                      <td>
                        {s.ad} {s.soyad}
                      </td>
                      <td className="mono">{s.kimlikNo}</td>
                      <td>{uyrukAdi(uyruklar, s.uyruk)}</td>
                      <td className="sayi">{trTarih(s.dogumTarihi)}</td>
                      <td className="sayi">{trTarih(s.girisZamani)}</td>
                      <td className="sayi">{s.cikisZamani ? trTarih(s.cikisZamani) : '-'}</td>
                      <td className="mono">{s.plaka}</td>
                    </tr>
                  ))}
                  {veri.satirlar.length === 0 && (
                    <tr>
                      <td colSpan={8} className="soluk">
                        Bu tarihte konaklayan yok.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="soluk yazdirma-gizle" style={{ marginTop: 8 }}>
              {veri.satirlar.length} kişi.
            </p>
          </>
        )
      )}
    </>
  );
}

function AylikOzet() {
  const [ay, setAy] = useState(buAy());
  const { veri, yukleniyor, hata } = useYukle(() => raporlar.aylik(ay), [ay]);
  const uyruklar = useUyruklar();

  return (
    <>
      <div className="arac-cubugu yazdirma-gizle">
        <input type="month" value={ay} onChange={(e) => setAy(e.target.value)} />
      </div>
      {hata && <Uyari tur="hata">{hata}</Uyari>}
      {yukleniyor && !veri ? (
        <Yukleniyor />
      ) : (
        veri && (
          <>
            <div className="istatistikler">
              <div className="istatistik">
                <small>Giriş</small>
                <b>{veri.toplamGiris}</b>
              </div>
              <div className="istatistik">
                <small>Çıkış</small>
                <b>{veri.toplamCikis}</b>
              </div>
              <div className="istatistik">
                <small>Bildirim gönderildi</small>
                <b>{veri.bildirim.gonderildi}</b>
              </div>
              <div className={'istatistik' + (veri.bildirim.bekleyen ? ' bekle' : '')}>
                <small>Bekleyen</small>
                <b>{veri.bildirim.bekleyen}</b>
              </div>
              <div className={'istatistik' + (veri.bildirim.hata ? ' dikkat' : '')}>
                <small>Hatalı</small>
                <b>{veri.bildirim.hata}</b>
              </div>
            </div>
            <div className="izgara" style={{ gridTemplateColumns: '2fr 1fr', alignItems: 'start' }}>
              <div className="tablo-sarici">
                <table className="tablo">
                  <thead>
                    <tr>
                      <th>Gün</th>
                      <th className="sag">Giriş</th>
                      <th className="sag">Çıkış</th>
                    </tr>
                  </thead>
                  <tbody>
                    {veri.gunler.map((g) => (
                      <tr key={g.gun}>
                        <td>{trGun(g.gun)}</td>
                        <td className="sag sayi">{g.giris}</td>
                        <td className="sag sayi">{g.cikis}</td>
                      </tr>
                    ))}
                    {veri.gunler.length === 0 && (
                      <tr>
                        <td colSpan={3} className="soluk">
                          Hareket yok
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="kart">
                <h3 style={{ marginBottom: 8 }}>Uyruk dağılımı</h3>
                {veri.uyruklar.length === 0 && <p className="soluk">-</p>}
                {veri.uyruklar.map((u) => (
                  <div className="liste-satir" key={u.uyruk}>
                    <span>{uyrukAdi(uyruklar, u.uyruk)}</span>
                    <b className="sayi">{u.n}</b>
                  </div>
                ))}
              </div>
            </div>
          </>
        )
      )}
    </>
  );
}

export default function Raporlar() {
  const [sekme, setSekme] = useState('gunluk');
  return (
    <Sayfa baslik="Raporlar">
      <div className="sekmeler yazdirma-gizle">
        <button
          type="button"
          className={sekme === 'gunluk' ? 'aktif' : ''}
          onClick={() => setSekme('gunluk')}
        >
          Günlük konaklayan listesi
        </button>
        <button
          type="button"
          className={sekme === 'aylik' ? 'aktif' : ''}
          onClick={() => setSekme('aylik')}
        >
          Aylık özet
        </button>
      </div>
      {sekme === 'gunluk' && <GunlukListe />}
      {sekme === 'aylik' && <AylikOzet />}
    </Sayfa>
  );
}
