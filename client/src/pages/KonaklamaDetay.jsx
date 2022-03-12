import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { kbs, konaklamalar, odalar as odaApi } from '../api';
import { hataMesaji } from '../api/istemci';
import useYukle from '../hooks/useYukle';
import Sayfa, { Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import Alan from '../components/Alan';
import Rozet, { BildirimRozeti } from '../components/Rozet';
import BildirimIslemleri from '../components/BildirimIslemleri';
import HesapKarti from '../components/HesapKarti';
import { CikisModal, OdaDegistirModal } from './Konaklamalar';
import { girisDegerinden, girisDegerine, trTarih } from '../utils/tarih';
import { BILDIRIM_TUR, kimlikMetni, konukAdi, KONAKLAMA_TUR } from '../utils/metin';

export default function KonaklamaDetay() {
  const { id } = useParams();
  const { veri, yukleniyor, hata, yenile } = useYukle(() => konaklamalar.oku(id), [id]);
  const durum = useYukle(() => kbs.durum(), []);
  const odalar = useYukle(() => odaApi.liste(), [veri]);
  const [cikis, setCikis] = useState(false);
  const [tasi, setTasi] = useState(false);
  const [planAcik, setPlanAcik] = useState(false);
  const [plan, setPlan] = useState('');
  const [planHata, setPlanHata] = useState('');

  if (yukleniyor && !veri) return <Yukleniyor />;
  if (hata) return <Uyari tur="hata">{hata}</Uyari>;

  const s = veri;
  const kbsMod = durum.veri ? durum.veri.mod : 'manuel';

  const planKaydet = async () => {
    setPlanHata('');
    try {
      await konaklamalar.plan(s.id, girisDegerinden(plan));
      setPlanAcik(false);
      yenile();
    } catch (e) {
      setPlanHata(hataMesaji(e));
    }
  };

  return (
    <Sayfa
      baslik={konukAdi(s)}
      aciklama={`Oda ${s.odaNo} - ${s.durum === 'konakliyor' ? 'konaklıyor' : 'ayrıldı'} - ${
        KONAKLAMA_TUR[s.tur] || s.tur
      }`}
      eylemler={
        <>
          {s.durum === 'konakliyor' && (
            <>
              <button type="button" className="dugme" onClick={() => setTasi(true)}>
                Oda değiştir
              </button>
              <button type="button" className="dugme dugme-birincil" onClick={() => setCikis(true)}>
                Çıkış kaydı
              </button>
            </>
          )}
        </>
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
            <span>Planlanan çıkış</span>
            {s.planlananCikis ? trTarih(s.planlananCikis) : '-'}{' '}
            {s.gecikenCikis && <Rozet tur="hata">gecikti</Rozet>}
            {s.durum === 'konakliyor' && (
              <button
                type="button"
                className="dugme dugme-sade dugme-kucuk"
                onClick={() => {
                  setPlan(girisDegerine(s.planlananCikis || ''));
                  setPlanAcik((a) => !a);
                }}
              >
                Değiştir
              </button>
            )}
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
          <div>
            <span>Rezervasyon</span>
            {s.rezervasyonId ? <Link to="/rezervasyonlar">#{s.rezervasyonId}</Link> : 'kapıdan'}
          </div>
        </div>
        {planAcik && (
          <div className="panel-ic-form" style={{ maxWidth: 420 }}>
            <Alan
              etiket="Yeni planlanan çıkış"
              not={s.grupKodu ? 'Gruptaki herkes için geçerli' : ''}
              hata={planHata}
            >
              <input type="datetime-local" value={plan} onChange={(e) => setPlan(e.target.value)} />
            </Alan>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="dugme dugme-kucuk dugme-birincil"
                onClick={planKaydet}
                disabled={!plan}
              >
                Kaydet
              </button>
              <button
                type="button"
                className="dugme dugme-kucuk"
                onClick={() => setPlanAcik(false)}
              >
                Vazgeç
              </button>
            </div>
          </div>
        )}
      </div>

      <HesapKarti konaklamaId={s.id} baslikId="hesap" />

      <div className="kart">
        <div className="kart-baslik">
          <h2>Oda geçmişi</h2>
          <Link to="/cizelge" className="dugme dugme-kucuk dugme-sade">
            Zaman çizelgesi
          </Link>
        </div>
        <div className="tablo-sarici" style={{ boxShadow: 'none' }}>
          <table className="tablo">
            <thead>
              <tr>
                <th>Oda</th>
                <th>Başlangıç</th>
                <th>Bitiş</th>
              </tr>
            </thead>
            <tbody>
              {s.odaGecmisi.map((o) => (
                <tr key={o.id}>
                  <td className="mono">{o.odaNo}</td>
                  <td className="sayi">{trTarih(o.baslangic)}</td>
                  <td className="sayi">
                    {o.bitis ? trTarih(o.bitis) : <span className="soluk">devam ediyor</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="kart">
        <div className="kart-baslik">
          <h2>KBS bildirimleri</h2>
          <Link to="/kbs" className="dugme dugme-kucuk dugme-sade">
            Kuyruğa git
          </Link>
        </div>
        <div className="tablo-sarici" style={{ boxShadow: 'none' }}>
          <table className="tablo">
            <thead>
              <tr>
                <th>Tür</th>
                <th>Durum</th>
                <th>Yol</th>
                <th>Deneme</th>
                <th>Gönderim</th>
                <th>Referans</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {s.bildirimler.map((b) => (
                <tr key={b.id}>
                  <td>{BILDIRIM_TUR[b.tur]}</td>
                  <td>
                    <BildirimRozeti durum={b.durum} />
                    {b.sonHata && b.durum === 'hata' && (
                      <div className="soluk" style={{ fontSize: '0.78rem', marginTop: 2 }}>
                        {b.sonHata}
                      </div>
                    )}
                  </td>
                  <td>{b.mod === 'manuel' ? 'portala elle' : 'web servisi'}</td>
                  <td className="sayi">{b.deneme}</td>
                  <td className="sayi">{b.gonderimZamani ? trTarih(b.gonderimZamani) : '-'}</td>
                  <td className="mono">{b.yanitRef || '-'}</td>
                  <td className="eylem">
                    <BildirimIslemleri bildirim={b} kbsMod={kbsMod} onGuncelle={yenile} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
