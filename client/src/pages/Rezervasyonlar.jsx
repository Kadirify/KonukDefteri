import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { konuklar as konukApi, odalar as odaApi, rezervasyonlar as rezApi } from '../api';
import { hataAlanlari, hataMesaji } from '../api/istemci';
import useYukle from '../hooks/useYukle';
import Sayfa, { BosDurum, Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import Modal from '../components/Modal';
import Alan from '../components/Alan';
import Rozet from '../components/Rozet';
import { GirisModal } from './Konaklamalar';
import { bugunYerel, gunEkleYerel, trGun } from '../utils/tarih';
import { kimlikMetni, konukAdi, REZ_DURUM, REZ_KAYNAK } from '../utils/metin';

function RezervasyonFormu({ rez, odalar, onKapat, onTamam }) {
  const [v, setV] = useState(
    rez
      ? { ...rez, odaId: rez.odaId ? String(rez.odaId) : '' }
      : {
          konukId: null,
          adSoyad: '',
          telefon: '',
          odaId: '',
          girisTarihi: bugunYerel(),
          cikisTarihi: gunEkleYerel(bugunYerel(), 1).slice(0, 10),
          kisiSayisi: 1,
          kaynak: 'telefon',
          durum: 'onayli',
          notlar: '',
        }
  );
  const [q, setQ] = useState('');
  const [sonuclar, setSonuclar] = useState([]);
  const [hata, setHata] = useState('');
  const [alanlar, setAlanlar] = useState({});
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

  const alan = (ad) => ({
    value: v[ad] === null || v[ad] === undefined ? '' : v[ad],
    onChange: (e) => setV((x) => ({ ...x, [ad]: e.target.value })),
  });

  const kaydet = async () => {
    setHata('');
    setAlanlar({});
    setMesgul(true);
    const veri = {
      konukId: v.konukId || null,
      adSoyad: v.adSoyad,
      telefon: v.telefon,
      odaId: v.odaId ? Number(v.odaId) : null,
      girisTarihi: v.girisTarihi,
      cikisTarihi: v.cikisTarihi,
      kisiSayisi: Number(v.kisiSayisi) || 1,
      kaynak: v.kaynak,
      durum: v.durum,
      notlar: v.notlar,
    };
    try {
      onTamam(rez ? await rezApi.duzenle(rez.id, veri) : await rezApi.ekle(veri));
    } catch (e) {
      setAlanlar(hataAlanlari(e));
      setHata(hataMesaji(e));
    } finally {
      setMesgul(false);
    }
  };

  return (
    <Modal baslik={rez ? 'Rezervasyonu düzenle' : 'Yeni rezervasyon'} onKapat={onKapat}>
      <div className="konuk-secimi">
        <div className="baslik">
          <h3>{v.konukId ? 'Kayıtlı konuk' : 'Konuk'}</h3>
          {v.konukId && (
            <button
              type="button"
              className="dugme dugme-sade dugme-kucuk"
              onClick={() => setV((x) => ({ ...x, konukId: null }))}
            >
              Kartı kaldır
            </button>
          )}
        </div>
        {v.konukId ? (
          <p>
            <b>{v.adSoyad}</b>
          </p>
        ) : (
          <>
            <label className="alan">
              <span>Kayıtlı konuk ara (isteğe bağlı)</span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ad, soyad ya da TC'nin son 4 hanesi"
              />
            </label>
            {sonuclar.length > 0 && (
              <div className="arama-sonuc">
                {sonuclar.map((k) => (
                  <button
                    type="button"
                    key={k.id}
                    onClick={() => {
                      setV((x) => ({
                        ...x,
                        konukId: k.id,
                        adSoyad: konukAdi(k),
                        telefon: k.telefon || x.telefon,
                      }));
                      setQ('');
                      setSonuclar([]);
                    }}
                  >
                    {konukAdi(k)} <span className="soluk mono">{kimlikMetni(k)}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div className="izgara">
        {!v.konukId && (
          <Alan etiket="Ad soyad" hata={alanlar.adSoyad}>
            <input type="text" {...alan('adSoyad')} />
          </Alan>
        )}
        <Alan etiket="Telefon" hata={alanlar.telefon}>
          <input type="tel" {...alan('telefon')} />
        </Alan>
        <Alan etiket="Giriş" hata={alanlar.girisTarihi}>
          <input type="date" {...alan('girisTarihi')} />
        </Alan>
        <Alan etiket="Çıkış" hata={alanlar.cikisTarihi}>
          <input type="date" {...alan('cikisTarihi')} />
        </Alan>
        <Alan etiket="Oda" hata={alanlar.odaId}>
          <select {...alan('odaId')}>
            <option value="">-</option>
            {odalar
              .filter((o) => o.tur === 'oda' && o.kullanim !== 'kapali')
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.odaNo} - {o.tip || 'oda'} - {o.kapasite} kişi
                </option>
              ))}
          </select>
        </Alan>
        <Alan etiket="Kişi" hata={alanlar.kisiSayisi}>
          <input type="number" min={1} max={20} {...alan('kisiSayisi')} />
        </Alan>
        <Alan etiket="Kaynak">
          <select {...alan('kaynak')}>
            {Object.keys(REZ_KAYNAK).map((k) => (
              <option key={k} value={k}>
                {REZ_KAYNAK[k]}
              </option>
            ))}
          </select>
        </Alan>
        <Alan etiket="Durum">
          <select {...alan('durum')}>
            <option value="onayli">Onaylı</option>
            <option value="bekliyor">Bekliyor (teyit edilmedi)</option>
          </select>
        </Alan>
        <Alan etiket="Not" genis hata={alanlar.notlar}>
          <input type="text" {...alan('notlar')} />
        </Alan>
      </div>
      {hata && <div className="form-hata">{hata}</div>}
      <div className="form-alt">
        <button type="button" className="dugme" onClick={onKapat}>
          Vazgeç
        </button>
        <button type="button" className="dugme dugme-birincil" onClick={kaydet} disabled={mesgul}>
          Kaydet
        </button>
      </div>
    </Modal>
  );
}

export default function Rezervasyonlar() {
  const [aralik, setAralik] = useState('gelecek');
  const liste = useYukle(() => rezApi.liste(aralik), [aralik]);
  const odalar = useYukle(() => odaApi.liste(), [liste.veri]);
  const [form, setForm] = useState(null);
  const [giris, setGiris] = useState(null);
  const [mesaj, setMesaj] = useState('');
  const [hata, setHata] = useState('');

  const tamam = (m) => {
    setMesaj(m);
    setForm(null);
    setGiris(null);
    liste.yenile();
  };

  const kapat = async (r, tur) => {
    const soru =
      tur === 'iptal'
        ? `${r.adSoyad} rezervasyonu iptal edilsin mi?`
        : `${r.adSoyad} gelmedi olarak kapatılsın mı?`;
    if (!window.confirm(soru)) return;
    setHata('');
    try {
      await (tur === 'iptal' ? rezApi.iptal(r.id) : rezApi.gelmedi(r.id));
      tamam(
        tur === 'iptal' ? 'Rezervasyon iptal edildi.' : 'Rezervasyon "gelmedi" olarak kapatıldı.'
      );
    } catch (e) {
      setHata(hataMesaji(e));
    }
  };

  const bugun = bugunYerel();

  return (
    <Sayfa
      baslik="Rezervasyonlar"
      eylemler={
        <button type="button" className="dugme dugme-birincil" onClick={() => setForm({})}>
          + Rezervasyon
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
      {hata && <Uyari tur="hata">{hata}</Uyari>}
      <div className="sekmeler">
        {[
          ['bugun', 'Bugün'],
          ['yarin', 'Yarın'],
          ['hafta', 'Bu hafta'],
          ['gelecek', 'Gelecek'],
          ['hepsi', 'Hepsi'],
        ].map(([k, ad]) => (
          <button
            type="button"
            key={k}
            className={aralik === k ? 'aktif' : ''}
            onClick={() => setAralik(k)}
          >
            {ad}
          </button>
        ))}
      </div>
      {liste.yukleniyor && !liste.veri ? (
        <Yukleniyor />
      ) : (
        <div className="tablo-sarici">
          <table className="tablo">
            <thead>
              <tr>
                <th>Giriş</th>
                <th>Çıkış</th>
                <th>Konuk</th>
                <th>Oda</th>
                <th>Kişi</th>
                <th>Kaynak</th>
                <th>Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(liste.veri || []).map((r) => {
                const d = REZ_DURUM[r.durum] || { etiket: r.durum, tur: 'notr' };
                const acik = r.durum === 'bekliyor' || r.durum === 'onayli';
                return (
                  <tr key={r.id}>
                    <td className="sayi">
                      {trGun(r.girisTarihi)}
                      {r.girisTarihi === bugun && acik && (
                        <>
                          {' '}
                          <Rozet tur="bilgi">bugün</Rozet>
                        </>
                      )}
                      {r.girisTarihi < bugun && acik && (
                        <>
                          {' '}
                          <Rozet tur="hata">gelmedi?</Rozet>
                        </>
                      )}
                    </td>
                    <td className="sayi">{trGun(r.cikisTarihi)}</td>
                    <td>
                      <b>{r.adSoyad}</b>
                      {r.telefon && (
                        <div className="soluk" style={{ fontSize: '0.8rem' }}>
                          {r.telefon}
                        </div>
                      )}
                      {r.notlar && (
                        <div className="soluk" style={{ fontSize: '0.8rem' }}>
                          {r.notlar}
                        </div>
                      )}
                    </td>
                    <td className="mono">{r.odaNo || <span className="soluk">-</span>}</td>
                    <td className="sayi">{r.kisiSayisi}</td>
                    <td>{REZ_KAYNAK[r.kaynak] || r.kaynak}</td>
                    <td>
                      <Rozet tur={d.tur}>{d.etiket}</Rozet>
                      {r.konaklamaId && (
                        <div style={{ fontSize: '0.8rem' }}>
                          <Link to={`/konaklamalar/${r.konaklamaId}`}>konaklama</Link>
                        </div>
                      )}
                    </td>
                    <td className="eylem">
                      {acik && (
                        <>
                          <button
                            type="button"
                            className="dugme dugme-kucuk dugme-birincil"
                            onClick={() => setGiris(r)}
                          >
                            Geldi
                          </button>
                          <button
                            type="button"
                            className="dugme dugme-kucuk"
                            onClick={() => setForm(r)}
                          >
                            Düzenle
                          </button>
                          <button
                            type="button"
                            className="dugme dugme-kucuk dugme-sade"
                            onClick={() => kapat(r, 'gelmedi')}
                          >
                            Gelmedi
                          </button>
                          <button
                            type="button"
                            className="dugme dugme-kucuk dugme-sade"
                            onClick={() => kapat(r, 'iptal')}
                          >
                            İptal
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {liste.veri && liste.veri.length === 0 && <BosDurum>Rezervasyon yok.</BosDurum>}
        </div>
      )}

      {form && odalar.veri && (
        <RezervasyonFormu
          rez={form.id ? form : null}
          odalar={odalar.veri}
          onKapat={() => setForm(null)}
          onTamam={() => tamam('Rezervasyon kaydedildi.')}
        />
      )}
      {giris && odalar.veri && (
        <GirisModal
          odalar={odalar.veri}
          rezervasyon={giris}
          onKapat={() => setGiris(null)}
          onTamam={(sonuc) =>
            tamam(`${sonuc.length} konuk için giriş kaydedildi, rezervasyon kapandı.`)
          }
        />
      )}
    </Sayfa>
  );
}
