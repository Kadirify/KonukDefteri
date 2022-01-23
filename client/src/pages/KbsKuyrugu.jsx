import { useState } from 'react';
import { Link } from 'react-router-dom';
import { kbs } from '../api';
import { hataMesaji } from '../api/istemci';
import useYukle from '../hooks/useYukle';
import Sayfa, { BosDurum, Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import { BildirimRozeti } from '../components/Rozet';
import BildirimIslemleri from '../components/BildirimIslemleri';
import { trTarih } from '../utils/tarih';
import { BILDIRIM_TUR, KBS_MOD, kimlikMetni, konukAdi } from '../utils/metin';

export default function KbsKuyrugu() {
  const [sekme, setSekme] = useState('bekleyen');
  const [testSonuc, setTestSonuc] = useState(null);
  const [testMesgul, setTestMesgul] = useState(false);
  const durum = useYukle(() => kbs.durum(), [sekme]);
  const liste = useYukle(() => kbs.bildirimler(sekme), [sekme]);

  const guncelle = (b) => {
    liste.setVeri((l) => (l || []).map((x) => (x.id === b.id ? b : x)));
    durum.yenile();
  };

  const test = async () => {
    setTestMesgul(true);
    setTestSonuc(null);
    try {
      setTestSonuc(await kbs.test());
    } catch (e) {
      setTestSonuc({ tamam: false, mesaj: hataMesaji(e) });
    } finally {
      setTestMesgul(false);
    }
  };

  const d = durum.veri;

  return (
    <Sayfa
      baslik="KBS kuyruğu"
      eylemler={
        <button type="button" className="dugme" onClick={test} disabled={testMesgul}>
          {testMesgul ? 'Deneniyor...' : 'Bağlantı testi'}
        </button>
      }
    >
      {testSonuc && (
        <Uyari
          tur={testSonuc.tamam ? 'basari' : 'hata'}
          eylem={
            <button type="button" className="dugme dugme-kucuk" onClick={() => setTestSonuc(null)}>
              Tamam
            </button>
          }
        >
          {testSonuc.mesaj}
        </Uyari>
      )}
      {d && (
        <div className="istatistikler">
          <div className="istatistik">
            <small>Mod</small>
            <b style={{ fontSize: '1rem' }}>{KBS_MOD[d.mod] || d.mod}</b>
            <div className="soluk" style={{ fontSize: '0.78rem' }}>
              {d.bolge === 'jandarma' ? 'Jandarma bölgesi' : 'Emniyet bölgesi'} - tesis kodu{' '}
              {d.tesisKodu || '-'}
            </div>
          </div>
          <div className={'istatistik' + (d.bekleyen ? ' bekle' : '')}>
            <small>Bekleyen</small>
            <b>{d.bekleyen}</b>
          </div>
          <div className={'istatistik' + (d.hatali ? ' dikkat' : '')}>
            <small>Hatalı</small>
            <b>{d.hatali}</b>
          </div>
          <div className="istatistik">
            <small>Gönderilen</small>
            <b>{d.gonderilen}</b>
            <div className="soluk" style={{ fontSize: '0.78rem' }}>
              son: {d.sonGonderim ? trTarih(d.sonGonderim) : '-'}
            </div>
          </div>
        </div>
      )}
      {d && d.mod === 'manuel' && (
        <Uyari
          tur="bilgi"
          eylem={
            <Link to="/ayarlar" className="dugme dugme-kucuk">
              Ayarlar
            </Link>
          }
        >
          Manuel mod: bildirimler portala elle giriliyor.
        </Uyari>
      )}

      <div className="sekmeler">
        {[
          ['bekleyen', 'Bekleyen'],
          ['hata', 'Hatalı'],
          ['gonderildi', 'Gönderilen'],
          ['hepsi', 'Hepsi'],
        ].map(([k, ad]) => (
          <button
            type="button"
            key={k}
            className={sekme === k ? 'aktif' : ''}
            onClick={() => setSekme(k)}
          >
            {ad}
          </button>
        ))}
      </div>

      {liste.hata && <Uyari tur="hata">{liste.hata}</Uyari>}
      {liste.yukleniyor && !liste.veri ? (
        <Yukleniyor />
      ) : (
        <div className="tablo-sarici">
          <table className="tablo">
            <thead>
              <tr>
                <th>Oluşturma</th>
                <th>Tür</th>
                <th>Konuk</th>
                <th>Oda</th>
                <th>Durum</th>
                <th>Deneme</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(liste.veri || []).map((b) => (
                <tr key={b.id}>
                  <td className="sayi soluk">
                    {trTarih(String(b.olusturma).replace('T', ' ').slice(0, 16))}
                  </td>
                  <td>{BILDIRIM_TUR[b.tur]}</td>
                  <td>
                    <Link to={`/konaklamalar/${b.konaklamaId}`}>{konukAdi(b)}</Link>
                    <div className="soluk mono" style={{ fontSize: '0.78rem' }}>
                      {kimlikMetni(b)}
                    </div>
                  </td>
                  <td className="mono">{b.odaNo}</td>
                  <td>
                    <BildirimRozeti durum={b.durum} />
                    {b.durum === 'hata' && b.sonHata && (
                      <div
                        className="soluk"
                        style={{
                          fontSize: '0.78rem',
                          marginTop: 2,
                          maxWidth: 280,
                        }}
                      >
                        {b.sonHata}
                      </div>
                    )}
                    {b.durum === 'gonderildi' && (
                      <div className="soluk" style={{ fontSize: '0.78rem', marginTop: 2 }}>
                        {trTarih(b.gonderimZamani)}{' '}
                        {b.yanitRef && <span className="mono">- {b.yanitRef}</span>}
                      </div>
                    )}
                  </td>
                  <td className="sayi">
                    {b.deneme}
                    {d && b.deneme >= d.enFazlaDeneme && b.durum === 'hata' && (
                      <div className="soluk" style={{ fontSize: '0.75rem' }}>
                        otomatik deneme durdu
                      </div>
                    )}
                  </td>
                  <td className="eylem">
                    <BildirimIslemleri
                      bildirim={b}
                      kbsMod={d ? d.mod : 'manuel'}
                      onGuncelle={guncelle}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {liste.veri && liste.veri.length === 0 && <BosDurum>Bu sekmede bildirim yok.</BosDurum>}
        </div>
      )}
    </Sayfa>
  );
}
