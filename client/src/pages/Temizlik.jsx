import { useMemo, useState } from 'react';
import { odalar as odaApi, temizlik as temizlikApi } from '../api';
import { hataMesaji } from '../api/istemci';
import useYukle from '../hooks/useYukle';
import { useAuth } from '../hooks/useAuth';
import Sayfa, { BosDurum, Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import Modal from '../components/Modal';
import Alan from '../components/Alan';
import Rozet from '../components/Rozet';
import { neKadarOldu, trTarih } from '../utils/tarih';
import { GOREV_DURUM, GOREV_TUR } from '../utils/metin';

function GorevEkle({ odalar, onKapat, onTamam }) {
  const [odaId, setOdaId] = useState('');
  const [tur, setTur] = useState('ekstra');
  const [notlar, setNotlar] = useState('');
  const [hata, setHata] = useState('');

  const kaydet = async () => {
    if (!odaId) return setHata('Oda seçin');
    try {
      onTamam(await temizlikApi.ekle({ odaId: Number(odaId), tur, notlar }));
    } catch (e) {
      setHata(hataMesaji(e));
    }
    return undefined;
  };

  return (
    <Modal baslik="Temizlik görevi" onKapat={onKapat}>
      <div className="izgara">
        <Alan etiket="Oda">
          <select value={odaId} onChange={(e) => setOdaId(e.target.value)}>
            <option value="">Seçin</option>
            {odalar
              .filter((o) => o.tur === 'oda')
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.odaNo} {o.kat ? `- ${o.kat.ad}` : ''}
                </option>
              ))}
          </select>
        </Alan>
        <Alan etiket="Tür">
          <select value={tur} onChange={(e) => setTur(e.target.value)}>
            <option value="ekstra">Ekstra</option>
            <option value="gunluk">Günlük temizlik</option>
            <option value="cikis">Çıkış temizliği</option>
          </select>
        </Alan>
        <Alan etiket="Not" genis>
          <input
            type="text"
            value={notlar}
            onChange={(e) => setNotlar(e.target.value)}
            placeholder="havlu değişimi"
          />
        </Alan>
      </div>
      {hata && <div className="form-hata">{hata}</div>}
      <div className="form-alt">
        <button type="button" className="dugme" onClick={onKapat}>
          Vazgeç
        </button>
        <button type="button" className="dugme dugme-birincil" onClick={kaydet}>
          Görev aç
        </button>
      </div>
    </Modal>
  );
}

