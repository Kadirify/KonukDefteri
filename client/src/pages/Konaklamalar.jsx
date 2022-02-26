import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ayarlar as ayarApi,
  konaklamalar,
  konuklar as konukApi,
  odalar as odaApi,
  rezervasyonlar as rezApi,
} from '../api';
import { hataMesaji } from '../api/istemci';
import useYukle from '../hooks/useYukle';
import { useAuth } from '../hooks/useAuth';
import Sayfa, { BosDurum, Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import Modal from '../components/Modal';
import Alan from '../components/Alan';
import Rozet, { BildirimRozeti } from '../components/Rozet';
import KonukFormu from '../components/KonukFormu';
import {
  girisDegerinden,
  girisDegerine,
  gunEkleYerel,
  saatEkleYerel,
  simdiYerel,
  trTarih,
} from '../utils/tarih';
import { BILDIRIM_TUR, kimlikMetni, konukAdi, TEMIZLIK } from '../utils/metin';

export function odaEtiketi(o) {
  const dolu = o.konaklayanlar.length;
  if (o.tur === 'ortak') return `${o.odaNo} - ortak alan`;
  if (o.kullanim === 'bakimda') return `${o.odaNo} - bakımda`;
  if (o.kullanim === 'kapali') return `${o.odaNo} - kapalı`;
  if (dolu >= o.kapasite) return `${o.odaNo} - dolu (${dolu}/${o.kapasite})`;
  const temizlik = o.temizlik !== 'temiz' ? ` - ${TEMIZLIK[o.temizlik].etiket.toLowerCase()}` : '';
  if (dolu) return `${o.odaNo} - ${dolu}/${o.kapasite} dolu${temizlik}`;
  const rez = o.doluluk === 'rezerve' ? ' - bugün rezerve' : '';
  return `${o.odaNo} - boş (${o.kapasite} kişilik)${temizlik}${rez}`;
}

function odaSecilemez(o, yonetici) {
  if (o.tur === 'ortak' || o.kullanim !== 'kullanimda') return true;
  if (o.konaklayanlar.length >= o.kapasite) return true;
  if (o.temizlik !== 'temiz' && !yonetici) return true;
  return false;
}

// Giriş kaydı. rezervasyon verilirse ondan açılır (oda, çıkış tarihi, konuk).
export function GirisModal({ odalar, onKapat, onTamam, varsayilanOda, rezervasyon }) {
  const { kullanici } = useAuth();
  const yonetici = kullanici.rol === 'yonetici';
  const ayarlar = useYukle(() => ayarApi.oku(), []);
  const [odaId, setOdaId] = useState(
    varsayilanOda || (rezervasyon && rezervasyon.odaId ? String(rezervasyon.odaId) : '')
  );
  const [girisZamani, setGirisZamani] = useState(girisDegerine(simdiYerel()));
  const [tur, setTur] = useState('gece');
  const [planlananCikis, setPlanlananCikis] = useState('');
  const [planElle, setPlanElle] = useState(false);
  const [plaka, setPlaka] = useState('');
  const [zorla, setZorla] = useState(false);
  const [secilenler, setSecilenler] = useState([]);
  const [q, setQ] = useState(rezervasyon && !rezervasyon.konukId ? rezervasyon.adSoyad : '');
  const [sonuclar, setSonuclar] = useState([]);
  const [yeniAcik, setYeniAcik] = useState(false);
  const [hata, setHata] = useState('');
  const [mesgul, setMesgul] = useState(false);

  useEffect(() => {
    if (rezervasyon && rezervasyon.konukId) {
      konukApi
        .oku(rezervasyon.konukId)
        .then((k) => setSecilenler([{ tip: 'kayitli', konuk: k }]))
        .catch(() => {});
    }
  }, [rezervasyon]);

  // Planlanan çıkış: elle değiştirilmediyse tür ve giriş saatinden hesaplanır
  useEffect(() => {
    if (planElle || !ayarlar.veri) return;
    const giris = girisDegerinden(girisZamani);
    if (!giris) return;
    const cikisSaati = ayarlar.veri.cikis_saati || '11:00';
    if (rezervasyon) {
      setPlanlananCikis(girisDegerine(`${rezervasyon.cikisTarihi} ${cikisSaati}`));
    } else if (tur === 'gunubirlik') {
      setPlanlananCikis(
        girisDegerine(saatEkleYerel(giris, Number(ayarlar.veri.gunubirlik_saat) || 6))
      );
    } else {
      setPlanlananCikis(
        girisDegerine(`${gunEkleYerel(giris.slice(0, 10), 1).slice(0, 10)} ${cikisSaati}`)
      );
    }
  }, [tur, girisZamani, ayarlar.veri, planElle, rezervasyon]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setSonuclar([]);
      return undefined;
    }
    const z = setTimeout(() => {
      konukApi
        .liste(q.trim())
        .then(setSonuclar)
        .catch(() => setSonuclar([]));
    }, 250);
    return () => clearTimeout(z);
  }, [q]);

  const seciliOda = odalar.find((o) => String(o.id) === String(odaId));
  const temizDegil = !!(seciliOda && seciliOda.temizlik !== 'temiz');
  const gunubirlikIzinli = !ayarlar.veri || ayarlar.veri.gunubirlik_izinli !== '0';

  const ekleKayitli = (k) => {
    if (secilenler.some((s) => s.tip === 'kayitli' && s.konuk.id === k.id)) return;
    setSecilenler((l) => [...l, { tip: 'kayitli', konuk: k }]);
    setQ('');
    setSonuclar([]);
  };

  const ekleYeni = async (v) => {
    setSecilenler((l) => [...l, { tip: 'yeni', konuk: v }]);
    setYeniAcik(false);
  };

  const cikar = (i) => setSecilenler((l) => l.filter((_, j) => j !== i));

  const kaydet = async () => {
    setHata('');
    if (!odaId) return setHata('Oda seçin');
    if (!secilenler.length) return setHata('En az bir konuk ekleyin');
    if (temizDegil && !zorla)
      return setHata('Oda temiz değil. Yönetici "yine de yerleştir" seçebilir.');
    setMesgul(true);
    const konuklar = secilenler.map((s) =>
      s.tip === 'kayitli' ? { konukId: s.konuk.id } : { konuk: s.konuk }
    );
    try {
      if (rezervasyon) {
        const r = await rezApi.giris(rezervasyon.id, {
          odaId: Number(odaId),
          girisZamani: girisDegerinden(girisZamani),
          plaka,
          zorla,
          konuklar,
        });
        onTamam(r.konaklamalar.map((id) => ({ id })));
      } else {
        const sonuc = await konaklamalar.giris({
          odaId: Number(odaId),
          girisZamani: girisDegerinden(girisZamani),
          plaka,
          tur,
          planlananCikis: girisDegerinden(planlananCikis),
          zorla,
          konuklar,
        });
        onTamam(sonuc);
      }
    } catch (e) {
      setHata(hataMesaji(e));
    } finally {
      setMesgul(false);
    }
    return undefined;
  };

  return (
    <Modal
      baslik={rezervasyon ? `Rezervasyondan giriş - ${rezervasyon.adSoyad}` : 'Giriş kaydı'}
      onKapat={onKapat}
      genis
    >
      <div className="izgara">
        <Alan
          etiket="Oda"
          hata={temizDegil && !yonetici ? 'Oda temiz değil, önce temizlik tamamlanmalı' : ''}
        >
          <select value={odaId} onChange={(e) => setOdaId(e.target.value)}>
            <option value="">Seçin</option>
            {odalar.map((o) => (
              <option key={o.id} value={o.id} disabled={odaSecilemez(o, yonetici)}>
                {odaEtiketi(o)}
              </option>
            ))}
          </select>
        </Alan>
        <Alan etiket="Giriş zamanı">
          <input
            type="datetime-local"
            value={girisZamani}
            onChange={(e) => setGirisZamani(e.target.value)}
          />
        </Alan>
        {!rezervasyon && (
          <div className="alan">
            <span>Konaklama türü</span>
            <div className="secenekler">
              <label>
                <input
                  type="radio"
                  value="gece"
                  checked={tur === 'gece'}
                  onChange={() => setTur('gece')}
                />{' '}
                Gece
              </label>
              <label>
                <input
                  type="radio"
                  value="gunubirlik"
                  checked={tur === 'gunubirlik'}
                  onChange={() => setTur('gunubirlik')}
                  disabled={!gunubirlikIzinli}
                />{' '}
                Günübirlik
              </label>
            </div>
          </div>
        )}
        <Alan
          etiket="Planlanan çıkış"
          not={planElle ? '' : 'Türe göre hesaplandı, değiştirilebilir'}
        >
          <input
            type="datetime-local"
            value={planlananCikis}
            onChange={(e) => {
              setPlanElle(true);
              setPlanlananCikis(e.target.value);
            }}
          />
        </Alan>
        <Alan etiket="Araç plakası" not="Varsa">
          <input
            type="text"
            value={plaka}
            onChange={(e) => setPlaka(e.target.value.toUpperCase())}
            className="mono"
          />
        </Alan>
      </div>
      {temizDegil && yonetici && (
        <label className="secenekler" style={{ marginTop: 12 }}>
          <input type="checkbox" checked={zorla} onChange={(e) => setZorla(e.target.checked)} />
          <span>
            Oda <b>{TEMIZLIK[seciliOda.temizlik].etiket.toLowerCase()}</b>; yine de yerleştir
            (günlüğe yazılır)
          </span>
        </label>
      )}

      <div className="konuk-secimi" style={{ marginTop: 16 }}>
        <div className="baslik">
          <h3>Konuklar ({secilenler.length})</h3>
          <button type="button" className="dugme dugme-kucuk" onClick={() => setYeniAcik(true)}>
            + Yeni konuk kartı
          </button>
        </div>
        {secilenler.map((s, i) => (
          <div className="liste-satir" key={i}>
            <span>
              <b>{konukAdi(s.konuk)}</b>{' '}
              <span className="soluk mono">
                {s.tip === 'kayitli'
                  ? kimlikMetni(s.konuk)
                  : s.konuk.kimlikTuru === 'tc'
                  ? '*******' + s.konuk.tc.slice(-4)
                  : s.konuk.pasaportNo}
              </span>
              {s.tip === 'yeni' && <Rozet tur="bilgi">yeni</Rozet>}
            </span>
            <button type="button" className="dugme dugme-sade dugme-kucuk" onClick={() => cikar(i)}>
              Kaldır
            </button>
          </div>
        ))}
        <label className="alan" style={{ marginTop: 10 }}>
          <span>Kayıtlı konuk ara</span>
          <input
            type="search"
            placeholder="Ad, soyad ya da TC'nin son 4 hanesi"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        {sonuclar.length > 0 && (
          <div className="arama-sonuc">
            {sonuclar.map((k) => (
              <button type="button" key={k.id} onClick={() => ekleKayitli(k)}>
                {konukAdi(k)} <span className="soluk mono">{kimlikMetni(k)}</span>
                {k.dogumTarihi && <span className="soluk"> - {trTarih(k.dogumTarihi)}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {hata && <div className="form-hata">{hata}</div>}
      <div className="form-alt">
        <button type="button" className="dugme" onClick={onKapat}>
          Vazgeç
        </button>
        <button type="button" className="dugme dugme-birincil" onClick={kaydet} disabled={mesgul}>
          {mesgul ? 'Kaydediliyor...' : 'Girişi kaydet'}
        </button>
      </div>

      {yeniAcik && (
        <Modal baslik="Yeni konuk kartı" onKapat={() => setYeniAcik(false)}>
          <KonukFormu
            onKaydet={ekleYeni}
            onIptal={() => setYeniAcik(false)}
            kaydetMetni="Listeye ekle"
          />
        </Modal>
      )}
    </Modal>
  );
}

export function CikisModal({ konaklama, onKapat, onTamam }) {
  const [cikisZamani, setCikisZamani] = useState(girisDegerine(simdiYerel()));
  const [grupHepsi, setGrupHepsi] = useState(!!konaklama.grupKodu);
  const [hata, setHata] = useState('');
  const [mesgul, setMesgul] = useState(false);

  const kaydet = async () => {
    setMesgul(true);
    setHata('');
    try {
      await konaklamalar.cikis(konaklama.id, {
        cikisZamani: girisDegerinden(cikisZamani),
        grupHepsi,
      });
      onTamam();
    } catch (e) {
      setHata(hataMesaji(e));
    } finally {
      setMesgul(false);
    }
  };

  return (
    <Modal baslik="Çıkış kaydı" onKapat={onKapat}>
      <p>
        <b>{konukAdi(konaklama)}</b> - Oda {konaklama.odaNo} - giriş{' '}
        {trTarih(konaklama.girisZamani)}
      </p>
      <div className="izgara">
        <Alan etiket="Çıkış zamanı">
          <input
            type="datetime-local"
            value={cikisZamani}
            onChange={(e) => setCikisZamani(e.target.value)}
          />
        </Alan>
      </div>
      {konaklama.grupKodu && (
        <label className="secenekler" style={{ marginTop: 12 }}>
          <input
            type="checkbox"
            checked={grupHepsi}
            onChange={(e) => setGrupHepsi(e.target.checked)}
          />
          <span>Aynı grupla giriş yapan herkesi çıkar</span>
        </label>
      )}
      {hata && <div className="form-hata">{hata}</div>}
      <div className="form-alt">
        <button type="button" className="dugme" onClick={onKapat}>
          Vazgeç
        </button>
        <button type="button" className="dugme dugme-birincil" onClick={kaydet} disabled={mesgul}>
          Çıkışı kaydet
        </button>
      </div>
    </Modal>
  );
}

export function OdaDegistirModal({ konaklama, odalar, onKapat, onTamam }) {
  const [odaId, setOdaId] = useState('');
  const [hata, setHata] = useState('');
  const [mesgul, setMesgul] = useState(false);

  const kaydet = async () => {
    if (!odaId) return setHata('Yeni odayı seçin');
    setMesgul(true);
    setHata('');
    try {
      onTamam(await konaklamalar.odaDegistir(konaklama.id, Number(odaId)));
    } catch (e) {
      setHata(hataMesaji(e));
    } finally {
      setMesgul(false);
    }
    return undefined;
  };

  return (
    <Modal baslik="Oda değiştir" onKapat={onKapat}>
      <p>
        <b>{konukAdi(konaklama)}</b> şu an {konaklama.odaNo} numaralı odada. Değişiklik KBS'ye
        güncelleme olarak bildirilir.
      </p>
      <Alan etiket="Yeni oda">
        <select value={odaId} onChange={(e) => setOdaId(e.target.value)}>
          <option value="">Seçin</option>
          {odalar
            .filter((o) => o.id !== konaklama.odaId)
            .map((o) => (
              <option key={o.id} value={o.id} disabled={odaSecilemez(o, false)}>
                {odaEtiketi(o)}
              </option>
            ))}
        </select>
      </Alan>
      {hata && <div className="form-hata">{hata}</div>}
      <div className="form-alt">
        <button type="button" className="dugme" onClick={onKapat}>
          Vazgeç
        </button>
        <button type="button" className="dugme dugme-birincil" onClick={kaydet} disabled={mesgul}>
          Taşı
        </button>
      </div>
    </Modal>
  );
}

export default function Konaklamalar() {
  const [arama, setArama] = useSearchParams();
  const navigate = useNavigate();
  const durum = arama.get('durum') || 'konakliyor';
  const [q, setQ] = useState('');
  const [girisAcik, setGirisAcik] = useState(arama.get('yeni') === '1');
  const [cikis, setCikis] = useState(null);
  const [tasi, setTasi] = useState(null);
  const [mesaj, setMesaj] = useState('');

  const liste = useYukle(() => konaklamalar.liste({ durum, q }), [durum, q]);
  const odalar = useYukle(() => odaApi.liste(), [liste.veri]);

  useEffect(() => {
    if (arama.get('yeni') === '1') {
      setGirisAcik(true);
      arama.delete('yeni');
      setArama(arama, { replace: true });
    }
  }, [arama, setArama]);

  const durumDegistir = (d) => {
    arama.set('durum', d);
    setArama(arama);
  };

  const tamam = (metin) => {
    setMesaj(metin);
    setGirisAcik(false);
    setCikis(null);
    setTasi(null);
    liste.yenile();
  };

  return (
    <Sayfa
      baslik="Konaklamalar"
      eylemler={
        <>
          <Link to="/odalar" className="dugme">
            Oda haritası
          </Link>
          <button type="button" className="dugme dugme-birincil" onClick={() => setGirisAcik(true)}>
            + Giriş kaydı
          </button>
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
      <div className="arac-cubugu">
        <div className="sekmeler" style={{ marginBottom: 0, borderBottom: 0 }}>
          {[
            ['konakliyor', 'Konaklayanlar'],
            ['ayrildi', 'Ayrılanlar'],
            ['hepsi', 'Hepsi'],
          ].map(([d, ad]) => (
            <button
              type="button"
              key={d}
              className={durum === d ? 'aktif' : ''}
              onClick={() => durumDegistir(d)}
            >
              {ad}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Konuk adı ya da oda"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {liste.hata && <Uyari tur="hata">{liste.hata}</Uyari>}
      {liste.yukleniyor && !liste.veri ? (
        <Yukleniyor />
      ) : (
        <div className="tablo-sarici">
          <table className="tablo">
            <thead>
              <tr>
                <th>Oda</th>
                <th>Konuk</th>
                <th>Kimlik</th>
                <th>Giriş</th>
                <th>Planlanan çıkış</th>
                <th>Çıkış</th>
                <th>Son bildirim</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(liste.veri || []).map((s) => (
                <tr
                  key={s.id}
                  className="tiklanir"
                  onClick={() => navigate(`/konaklamalar/${s.id}`)}
                >
                  <td className="mono">{s.odaNo}</td>
                  <td>
                    <b>{konukAdi(s)}</b>
                    {s.grupKodu && <span className="soluk"> - grup {s.grupKodu}</span>}
                    {s.tur === 'gunubirlik' && (
                      <>
                        {' '}
                        <Rozet tur="basari">günübirlik</Rozet>
                      </>
                    )}
                  </td>
                  <td className="mono">{kimlikMetni(s)}</td>
                  <td className="sayi">{trTarih(s.girisZamani)}</td>
                  <td className="sayi">
                    {s.planlananCikis ? (
                      trTarih(s.planlananCikis)
                    ) : (
                      <span className="soluk">-</span>
                    )}
                    {s.gecikenCikis && (
                      <>
                        {' '}
                        <Rozet tur="hata">gecikti</Rozet>
                      </>
                    )}
                  </td>
                  <td className="sayi">
                    {s.cikisZamani ? trTarih(s.cikisZamani) : <span className="soluk">-</span>}
                  </td>
                  <td>
                    {s.bildirim ? (
                      <>
                        <BildirimRozeti durum={s.bildirim.durum} />{' '}
                        <span className="soluk" style={{ fontSize: '0.8rem' }}>
                          {BILDIRIM_TUR[s.bildirim.tur]}
                        </span>
                      </>
                    ) : (
                      <span className="soluk">-</span>
                    )}
                  </td>
                  <td className="eylem" onClick={(e) => e.stopPropagation()}>
                    {s.durum === 'konakliyor' && (
                      <>
                        <button
                          type="button"
                          className="dugme dugme-kucuk"
                          onClick={() => setTasi(s)}
                        >
                          Oda değiştir
                        </button>
                        <button
                          type="button"
                          className="dugme dugme-kucuk dugme-birincil"
                          onClick={() => setCikis(s)}
                        >
                          Çıkış
                        </button>
                      </>
                    )}
                    {s.durum !== 'konakliyor' && (
                      <Link to={`/konaklamalar/${s.id}`} className="dugme dugme-kucuk dugme-sade">
                        Detay
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {liste.veri && liste.veri.length === 0 && (
            <BosDurum>
              {durum === 'konakliyor' ? 'Şu anda konaklayan yok.' : 'Kayıt bulunamadı.'}
            </BosDurum>
          )}
        </div>
      )}

      {girisAcik && odalar.veri && (
        <GirisModal
          odalar={odalar.veri}
          onKapat={() => setGirisAcik(false)}
          onTamam={(sonuc) =>
            tamam(`${sonuc.length} konuk için giriş kaydedildi, KBS bildirimi kuyruğa alındı.`)
          }
        />
      )}
      {cikis && (
        <CikisModal
          konaklama={cikis}
          onKapat={() => setCikis(null)}
          onTamam={() => tamam('Çıkış kaydedildi, oda temizlik bekliyor.')}
        />
      )}
      {tasi && odalar.veri && (
        <OdaDegistirModal
          konaklama={tasi}
          odalar={odalar.veri}
          onKapat={() => setTasi(null)}
          onTamam={() => tamam('Oda değişikliği kaydedildi.')}
        />
      )}
    </Sayfa>
  );
}
