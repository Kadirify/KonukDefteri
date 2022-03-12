import { useState } from 'react';
import { raporlar } from '../api';
import useYukle from '../hooks/useYukle';
import useUyruklar, { uyrukAdi } from '../hooks/useUyruklar';
import { useAuth } from '../hooks/useAuth';
import Sayfa, { Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import { buAy, bugunYerel, trGun, trTarih } from '../utils/tarih';
import { REZ_KAYNAK, YONTEM } from '../utils/metin';
import { tl } from '../utils/para';
import { Link } from 'react-router-dom';

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

function Doluluk() {
  const [ay, setAy] = useState(buAy());
  const { veri, yukleniyor, hata } = useYukle(() => raporlar.doluluk(ay), [ay]);

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
                <small>Doluluk oranı</small>
                <b>%{veri.dolulukOrani}</b>
              </div>
              <div className="istatistik">
                <small>Oda sayısı</small>
                <b>{veri.odaSayisi}</b>
              </div>
              <div className="istatistik">
                <small>Ortalama kalış</small>
                <b>
                  {veri.ortalamaKalis}
                  <span className="soluk" style={{ fontSize: '0.9rem', fontWeight: 400 }}>
                    {' '}
                    gece
                  </span>
                </b>
              </div>
              <div className="istatistik">
                <small>Günübirlik</small>
                <b>{veri.gunubirlik}</b>
              </div>
              <div className="istatistik">
                <small>Temizlik</small>
                <b>
                  {veri.temizlik.gorev}
                  <span className="soluk" style={{ fontSize: '0.9rem', fontWeight: 400 }}>
                    {' '}
                    görev - ort. {veri.temizlik.ortalamaDakika} dk
                  </span>
                </b>
              </div>
            </div>
            <div className="izgara" style={{ gridTemplateColumns: '2fr 1fr', alignItems: 'start' }}>
              <div className="kart" style={{ marginTop: 0 }}>
                <h3 style={{ marginBottom: 8 }}>Gece gece doluluk</h3>
                {veri.gunler.map((g) => (
                  <div
                    key={g.gun}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '72px 1fr 48px',
                      gap: 8,
                      alignItems: 'center',
                      fontSize: '0.82rem',
                      padding: '2px 0',
                    }}
                  >
                    <span className="soluk sayi">{trGun(g.gun).slice(0, 5)}</span>
                    <span
                      style={{
                        background: 'var(--yuzey-2)',
                        borderRadius: 4,
                        height: 12,
                        overflow: 'hidden',
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          width: `${g.oran}%`,
                          height: '100%',
                          background: 'var(--renk-ana)',
                        }}
                      />
                    </span>
                    <span className="sayi sag">
                      {g.dolu}/{veri.odaSayisi}
                    </span>
                  </div>
                ))}
              </div>
              <div className="kart" style={{ marginTop: 0 }}>
                <h3 style={{ marginBottom: 8 }}>Rezervasyon kaynağı</h3>
                {veri.kaynaklar.length === 0 && <p className="soluk">-</p>}
                {veri.kaynaklar.map((k) => (
                  <div className="liste-satir" key={k.kaynak}>
                    <span>{REZ_KAYNAK[k.kaynak] || k.kaynak}</span>
                    <b className="sayi">{k.n}</b>
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

function Kasa() {
  const [baslangic, setBaslangic] = useState(bugunYerel());
  const [bitis, setBitis] = useState(bugunYerel());
  const { veri, yukleniyor, hata } = useYukle(
    () => raporlar.kasa(baslangic, bitis),
    [baslangic, bitis]
  );

  return (
    <>
      <div className="arac-cubugu yazdirma-gizle">
        <input
          type="date"
          value={baslangic}
          onChange={(e) => e.target.value && setBaslangic(e.target.value)}
        />
        <span className="soluk">-</span>
        <input
          type="date"
          value={bitis}
          onChange={(e) => e.target.value && setBitis(e.target.value)}
        />
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
              <h1>
                Kasa raporu {trGun(veri.baslangic)}
                {veri.bitis !== veri.baslangic ? ' - ' + trGun(veri.bitis) : ''}
              </h1>
            </div>
            <div className="istatistikler">
              <div className="istatistik">
                <small>Toplam tahsilat</small>
                <b style={{ fontSize: '1.2rem' }}>{tl(veri.toplam)}</b>
              </div>
              {Object.keys(YONTEM).map((y) => (
                <div className="istatistik" key={y}>
                  <small>{YONTEM[y]}</small>
                  <b style={{ fontSize: '1.2rem' }}>{tl(veri.yontemler[y] || 0)}</b>
                </div>
              ))}
              <div className={'istatistik' + (veri.acikBorc > 0 ? ' bekle' : '')}>
                <small>Açık hesaplarda kalan</small>
                <b style={{ fontSize: '1.2rem' }}>{tl(veri.acikBorc)}</b>
              </div>
            </div>
            <div className="tablo-sarici">
              <table className="tablo">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Konuk</th>
                    <th>Oda</th>
                    <th>Yöntem</th>
                    <th>Alan</th>
                    <th>Not</th>
                    <th className="sag">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {veri.satirlar.map((t) => (
                    <tr key={t.id}>
                      <td className="sayi">{trTarih(t.tarih)}</td>
                      <td>
                        <Link to={`/konaklamalar/${t.konaklamaId}#hesap`}>{t.konuk}</Link>
                      </td>
                      <td className="mono">{t.odaNo}</td>
                      <td>{YONTEM[t.yontem] || t.yontem}</td>
                      <td>{t.alan}</td>
                      <td className="soluk">{t.notlar}</td>
                      <td className="sag sayi">{tl(t.tutar)}</td>
                    </tr>
                  ))}
                  {veri.satirlar.length === 0 && (
                    <tr>
                      <td colSpan={7} className="soluk">
                        Bu aralıkta tahsilat yok.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
        <button
          type="button"
          className={sekme === 'doluluk' ? 'aktif' : ''}
          onClick={() => setSekme('doluluk')}
        >
          Doluluk
        </button>
        <button
          type="button"
          className={sekme === 'kasa' ? 'aktif' : ''}
          onClick={() => setSekme('kasa')}
        >
          Kasa
        </button>
      </div>
      {sekme === 'gunluk' && <GunlukListe />}
      {sekme === 'aylik' && <AylikOzet />}
      {sekme === 'doluluk' && <Doluluk />}
      {sekme === 'kasa' && <Kasa />}
    </Sayfa>
  );
}