export default function Temizlik() {
  const { kullanici } = useAuth();
  const gorevli = kullanici.rol === 'kat_gorevlisi';
  const [sekme, setSekme] = useState('acik');
  const liste = useYukle(() => temizlikApi.liste(sekme), [sekme]);
  const odalar = useYukle(() => odaApi.liste(), []);
  const [ekleAcik, setEkleAcik] = useState(false);
  const [notlar, setNotlar] = useState({});
  const [mesaj, setMesaj] = useState('');
  const [hata, setHata] = useState('');
  const [mesgul, setMesgul] = useState(0);

  const gruplar = useMemo(() => {
    const g = [];
    (liste.veri || []).forEach((x) => {
      let grup = g.find((y) => y.kat === (x.kat || 'Kat yok'));
      if (!grup) {
        grup = {
          kat: x.kat || 'Kat yok',
          sira: x.katSira === null || x.katSira === undefined ? 999 : x.katSira,
          gorevler: [],
        };
        g.push(grup);
      }
      grup.gorevler.push(x);
    });
    return g.sort((a, b) => a.sira - b.sira);
  }, [liste.veri]);

  const guncelle = (g) => liste.setVeri((l) => (l || []).map((x) => (x.id === g.id ? g : x)));

  const calistir = async (id, fn, metin) => {
    setMesgul(id);
    setHata('');
    try {
      const g = await fn();
      if (g && g.id) guncelle(g);
      if (metin) setMesaj(metin);
      if (sekme === 'acik' && g && g.durum === 'tamam') liste.yenile();
    } catch (e) {
      setHata(hataMesaji(e));
    } finally {
      setMesgul(0);
    }
  };

  const gunluk = async () => {
    setHata('');
    try {
      const r = await temizlikApi.gunluk();
      setMesaj(
        r.acilan
          ? `${r.acilan} dolu oda için günlük temizlik görevi açıldı.`
          : 'Dolu odaların hepsinde zaten açık görev var.'
      );
      liste.yenile();
    } catch (e) {
      setHata(hataMesaji(e));
    }
  };

  const acikSayisi = sekme === 'acik' && liste.veri ? liste.veri.length : null;

  return (
    <Sayfa
      baslik="Temizlik"
      eylemler={
        !gorevli && (
          <>
            <button type="button" className="dugme" onClick={gunluk}>
              Günlük görevleri aç
            </button>
            <button
              type="button"
              className="dugme dugme-birincil"
              onClick={() => setEkleAcik(true)}
            >
              + Görev
            </button>
          </>
        )
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
      {hata && <Uyari tur="hata">{hata}</Uyari>}
      <div className="sekmeler">
        {[
          ['acik', acikSayisi !== null ? `Açık (${acikSayisi})` : 'Açık'],
          ['bugun', 'Bugün tamamlanan'],
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

      {liste.yukleniyor && !liste.veri ? (
        <Yukleniyor />
      ) : gruplar.length === 0 ? (
        <div className="kart">
          <BosDurum>{sekme === 'acik' ? 'Bekleyen temizlik yok.' : 'Kayıt yok.'}</BosDurum>
        </div>
      ) : (
        gruplar.map((g) => (
          <div className="kart" key={g.kat}>
            <div className="kart-baslik">
              <h2>{g.kat}</h2>
              <span className="soluk">{g.gorevler.length} görev</span>
            </div>
            {g.gorevler.map((x) => {
              const d = GOREV_DURUM[x.durum] || { etiket: x.durum, tur: 'notr' };
              return (
                <div className="gorev-satir" key={x.id}>
                  <div className="no">{x.odaNo}</div>
                  <div>
                    <div>
                      <b>{GOREV_TUR[x.tur] || x.tur}</b> <Rozet tur={d.tur}>{d.etiket}</Rozet>
                      {x.odaDolu && (
                        <>
                          {' '}
                          <Rozet tur="bilgi">konuk içeride</Rozet>
                        </>
                      )}
                    </div>
                    <div className="soluk" style={{ fontSize: '0.82rem' }}>
                      {x.durum === 'bekliyor' &&
                        `${trTarih(x.olusturma)} - ${neKadarOldu(x.olusturma)} bekliyor`}
                      {x.durum === 'yapiliyor' &&
                        `${x.yapan || 'biri'} ${trTarih(x.baslama)} başladı`}
                      {(x.durum === 'tamam' || x.durum === 'kontrol') &&
                        `${x.yapan || ''} - ${trTarih(x.baslama)} - ${trTarih(x.bitis)}${
                          x.kontrolEden ? ' - kontrol: ' + x.kontrolEden : ''
                        }`}
                      {x.notlar && <div>Not: {x.notlar}</div>}
                    </div>
                    {(x.durum === 'bekliyor' || x.durum === 'yapiliyor') && (
                      <input
                        type="text"
                        placeholder="Not (isteğe bağlı)"
                        value={notlar[x.id] || ''}
                        onChange={(e) => setNotlar((n) => ({ ...n, [x.id]: e.target.value }))}
                        style={{
                          marginTop: 6,
                          padding: '5px 8px',
                          border: '1px solid var(--cizgi-koyu)',
                          borderRadius: 6,
                          width: '100%',
                          maxWidth: 360,
                          background: 'var(--yuzey)',
                          color: 'var(--metin)',
                        }}
                      />
                    )}
                  </div>
                  <div className="eylemler">
                    {x.durum === 'bekliyor' && (
                      <button
                        type="button"
                        className="dugme dugme-kucuk"
                        disabled={mesgul === x.id}
                        onClick={() => calistir(x.id, () => temizlikApi.basla(x.id))}
                      >
                        Başladım
                      </button>
                    )}
                    {(x.durum === 'bekliyor' || x.durum === 'yapiliyor') && (
                      <button
                        type="button"
                        className="dugme dugme-kucuk dugme-birincil"
                        disabled={mesgul === x.id}
                        onClick={() =>
                          calistir(
                            x.id,
                            () => temizlikApi.bitir(x.id, notlar[x.id]),
                            `Oda ${x.odaNo} temizlendi.`
                          )
                        }
                      >
                        Bitti
                      </button>
                    )}
                    {x.durum === 'kontrol' && !gorevli && (
                      <button
                        type="button"
                        className="dugme dugme-kucuk dugme-birincil"
                        disabled={mesgul === x.id}
                        onClick={() =>
                          calistir(
                            x.id,
                            () => temizlikApi.kontrol(x.id),
                            `Oda ${x.odaNo} kontrol edildi.`
                          )
                        }
                      >
                        Kontrol edildi
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}

      {ekleAcik && odalar.veri && (
        <GorevEkle
          odalar={odalar.veri}
          onKapat={() => setEkleAcik(false)}
          onTamam={() => {
            setEkleAcik(false);
            setMesaj('Görev açıldı.');
            liste.yenile();
          }}
        />
      )}
    </Sayfa>
  );
}
