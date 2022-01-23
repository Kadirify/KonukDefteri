import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { kbs, konaklamalar, konuklar as konukApi, odalar as odaApi } from '../api';
import { hataMesaji } from '../api/istemci';
import useYukle from '../hooks/useYukle';
import Sayfa, { BosDurum, Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import Modal from '../components/Modal';
import Alan from '../components/Alan';
import { BildirimRozeti } from '../components/Rozet';
import BildirimIslemleri from '../components/BildirimIslemleri';
import KonukFormu from '../components/KonukFormu';
import { girisDegerinden, girisDegerine, simdiYerel, trTarih } from '../utils/tarih';
import { BILDIRIM_TUR, kimlikMetni, konukAdi } from '../utils/metin';

export function odaEtiketi(o) {
  const dolu = o.konaklayanlar.length;
  if (!o.aktif) return `${o.odaNo} - kapalı`;
  if (dolu >= o.kapasite) return `${o.odaNo} - dolu (${dolu}/${o.kapasite})`;
  if (dolu) return `${o.odaNo} - ${dolu}/${o.kapasite} dolu`;
  return `${o.odaNo} - boş (${o.kapasite} kişilik)`;
}

function odaSecilemez(o) {
  return !o.aktif || o.konaklayanlar.length >= o.kapasite;
}

// Giriş kaydı: bir oda, bir ya da birden çok konuk (grup)
export function GirisModal({ odalar, onKapat, onTamam, varsayilanOda }) {
  const [odaId, setOdaId] = useState(varsayilanOda || '');
  const [girisZamani, setGirisZamani] = useState(girisDegerine(simdiYerel()));
  const [plaka, setPlaka] = useState('');
  const [secilenler, setSecilenler] = useState([]);
  const [q, setQ] = useState('');
  const [sonuclar, setSonuclar] = useState([]);
  const [yeniAcik, setYeniAcik] = useState(false);
  const [hata, setHata] = useState('');
  const [mesgul, setMesgul] = useState(false);

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
    setMesgul(true);
    const konuklar = secilenler.map((s) =>
      s.tip === 'kayitli' ? { konukId: s.konuk.id } : { konuk: s.konuk }
    );
    try {
      const sonuc = await konaklamalar.giris({
        odaId: Number(odaId),
        girisZamani: girisDegerinden(girisZamani),
        plaka,
        konuklar,
      });
      onTamam(sonuc);
    } catch (e) {
      setHata(hataMesaji(e));
    } finally {
      setMesgul(false);
    }
    return undefined;
  };

  return (
    <Modal baslik="Giriş kaydı" onKapat={onKapat} genis>
      <div className="izgara">
        <Alan etiket="Oda">
          <select value={odaId} onChange={(e) => setOdaId(e.target.value)}>
            <option value="">Seçin</option>
            {odalar.map((o) => (
              <option key={o.id} value={o.id} disabled={odaSecilemez(o)}>
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
        <Alan etiket="Araç plakası" not="Varsa">
          <input
            type="text"
            value={plaka}
            onChange={(e) => setPlaka(e.target.value.toUpperCase())}
            className="mono"
          />
        </Alan>
      </div>

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
              {s.tip === 'yeni' && <span className="soluk"> - yeni kart</span>}
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
              <option key={o.id} value={o.id} disabled={odaSecilemez(o)}>
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
  const kbsDurum = useYukle(() => kbs.durum(), []);
  const kbsMod = kbsDurum.veri ? kbsDurum.veri.mod : 'manuel';

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
        <button type="button" className="dugme dugme-birincil" onClick={() => setGirisAcik(true)}>
          + Giriş kaydı
        </button>
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
                <th>Çıkış</th>
                <th>Bildirim</th>
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
                  </td>
                  <td className="mono">{kimlikMetni(s)}</td>
                  <td className="sayi">{trTarih(s.girisZamani)}</td>
                  <td className="sayi">
                    {s.cikisZamani ? trTarih(s.cikisZamani) : <span className="soluk">-</span>}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {s.bildirim ? (
                      <>
                        <BildirimRozeti durum={s.bildirim.durum} />{' '}
                        <span className="soluk" style={{ fontSize: '0.8rem' }}>
                          {BILDIRIM_TUR[s.bildirim.tur]}
                        </span>
                        <div style={{ marginTop: 4 }}>
                          <BildirimIslemleri
                            bildirim={s.bildirim}
                            kbsMod={kbsMod}
                            onGuncelle={() => liste.yenile()}
                          />
                        </div>
                      </>
                    ) : (
                      <span className="soluk">-</span>
                    )}
                  </td>
                  <td className="eylem" onClick={(e) => e.stopPropagation()}>
                    {s.durum === 'konakliyor' ? (
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
                    ) : (
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
          onTamam={() => tamam('Çıkış kaydedildi, KBS bildirimi kuyruğa alındı.')}
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
