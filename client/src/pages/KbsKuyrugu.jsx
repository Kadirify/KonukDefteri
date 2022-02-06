import { useState } from 'react';
import { Link } from 'react-router-dom';
import { kbs } from '../api';
import { hataAlanlari, hataMesaji } from '../api/istemci';
import useYukle from '../hooks/useYukle';
import Sayfa, { BosDurum, Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import Modal from '../components/Modal';
import Alan from '../components/Alan';
import { BildirimRozeti } from '../components/Rozet';
import BildirimIslemleri from '../components/BildirimIslemleri';
import { girisDegerinden, girisDegerine, simdiYerel, trTarih } from '../utils/tarih';
import { BILDIRIM_TUR, KBS_MOD, kimlikMetni, konukAdi } from '../utils/metin';

function KesintiFormu({ onKapat, onTamam }) {
  const [baslangic, setBaslangic] = useState(girisDegerine(simdiYerel().slice(0, 10) + ' 09:00'));
  const [bitis, setBitis] = useState(girisDegerine(simdiYerel()));
  const [neden, setNeden] = useState('');
  const [hata, setHata] = useState('');
  const [alanHata, setAlanHata] = useState({});
  const [mesgul, setMesgul] = useState(false);

  const kaydet = async () => {
    setMesgul(true);
    setHata('');
    setAlanHata({});
    try {
      onTamam(
        await kbs.kesintiEkle({
          baslangic: girisDegerinden(baslangic),
          bitis: girisDegerinden(bitis),
          neden,
        })
      );
    } catch (e) {
      setAlanHata(hataAlanlari(e));
      setHata(hataMesaji(e));
    } finally {
      setMesgul(false);
    }
  };

  return (
    <Modal baslik="Kesinti tutanağı" onKapat={onKapat}>
      <p className="soluk">Yazdırıp saklayın, denetimde isterler.</p>
      <div className="izgara">
        <Alan etiket="Kesinti başlangıcı" hata={alanHata.baslangic}>
          <input
            type="datetime-local"
            value={baslangic}
            onChange={(e) => setBaslangic(e.target.value)}
          />
        </Alan>
        <Alan etiket="Kesinti bitişi" hata={alanHata.bitis}>
          <input type="datetime-local" value={bitis} onChange={(e) => setBitis(e.target.value)} />
        </Alan>
        <Alan etiket="Neden / yapılanlar" genis hata={alanHata.neden}>
          <textarea
            value={neden}
            onChange={(e) => setNeden(e.target.value)}
            placeholder="KBS sayfası açılmadı"
          />
        </Alan>
      </div>
      {hata && <div className="form-hata">{hata}</div>}
      <div className="form-alt">
        <button type="button" className="dugme" onClick={onKapat}>
          Vazgeç
        </button>
        <button type="button" className="dugme dugme-birincil" onClick={kaydet} disabled={mesgul}>
          Tutanağı oluştur
        </button>
      </div>
    </Modal>
  );
}

export default function KbsKuyrugu() {
  const [sekme, setSekme] = useState('bekleyen');
  const [kesintiAcik, setKesintiAcik] = useState(false);
  const [testSonuc, setTestSonuc] = useState(null);
  const [testMesgul, setTestMesgul] = useState(false);
  const durum = useYukle(() => kbs.durum(), [sekme]);
  const liste = useYukle(() => kbs.bildirimler(sekme), [sekme]);
  const kesintiler = useYukle(() => kbs.kesintiler(), []);

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
        <>
          <button type="button" className="dugme" onClick={test} disabled={testMesgul}>
            {testMesgul ? 'Deneniyor...' : 'Bağlantı testi'}
          </button>
          <button
            type="button"
            className="dugme dugme-birincil"
            onClick={() => setKesintiAcik(true)}
          >
            Kesinti tutanağı
          </button>
        </>
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
                        style={{ fontSize: '0.78rem', marginTop: 2, maxWidth: 280 }}
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

      <div className="kart" style={{ marginTop: 20 }}>
        <div className="kart-baslik">
          <h2>Kesinti tutanakları</h2>
        </div>
        {kesintiler.veri && kesintiler.veri.length === 0 && <p className="soluk">Tutanak yok.</p>}
        {(kesintiler.veri || []).map((k) => (
          <div className="liste-satir" key={k.id}>
            <span>
              <b className="mono">{k.tutanakNo}</b> - {trTarih(k.baslangic)} - {trTarih(k.bitis)}
              {k.neden && <span className="soluk"> - {k.neden}</span>}
            </span>
            <Link to={`/kbs/kesintiler/${k.id}`} className="dugme dugme-kucuk">
              Tutanak
            </Link>
          </div>
        ))}
      </div>

      {kesintiAcik && (
        <KesintiFormu
          onKapat={() => setKesintiAcik(false)}
          onTamam={() => {
            setKesintiAcik(false);
            kesintiler.yenile();
          }}
        />
      )}
    </Sayfa>
  );
}
