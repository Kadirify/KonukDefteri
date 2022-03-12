import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  hesaplar as hesapApi,
  katlar as katApi,
  konaklamalar as konaklamaApi,
  odalar as odaApi,
  temizlik as temizlikApi,
} from '../api';
import { hataMesaji } from '../api/istemci';
import useYukle from '../hooks/useYukle';
import { useAuth } from '../hooks/useAuth';
import Sayfa, { BosDurum, Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import Alan from '../components/Alan';
import Rozet from '../components/Rozet';
import OdaFormu from '../components/OdaFormu';
import { CikisModal, GirisModal, OdaDegistirModal } from './Konaklamalar';
import { girisDegerinden, girisDegerine, neKadarOldu, saatDakika, trTarih } from '../utils/tarih';
import { GOREV_TUR, REZ_KAYNAK, TEMIZLIK } from '../utils/metin';
import { tl } from '../utils/para';

// Kutunun üst kenar rengi: tek bir anlam
export function kutuSinifi(o) {
  if (o.tur === 'ortak') return 'ortak';
  if (o.kullanim === 'bakimda') return 'bakim';
  if (o.kullanim === 'kapali') return 'kapali';
  if (o.doluluk === 'dolu') return 'dolu';
  if (o.temizlik === 'kirli') return 'kirli';
  if (o.temizlik === 'temizleniyor') return 'temizleniyor';
  if (o.temizlik === 'kontrol') return 'kontrol';
  if (o.doluluk === 'rezerve') return 'rezerve';
  return 'temiz';
}

function OdaKutusu({ oda, secili, onSec, gizli }) {
  const sinif = kutuSinifi(oda);
  let kim = '';
  let d = '';
  const etiketler = [];
  if (oda.tur === 'ortak') {
    kim = oda.tip || 'Ortak alan';
  } else if (oda.kullanim === 'bakimda') {
    kim = 'Bakımda';
    d = oda.bakimNotu || (oda.bakimBitis ? 'bitiş ' + trTarih(oda.bakimBitis) : '');
  } else if (oda.kullanim === 'kapali') {
    kim = 'Kapalı';
    d = oda.notlar;
  } else if (oda.doluluk === 'dolu') {
    const ilk = oda.konaklayanlar[0];
    kim = gizli
      ? `${oda.konaklayanlar.length} kişi`
      : `${ilk.ad} ${ilk.soyad}` +
        (oda.konaklayanlar.length > 1 ? ` +${oda.konaklayanlar.length - 1}` : '');
    d = `${saatDakika(ilk.girisZamani) || trTarih(ilk.girisZamani)} - çıkış ${
      oda.planlananCikis
        ? trTarih(oda.planlananCikis).slice(0, 5) + ' ' + saatDakika(oda.planlananCikis)
        : '-'
    }`;
    if (oda.gecikenCikis) etiketler.push(['hata', 'geciken çıkış']);
    if (oda.temizlik !== 'temiz')
      etiketler.push(['uyari', TEMIZLIK[oda.temizlik].etiket.toLowerCase()]);
    if (ilk.tur === 'gunubirlik') etiketler.push(['basari', 'günübirlik']);
  } else {
    kim = oda.temizlik === 'temiz' ? 'Boş' : TEMIZLIK[oda.temizlik].etiket;
    if (oda.rezervasyon) {
      d = `${gizli ? 'rezerve' : oda.rezervasyon.adSoyad} - ${
        REZ_KAYNAK[oda.rezervasyon.kaynak] || oda.rezervasyon.kaynak
      }`;
      etiketler.push(['bilgi', 'bugün rezerve']);
    } else if (oda.sonTemizlik) {
      d = `son temizlik ${trTarih(oda.sonTemizlik)}`;
    }
    if (oda.temizlik === 'kirli') etiketler.push(['uyari', 'temizlik bekliyor']);
    if (oda.temizlik === 'temiz' && !oda.rezervasyon) etiketler.push(['basari', 'temiz']);
  }
  return (
    <button
      type="button"
      className={`kutu ${sinif}${secili ? ' secili' : ''}`}
      onClick={() => oda.tur !== 'ortak' && onSec(oda)}
      aria-pressed={secili}
    >
      <span className="no">
        {oda.odaNo}
        <small>{oda.tur === 'ortak' ? '' : `${oda.kapasite} kişi`}</small>
      </span>
      <span className="kim">{kim}</span>
      {d && <span className="d">{d}</span>}
      {etiketler.length > 0 && (
        <span className="etiketler">
          {etiketler.map(([tur, metin]) => (
            <Rozet key={metin} tur={tur}>
              {metin}
            </Rozet>
          ))}
        </span>
      )}
    </button>
  );
}

function KatSeridi({ kat, odalar, secili, onSec, gizli }) {
  const koridorlu = kat.koridor !== 'yok' && odalar.length > 1;
  const yarim = Math.ceil(odalar.length / 2);
  const sol = koridorlu ? odalar.slice(0, yarim) : odalar;
  const sag = koridorlu ? odalar.slice(yarim) : [];
  const sutunlar = koridorlu
    ? `repeat(${sol.length}, minmax(0, 1fr)) 22px repeat(${Math.max(
        sag.length,
        1
      )}, minmax(0, 1fr))`
    : `repeat(auto-fill, minmax(150px, 1fr))`;
  const dolu = odalar.filter((o) => o.doluluk === 'dolu').length;
  return (
    <div className="kat-serit">
      <div className="kat-etiket">
        {kat.ad}
        <small>
          {odalar.filter((o) => o.tur === 'oda').length} oda - {dolu} dolu
        </small>
      </div>
      <div className="kat-odalar" style={{ gridTemplateColumns: sutunlar }}>
        {sol.map((o) => (
          <OdaKutusu key={o.id} oda={o} secili={secili === o.id} onSec={onSec} gizli={gizli} />
        ))}
        {koridorlu && <div className="koridor" aria-hidden="true" />}
        {sag.map((o) => (
          <OdaKutusu key={o.id} oda={o} secili={secili === o.id} onSec={onSec} gizli={gizli} />
        ))}
      </div>
    </div>
  );
}

function OdaPaneli({
  oda,
  katlar,
  gizli,
  onKapat,
  onDegisti,
  acGiris,
  acCikis,
  acTasi,
  acDuzenle,
}) {
  const { kullanici } = useAuth();
  const [hata, setHata] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const [bakimAcik, setBakimAcik] = useState(false);
  const [bakimNot, setBakimNot] = useState('');
  const [bakimBitis, setBakimBitis] = useState('');
  const [planAcik, setPlanAcik] = useState(false);
  const [plan, setPlan] = useState('');
  const gecmis = useYukle(() => odaApi.gecmis(oda.id, 30), [oda.id, oda.temizlik, oda.doluluk]);
  const yonetici = kullanici.rol === 'yonetici';
  const resepsiyon = kullanici.rol !== 'kat_gorevlisi';

  const calistir = async (fn, mesaj) => {
    setMesgul(true);
    setHata('');
    try {
      await fn();
      onDegisti(mesaj);
    } catch (e) {
      setHata(hataMesaji(e));
    } finally {
      setMesgul(false);
    }
  };

  const temizlikYap = (durum) =>
    calistir(
      () => odaApi.temizlik(oda.id, { durum }),
      `Oda ${oda.odaNo}: ${TEMIZLIK[durum].etiket.toLowerCase()}`
    );
  const bakimaAl = () =>
    calistir(async () => {
      await odaApi.bakim(oda.id, { bakimda: true, notlar: bakimNot, bitis: bakimBitis });
      setBakimAcik(false);
    }, `Oda ${oda.odaNo} bakıma alındı`);
  const bakimdanCikar = () =>
    calistir(
      () => odaApi.bakim(oda.id, { bakimda: false }),
      `Oda ${oda.odaNo} bakımdan çıktı, temizlik bekliyor`
    );
  const kullanimDegistir = (kullanim) =>
    calistir(
      () =>
        odaApi.duzenle(oda.id, {
          odaNo: oda.odaNo,
          tip: oda.tip,
          kapasite: oda.kapasite,
          katId: oda.kat ? oda.kat.id : katlar[0].id,
          sira: oda.sira,
          tur: oda.tur,
          ozellikler: oda.ozellikler.join(', '),
          notlar: oda.notlar,
          kullanim,
        }),
      kullanim === 'kapali' ? `Oda ${oda.odaNo} kapatıldı` : `Oda ${oda.odaNo} açıldı`
    );
  const gunlukGorev = () =>
    calistir(
      () => temizlikApi.ekle({ odaId: oda.id, tur: 'gunluk' }),
      `Oda ${oda.odaNo} için günlük temizlik görevi açıldı`
    );
  const planKaydet = () =>
    calistir(async () => {
      await konaklamaApi.plan(oda.konaklayanlar[0].konaklamaId, girisDegerinden(plan));
      setPlanAcik(false);
    }, 'Planlanan çıkış güncellendi');

  const ilk = oda.konaklayanlar[0];
  const dolu = oda.doluluk === 'dolu';
  const hesap = useYukle(
    () => (dolu && !gizli ? hesapApi.konaklama(ilk.konaklamaId) : Promise.resolve(null)),
    [dolu ? ilk.konaklamaId : 0, gizli]
  );

  return (
    <aside className="panel">
      <div className="panel-ust">
        <h2>Oda {oda.odaNo}</h2>
        <span>
          <Rozet
            tur={
              dolu ? 'bilgi' : oda.kullanim !== 'kullanimda' ? 'hata' : TEMIZLIK[oda.temizlik].tur
            }
          >
            {oda.kullanim === 'bakimda'
              ? 'Bakımda'
              : oda.kullanim === 'kapali'
              ? 'Kapalı'
              : dolu
              ? 'Dolu'
              : TEMIZLIK[oda.temizlik].etiket}
          </Rozet>{' '}
          <button
            type="button"
            className="dugme dugme-sade dugme-kucuk"
            onClick={onKapat}
            aria-label="Paneli kapat"
          >
            ×
          </button>
        </span>
      </div>

      <div className="panel-satir">
        <span>Oda</span>
        <b>
          {oda.tip || 'Oda'} - {oda.kapasite} kişi{oda.kat ? ` - ${oda.kat.ad}` : ''}
          {oda.ozellikler.length > 0 && (
            <div className="soluk" style={{ fontWeight: 400 }}>
              {oda.ozellikler.join(' - ')}
            </div>
          )}
        </b>
      </div>
      {dolu && (
        <>
          <div className="panel-satir">
            <span>Konuklar</span>
            <b>
              {oda.konaklayanlar.map((k) => (
                <div key={k.konaklamaId}>
                  {gizli ? (
                    'Konuk'
                  ) : (
                    <Link to={`/konaklamalar/${k.konaklamaId}`}>
                      {k.ad} {k.soyad}
                    </Link>
                  )}
                  {k.tur === 'gunubirlik' && <span className="soluk"> - günübirlik</span>}
                </div>
              ))}
            </b>
          </div>
          <div className="panel-satir">
            <span>Giriş</span>
            <b>
              {trTarih(ilk.girisZamani)}{' '}
              <span className="soluk">- {neKadarOldu(ilk.girisZamani)} oldu</span>
            </b>
          </div>
          {hesap.veri && (
            <div className="panel-satir">
              <span>Hesap</span>
              <b>
                {hesap.veri.bakiye > 0 ? (
                  <span style={{ color: 'var(--hata)' }}>kalan {tl(hesap.veri.bakiye)}</span>
                ) : hesap.veri.bakiye < 0 ? (
                  <span style={{ color: 'var(--uyari)' }}>iade {tl(-hesap.veri.bakiye)}</span>
                ) : (
                  <span style={{ color: 'var(--basari)' }}>ödendi</span>
                )}
                <span className="soluk" style={{ fontWeight: 400 }}>
                  {' '}
                  - toplam {tl(hesap.veri.toplam)}
                </span>{' '}
                <Link
                  to={`/konaklamalar/${ilk.konaklamaId}#hesap`}
                  className="dugme dugme-sade dugme-kucuk"
                >
                  Aç
                </Link>
              </b>
            </div>
          )}
          <div className="panel-satir">
            <span>Planlanan çıkış</span>
            <b>
              {oda.planlananCikis ? trTarih(oda.planlananCikis) : '-'}{' '}
              {oda.gecikenCikis && <Rozet tur="hata">gecikti</Rozet>}
              {resepsiyon && (
                <button
                  type="button"
                  className="dugme dugme-sade dugme-kucuk"
                  onClick={() => {
                    setPlan(girisDegerine(oda.planlananCikis || ''));
                    setPlanAcik((a) => !a);
                  }}
                >
                  Değiştir
                </button>
              )}
            </b>
          </div>
          {planAcik && (
            <div className="panel-ic-form">
              <Alan etiket="Yeni planlanan çıkış">
                <input
                  type="datetime-local"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                />
              </Alan>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="dugme dugme-kucuk dugme-birincil"
                  onClick={planKaydet}
                  disabled={mesgul || !plan}
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
        </>
      )}
      {!dolu && oda.rezervasyon && (
        <div className="panel-satir">
          <span>Bugün rezerve</span>
          <b>
            {gizli ? 'Rezervasyon var' : oda.rezervasyon.adSoyad} - {oda.rezervasyon.kisiSayisi}{' '}
            kişi - {REZ_KAYNAK[oda.rezervasyon.kaynak] || oda.rezervasyon.kaynak}
            <div className="soluk" style={{ fontWeight: 400 }}>
              {trTarih(oda.rezervasyon.girisTarihi)} - {trTarih(oda.rezervasyon.cikisTarihi)}
            </div>
          </b>
        </div>
      )}
      <div className="panel-satir">
        <span>Temizlik</span>
        <b>
          {TEMIZLIK[oda.temizlik].etiket}
          {oda.sonTemizlik && (
            <div className="soluk" style={{ fontWeight: 400 }}>
              son temizlik {trTarih(oda.sonTemizlik)}
            </div>
          )}
        </b>
      </div>
      {oda.kullanim === 'bakimda' && (
        <div className="panel-satir">
          <span>Bakım</span>
          <b>
            {oda.bakimNotu || 'Not yok'}
            {oda.bakimBitis && (
              <div className="soluk" style={{ fontWeight: 400 }}>
                tahmini bitiş {trTarih(oda.bakimBitis)}
              </div>
            )}
          </b>
        </div>
      )}
      {oda.notlar && (
        <div className="panel-satir">
          <span>Not</span>
          <b style={{ fontWeight: 400 }}>{oda.notlar}</b>
        </div>
      )}

      <div className="panel-dugmeler">
        {resepsiyon && !dolu && oda.kullanim === 'kullanimda' && (
          <button
            type="button"
            className="dugme dugme-kucuk dugme-birincil"
            onClick={() => acGiris(oda)}
          >
            Giriş
          </button>
        )}
        {resepsiyon && dolu && (
          <>
            <button
              type="button"
              className="dugme dugme-kucuk dugme-birincil"
              onClick={() => acCikis(ilk, oda)}
            >
              Çıkış
            </button>
            <button type="button" className="dugme dugme-kucuk" onClick={() => acTasi(ilk, oda)}>
              Oda değiştir
            </button>
            {oda.temizlik === 'temiz' && (
              <button
                type="button"
                className="dugme dugme-kucuk"
                onClick={gunlukGorev}
                disabled={mesgul}
              >
                Günlük temizlik
              </button>
            )}
          </>
        )}
        {oda.kullanim === 'kullanimda' && oda.temizlik === 'kirli' && (
          <button
            type="button"
            className="dugme dugme-kucuk"
            onClick={() => temizlikYap('temizleniyor')}
            disabled={mesgul}
          >
            Temizliğe başla
          </button>
        )}
        {oda.kullanim === 'kullanimda' && oda.temizlik !== 'temiz' && (
          <button
            type="button"
            className="dugme dugme-kucuk dugme-birincil"
            onClick={() => temizlikYap('temiz')}
            disabled={mesgul}
          >
            {oda.temizlik === 'kontrol' ? 'Kontrol edildi' : 'Temizlendi'}
          </button>
        )}
        {oda.kullanim === 'kullanimda' && oda.temizlik === 'temiz' && !dolu && (
          <button
            type="button"
            className="dugme dugme-kucuk"
            onClick={() => temizlikYap('kirli')}
            disabled={mesgul}
          >
            Kirli işaretle
          </button>
        )}
        {resepsiyon && !dolu && oda.kullanim === 'kullanimda' && (
          <button
            type="button"
            className="dugme dugme-kucuk"
            onClick={() => setBakimAcik((a) => !a)}
          >
            Bakıma al
          </button>
        )}
        {resepsiyon && oda.kullanim === 'bakimda' && (
          <button
            type="button"
            className="dugme dugme-kucuk"
            onClick={bakimdanCikar}
            disabled={mesgul}
          >
            Bakımdan çıkar
          </button>
        )}
        {yonetici && !dolu && oda.kullanim === 'kullanimda' && (
          <button
            type="button"
            className="dugme dugme-kucuk"
            onClick={() => kullanimDegistir('kapali')}
            disabled={mesgul}
          >
            Kapat
          </button>
        )}
        {yonetici && oda.kullanim === 'kapali' && (
          <button
            type="button"
            className="dugme dugme-kucuk"
            onClick={() => kullanimDegistir('kullanimda')}
            disabled={mesgul}
          >
            Aç
          </button>
        )}
        {yonetici && (
          <button
            type="button"
            className="dugme dugme-kucuk dugme-sade"
            onClick={() => acDuzenle(oda)}
          >
            Düzenle
          </button>
        )}
      </div>
      {bakimAcik && (
        <div className="panel-ic-form">
          <Alan etiket="Bakım nedeni">
            <input
              type="text"
              value={bakimNot}
              onChange={(e) => setBakimNot(e.target.value)}
              placeholder="klima arızası"
            />
          </Alan>
          <Alan etiket="Tahmini bitiş">
            <input type="date" value={bakimBitis} onChange={(e) => setBakimBitis(e.target.value)} />
          </Alan>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="dugme dugme-kucuk dugme-birincil"
              onClick={bakimaAl}
              disabled={mesgul}
            >
              Bakıma al
            </button>
            <button type="button" className="dugme dugme-kucuk" onClick={() => setBakimAcik(false)}>
              Vazgeç
            </button>
          </div>
        </div>
      )}
      {hata && <div className="form-hata">{hata}</div>}

      <div className="panel-baslik">Son 30 gün</div>
      {gecmis.veri &&
        gecmis.veri.konaklamalar.length === 0 &&
        gecmis.veri.temizlikler.length === 0 &&
        gecmis.veri.olaylar.length === 0 && (
          <p className="soluk" style={{ fontSize: '0.82rem' }}>
            Hareket yok.
          </p>
        )}
      {gecmis.veri &&
        gecmis.veri.konaklamalar.slice(0, 6).map((s) => (
          <div className="gecmis-satir" key={'k' + s.id}>
            <span>
              {gizli ? 'Konaklama' : <Link to={`/konaklamalar/${s.konaklamaId}`}>{s.konuk}</Link>}
              {s.tur === 'gunubirlik' && <span className="soluk"> - günübirlik</span>}
            </span>
            <span className="soluk sayi">
              {trTarih(s.baslangic)} - {s.bitis ? trTarih(s.bitis) : 'devam'}
            </span>
          </div>
        ))}
      {gecmis.veri &&
        gecmis.veri.temizlikler.slice(0, 4).map((t) => (
          <div className="gecmis-satir" key={'t' + t.id}>
            <span>
              {GOREV_TUR[t.tur]} {t.yapan && <span className="soluk">- {t.yapan}</span>}
            </span>
            <span className="soluk sayi">
              {t.bitis ? trTarih(t.bitis) : trTarih(t.olusturma) + ' - ' + t.durum}
            </span>
          </div>
        ))}
      {gecmis.veri &&
        gecmis.veri.olaylar
          .filter((o) => o.tur !== 'temizlik')
          .slice(0, 4)
          .map((o) => (
            <div className="gecmis-satir" key={'o' + o.id}>
              <span>
                {o.tur.replace('_', ' ')} {o.notlar && <span className="soluk">- {o.notlar}</span>}
              </span>
              <span className="soluk sayi">{trTarih(o.zaman)}</span>
            </div>
          ))}
    </aside>
  );
}

export default function Odalar() {
  const { kullanici } = useAuth();
  const gizli = kullanici.rol === 'kat_gorevlisi';
  const odalar = useYukle(() => odaApi.liste(), []);
  const katlar = useYukle(() => katApi.liste(), []);
  const [secili, setSecili] = useState(null);
  const [girisOda, setGirisOda] = useState(null);
  const [cikis, setCikis] = useState(null);
  const [tasi, setTasi] = useState(null);
  const [form, setForm] = useState(null);
  const [mesaj, setMesaj] = useState('');
  const [tuslar, setTuslar] = useState('');

  // Klavyeden oda numarası yazınca kutu seçilir
  useEffect(() => {
    let zamanlayici;
    const dinle = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'Escape') {
        setSecili(null);
        return;
      }
      if (!/^[0-9a-zA-Z]$/.test(e.key)) return;
      setTuslar((t) => t + e.key.toUpperCase());
      clearTimeout(zamanlayici);
      zamanlayici = setTimeout(() => setTuslar(''), 1500);
    };
    document.addEventListener('keydown', dinle);
    return () => {
      document.removeEventListener('keydown', dinle);
      clearTimeout(zamanlayici);
    };
  }, []);

  useEffect(() => {
    if (!tuslar || !odalar.veri) return;
    const bulunan = odalar.veri.find(
      (o) => o.tur !== 'ortak' && o.odaNo.toUpperCase().startsWith(tuslar)
    );
    if (bulunan) setSecili(bulunan.id);
  }, [tuslar, odalar.veri]);

  const katGruplari = useMemo(() => {
    if (!odalar.veri) return [];
    const liste = [];
    odalar.veri.forEach((o) => {
      const katId = o.kat ? o.kat.id : 0;
      let g = liste.find((x) => x.kat.id === katId);
      if (!g) {
        g = { kat: o.kat || { id: 0, ad: 'Kat atanmamış', sira: 999, koridor: 'yok' }, odalar: [] };
        liste.push(g);
      }
      g.odalar.push(o);
    });
    return liste.sort((a, b) => a.kat.sira - b.kat.sira);
  }, [odalar.veri]);

  const seciliOda = odalar.veri ? odalar.veri.find((o) => o.id === secili) : null;

  const degisti = (m) => {
    setMesaj(m || '');
    setGirisOda(null);
    setCikis(null);
    setTasi(null);
    setForm(null);
    odalar.yenile();
  };

  if ((odalar.yukleniyor && !odalar.veri) || (katlar.yukleniyor && !katlar.veri))
    return <Yukleniyor />;
  if (odalar.hata) return <Uyari tur="hata">{odalar.hata}</Uyari>;

  const liste = odalar.veri || [];
  const sayilar = {
    dolu: liste.filter((o) => o.doluluk === 'dolu').length,
    temiz: liste.filter(
      (o) =>
        o.tur === 'oda' &&
        o.doluluk !== 'dolu' &&
        o.kullanim === 'kullanimda' &&
        o.temizlik === 'temiz'
    ).length,
    kirli: liste.filter((o) => o.temizlik === 'kirli').length,
    temizleniyor: liste.filter((o) => o.temizlik === 'temizleniyor' || o.temizlik === 'kontrol')
      .length,
    bakim: liste.filter((o) => o.kullanim === 'bakimda').length,
    geciken: liste.filter((o) => o.gecikenCikis).length,
  };

  return (
    <Sayfa
      baslik="Oda haritası"
      eylemler={
        <>
          {kullanici.rol === 'yonetici' && (
            <button type="button" className="dugme" onClick={() => setForm({})}>
              + Oda
            </button>
          )}
          {!gizli && (
            <button type="button" className="dugme dugme-birincil" onClick={() => setGirisOda({})}>
              + Giriş kaydı
            </button>
          )}
        </>
      }
    >
      {mesaj && (
        <Uyari
          tur="basari"
          eylem={
            <button type="button" className="dugme dugme-kucuk" onClick={() => setMesaj('')}>
              Tamam
            </button>
          }
        >
          {mesaj}
        </Uyari>
      )}
      {sayilar.geciken > 0 && (
        <Uyari tur="hata">{sayilar.geciken} odada planlanan çıkış saati geçti.</Uyari>
      )}

      <div className={'harita-duzen' + (seciliOda ? '' : ' panelsiz')}>
        <div className="bina">
          <div className="bina-ust">
            <div>
              <b style={{ color: 'var(--metin)' }}>
                {liste.filter((o) => o.tur === 'oda').length} oda
              </b>{' '}
              - <span style={{ color: 'var(--renk-ana)' }}>{sayilar.dolu} dolu</span> -{' '}
              <span style={{ color: 'var(--basari)' }}>{sayilar.temiz} temiz-boş</span> -{' '}
              <span style={{ color: 'var(--uyari)' }}>{sayilar.kirli} kirli</span> -{' '}
              {sayilar.temizleniyor} temizleniyor - {sayilar.bakim} bakımda
            </div>
            {tuslar && <span className="mono">{tuslar}...</span>}
          </div>
          {katGruplari.length === 0 ? (
            <BosDurum>Oda tanımlı değil, Ayarlar'dan ekleyin</BosDurum>
          ) : (
            katGruplari.map((g) => (
              <KatSeridi
                key={g.kat.id}
                kat={g.kat}
                odalar={g.odalar}
                secili={secili}
                onSec={(o) => setSecili(o.id === secili ? null : o.id)}
                gizli={gizli}
              />
            ))
          )}
          <div className="lejant">
            <span>
              <i style={{ background: 'var(--renk-ana)' }} />
              dolu
            </span>
            <span>
              <i style={{ background: 'var(--basari)' }} />
              temiz, boş
            </span>
            <span>
              <i style={{ background: 'var(--renk-vurgu)' }} />
              kirli
            </span>
            <span>
              <i style={{ background: 'var(--uyari)' }} />
              temizleniyor
            </span>
            <span>
              <i style={{ background: 'var(--bilgi)' }} />
              kontrol bekliyor
            </span>
            <span>
              <i style={{ background: 'var(--hata)' }} />
              bakımda
            </span>
            <span>
              <i style={{ border: '2px dashed var(--renk-ana)', height: 2 }} />
              bugün rezerve
            </span>
            <span>
              <i style={{ background: 'var(--metin-soluk)' }} />
              kapalı
            </span>
          </div>
        </div>
        {seciliOda && (
          <OdaPaneli
            oda={seciliOda}
            katlar={katlar.veri || []}
            gizli={gizli}
            onKapat={() => setSecili(null)}
            onDegisti={degisti}
            acGiris={(o) => setGirisOda(o)}
            acCikis={(k, o) => setCikis({ ...k, odaNo: o.odaNo, odaId: o.id, id: k.konaklamaId })}
            acTasi={(k, o) => setTasi({ ...k, odaNo: o.odaNo, odaId: o.id, id: k.konaklamaId })}
            acDuzenle={(o) => setForm(o)}
          />
        )}
      </div>
      {girisOda && (
        <GirisModal
          odalar={liste}
          varsayilanOda={girisOda.id ? String(girisOda.id) : ''}
          onKapat={() => setGirisOda(null)}
          onTamam={(sonuc) => degisti(`${sonuc.length} konuk için giriş kaydedildi.`)}
        />
      )}
      {cikis && (
        <CikisModal
          konaklama={cikis}
          onKapat={() => setCikis(null)}
          onTamam={() => degisti('Çıkış kaydedildi, oda temizlik bekliyor.')}
        />
      )}
      {tasi && (
        <OdaDegistirModal
          konaklama={tasi}
          odalar={liste}
          onKapat={() => setTasi(null)}
          onTamam={() => degisti('Oda değişikliği kaydedildi.')}
        />
      )}
      {form && (
        <OdaFormu
          oda={form.id ? form : null}
          katlar={katlar.veri || []}
          varsayilanKat={seciliOda && seciliOda.kat ? seciliOda.kat.id : ''}
          onKapat={() => setForm(null)}
          onTamam={() => degisti('Oda kaydedildi.')}
        />
      )}
    </Sayfa>
  );
}
