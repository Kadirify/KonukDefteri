import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  auth,
  ayarlar as ayarApi,
  katlar as katApi,
  kbs,
  kullanicilar as kullaniciApi,
  odalar as odaApi,
  tesis as tesisApi,
  yedek as yedekApi,
} from '../api';
import { hataAlanlari, hataMesaji } from '../api/istemci';
import { useAuth } from '../hooks/useAuth';
import useTema, { TEMA_ETIKET } from '../hooks/useTema';
import useYukle from '../hooks/useYukle';
import Sayfa, { Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import Alan from '../components/Alan';
import Modal from '../components/Modal';
import OdaFormu from '../components/OdaFormu';
import { ROL } from '../utils/metin';
import { trTarih } from '../utils/tarih';

function sunucuHatalari(e, setError, setGenel) {
  const alanlar = hataAlanlari(e);
  Object.keys(alanlar).forEach((a) => setError(a, { type: 'server', message: alanlar[a] }));
  if (!Object.keys(alanlar).length) setGenel(hataMesaji(e));
}

function TesisAyarlari() {
  const { kullanici } = useAuth();
  const yonetici = kullanici.rol === 'yonetici';
  const { veri, yukleniyor, hata } = useYukle(() => tesisApi.oku(), []);
  const [mesaj, setMesaj] = useState('');
  const [genelHata, setGenelHata] = useState('');
  const [test, setTest] = useState(null);
  const { register, handleSubmit, reset, watch, setError, formState } = useForm();
  const kbsMod = watch('kbsMod');

  useEffect(() => {
    if (veri) reset({ ...veri, kbsSifre: '' });
  }, [veri, reset]);

  const kaydet = async (v) => {
    setMesaj('');
    setGenelHata('');
    try {
      const yeni = await tesisApi.kaydet(v);
      reset({ ...yeni, kbsSifre: '' });
      setMesaj('Tesis ayarları kaydedildi.');
    } catch (e) {
      sunucuHatalari(e, setError, setGenelHata);
    }
  };

  const baglantiTesti = async () => {
    setTest({ mesaj: 'Deneniyor...' });
    try {
      setTest(await kbs.test());
    } catch (e) {
      setTest({ tamam: false, mesaj: hataMesaji(e) });
    }
  };

  if (yukleniyor && !veri) return <Yukleniyor />;
  if (hata) return <Uyari tur="hata">{hata}</Uyari>;
  const { errors, isSubmitting } = formState;

  return (
    <form onSubmit={handleSubmit(kaydet)}>
      {mesaj && <Uyari tur="basari">{mesaj}</Uyari>}
      {!yonetici && <Uyari tur="bilgi">Bu ayarları yalnızca yönetici değiştirebilir.</Uyari>}
      <fieldset disabled={!yonetici} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="kart">
          <div className="kart-baslik">
            <h2>Tesis</h2>
          </div>
          <div className="izgara">
            <Alan etiket="Tesis adı" hata={errors.ad && errors.ad.message}>
              <input type="text" {...register('ad')} />
            </Alan>
            <Alan
              etiket="Tesis kodu"
              not="Karakol ya da emniyetin verdiği 6 haneli kod"
              hata={errors.tesisKodu && errors.tesisKodu.message}
            >
              <input type="text" className="mono" maxLength={6} {...register('tesisKodu')} />
            </Alan>
            <div className="alan">
              <span>Bağlı olduğu birim</span>
              <div className="secenekler">
                <label>
                  <input type="radio" value="emniyet" {...register('bolge')} /> Emniyet (belediye
                  sınırı içi)
                </label>
                <label>
                  <input type="radio" value="jandarma" {...register('bolge')} /> Jandarma (köy,
                  yayla, kırsal)
                </label>
              </div>
            </div>
            <Alan etiket="İl">
              <input type="text" {...register('il')} />
            </Alan>
            <Alan etiket="İlçe">
              <input type="text" {...register('ilce')} />
            </Alan>
            <Alan etiket="Telefon">
              <input type="tel" {...register('telefon')} />
            </Alan>
            <Alan etiket="Adres" genis>
              <input type="text" {...register('adres')} />
            </Alan>
          </div>
        </div>

        <div className="kart">
          <div className="kart-baslik">
            <h2>KBS bağlantısı</h2>
            <button type="button" className="dugme dugme-kucuk" onClick={baglantiTesti}>
              Bağlantı testi
            </button>
          </div>
          {test && (
            <Uyari tur={test.tamam ? 'basari' : test.tamam === false ? 'hata' : 'bilgi'}>
              {test.mesaj}
            </Uyari>
          )}
          <div className="izgara">
            <div className="alan genis">
              <span>Bildirim yolu</span>
              <div className="secenekler">
                <label>
                  <input type="radio" value="manuel" {...register('kbsMod')} /> Manuel: alanları
                  kopyalayıp portala kendim giriyorum
                </label>
                <label>
                  <input type="radio" value="jandarma" {...register('kbsMod')} /> Jandarma web
                  servisi: program kendisi gönderir
                </label>
              </div>
              <small className="alan-not">Emniyet için web servis yok, manuel mod.</small>
            </div>
            {kbsMod === 'jandarma' && (
              <>
                <Alan
                  etiket="Web servis kullanıcısı (TC)"
                  not="KBS'de web servis yetkisi verilen kullanıcı"
                  hata={errors.kbsKullanici && errors.kbsKullanici.message}
                >
                  <input type="text" className="mono" {...register('kbsKullanici')} />
                </Alan>
                <Alan
                  etiket="Web servis şifresi"
                  not={veri.kbsSifreVar ? 'Kayıtlı; değiştirmek için yazın' : 'Henüz kayıtlı değil'}
                  hata={errors.kbsSifre && errors.kbsSifre.message}
                >
                  <input type="password" autoComplete="new-password" {...register('kbsSifre')} />
                </Alan>
                <Alan
                  etiket="WSDL adresi"
                  genis
                  not="Boş bırakılırsa .env'deki adres kullanılır"
                  hata={errors.kbsWsdl && errors.kbsWsdl.message}
                >
                  <input type="text" className="mono" {...register('kbsWsdl')} />
                </Alan>
              </>
            )}
          </div>
        </div>
        {genelHata && <div className="form-hata">{genelHata}</div>}
        {yonetici && (
          <div className="form-alt">
            <button type="submit" className="dugme dugme-birincil" disabled={isSubmitting}>
              Kaydet
            </button>
          </div>
        )}
      </fieldset>
    </form>
  );
}

function KatFormu({ kat, onKapat, onTamam }) {
  const [ad, setAd] = useState(kat ? kat.ad : '');
  const [koridor, setKoridor] = useState(kat ? kat.koridor : 'orta');
  const [hata, setHata] = useState('');

  const kaydet = async () => {
    setHata('');
    try {
      onTamam(
        kat
          ? await katApi.duzenle(kat.id, { ad, koridor, aktif: kat.aktif })
          : await katApi.ekle({ ad, koridor })
      );
    } catch (e) {
      setHata(hataMesaji(e));
    }
  };

  return (
    <Modal baslik={kat ? kat.ad : 'Yeni kat'} onKapat={onKapat}>
      <div className="izgara">
        <Alan etiket="Kat adı">
          <input type="text" value={ad} onChange={(e) => setAd(e.target.value)} autoFocus />
        </Alan>
        <Alan etiket="Koridor">
          <select value={koridor} onChange={(e) => setKoridor(e.target.value)}>
            <option value="orta">Ortada koridor</option>
            <option value="yok">Koridor yok, tek sıra</option>
          </select>
        </Alan>
      </div>
      {hata && <div className="form-hata">{hata}</div>}
      <div className="form-alt">
        <button type="button" className="dugme" onClick={onKapat}>
          Vazgeç
        </button>
        <button
          type="button"
          className="dugme dugme-birincil"
          onClick={kaydet}
          disabled={!ad.trim()}
        >
          Kaydet
        </button>
      </div>
    </Modal>
  );
}

function Katlar() {
  const katlar = useYukle(() => katApi.liste(), []);
  const odalar = useYukle(() => odaApi.liste(), []);
  const [form, setForm] = useState(null);
  const [odaForm, setOdaForm] = useState(null);
  const [hata, setHata] = useState('');
  const [mesaj, setMesaj] = useState('');

  const yenile = (m) => {
    setMesaj(m || '');
    setForm(null);
    setOdaForm(null);
    katlar.yenile();
    odalar.yenile();
  };

  const tasi = async (i, yon) => {
    const idler = katlar.veri.map((k) => k.id);
    const j = i + yon;
    if (j < 0 || j >= idler.length) return;
    [idler[i], idler[j]] = [idler[j], idler[i]];
    try {
      katlar.setVeri(await katApi.sira(idler));
    } catch (e) {
      setHata(hataMesaji(e));
    }
  };

  const odaTasi = async (kat, liste, i, yon) => {
    const idler = liste.map((o) => o.id);
    const j = i + yon;
    if (j < 0 || j >= idler.length) return;
    [idler[i], idler[j]] = [idler[j], idler[i]];
    try {
      odalar.setVeri(await odaApi.sira(kat.id, idler));
    } catch (e) {
      setHata(hataMesaji(e));
    }
  };

  const sil = async (kat) => {
    if (!window.confirm(`${kat.ad} silinsin mi?`)) return;
    try {
      await katApi.sil(kat.id);
      yenile('Kat silindi.');
    } catch (e) {
      setHata(hataMesaji(e));
    }
  };

  if ((katlar.yukleniyor && !katlar.veri) || (odalar.yukleniyor && !odalar.veri))
    return <Yukleniyor />;

  return (
    <>
      {mesaj && <Uyari tur="basari">{mesaj}</Uyari>}
      {hata && <Uyari tur="hata">{hata}</Uyari>}
      <div className="kart">
        <div className="kart-baslik">
          <h2>Katlar ve oda sırası</h2>
          <span>
            <button
              type="button"
              className="dugme dugme-kucuk"
              onClick={() => setOdaForm({})}
              style={{ marginRight: 6 }}
            >
              + Oda
            </button>
            <button
              type="button"
              className="dugme dugme-kucuk dugme-birincil"
              onClick={() => setForm({})}
            >
              + Kat
            </button>
          </span>
        </div>
        {(katlar.veri || []).map((k, i) => {
          const katOdalari = (odalar.veri || [])
            .filter((o) => o.kat && o.kat.id === k.id)
            .sort((a, b) => a.sira - b.sira);
          return (
            <div key={k.id} style={{ borderTop: '1px solid var(--cizgi)', padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <b style={{ minWidth: 120 }}>{k.ad}</b>
                <span className="soluk" style={{ fontSize: '0.82rem' }}>
                  {katOdalari.length} oda - {k.koridor === 'yok' ? 'tek sıra' : 'ortada koridor'}
                </span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    className="dugme dugme-kucuk"
                    onClick={() => tasi(i, -1)}
                    disabled={i === 0}
                  >
                    Yukarı
                  </button>
                  <button
                    type="button"
                    className="dugme dugme-kucuk"
                    onClick={() => tasi(i, 1)}
                    disabled={i === katlar.veri.length - 1}
                  >
                    Aşağı
                  </button>
                  <button type="button" className="dugme dugme-kucuk" onClick={() => setForm(k)}>
                    Düzenle
                  </button>
                  {katOdalari.length === 0 && (
                    <button
                      type="button"
                      className="dugme dugme-kucuk dugme-tehlike"
                      onClick={() => sil(k)}
                    >
                      Sil
                    </button>
                  )}
                </span>
              </div>
              {katOdalari.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {katOdalari.map((o, j) => (
                    <span
                      key={o.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                        border: '1px solid var(--cizgi)',
                        borderRadius: 6,
                        padding: '2px 4px 2px 8px',
                        fontSize: '0.82rem',
                      }}
                    >
                      <span className="mono">{o.odaNo}</span>
                      {o.tur === 'ortak' && <span className="soluk"> ortak</span>}
                      <button
                        type="button"
                        className="dugme dugme-sade dugme-kucuk"
                        style={{ padding: '0 5px' }}
                        onClick={() => odaTasi(k, katOdalari, j, -1)}
                        disabled={j === 0}
                        title="Sola al"
                      >
                        {'<'}
                      </button>
                      <button
                        type="button"
                        className="dugme dugme-sade dugme-kucuk"
                        style={{ padding: '0 5px' }}
                        onClick={() => odaTasi(k, katOdalari, j, 1)}
                        disabled={j === katOdalari.length - 1}
                        title="Sağa al"
                      >
                        {'>'}
                      </button>
                      <button
                        type="button"
                        className="dugme dugme-sade dugme-kucuk"
                        style={{ padding: '0 5px' }}
                        onClick={() => setOdaForm(o)}
                      >
                        Düzenle
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {(katlar.veri || []).length === 0 && <p className="soluk">Kat yok.</p>}
        {(odalar.veri || []).some((o) => !o.kat) && (
          <Uyari tur="uyari">
            Kata atanmamış odalar var:{' '}
            {(odalar.veri || [])
              .filter((o) => !o.kat)
              .map((o) => o.odaNo)
              .join(', ')}
            . Düzenleyip kat seçin.
          </Uyari>
        )}
      </div>
      {form && (
        <KatFormu
          kat={form.id ? form : null}
          onKapat={() => setForm(null)}
          onTamam={() => yenile('Kat kaydedildi.')}
        />
      )}
      {odaForm && (
        <OdaFormu
          oda={odaForm.id ? odaForm : null}
          katlar={katlar.veri || []}
          onKapat={() => setOdaForm(null)}
          onTamam={() => yenile('Oda kaydedildi.')}
        />
      )}
    </>
  );
}

function KullaniciFormu({ kullanici, onKapat, onTamam }) {
  const [genelHata, setGenelHata] = useState('');
  const { register, handleSubmit, setError, formState } = useForm({
    defaultValues: kullanici
      ? { adSoyad: kullanici.adSoyad, rol: kullanici.rol, aktif: kullanici.aktif, parola: '' }
      : { adSoyad: '', kullaniciAdi: '', parola: '', rol: 'resepsiyon' },
  });
  const { errors, isSubmitting } = formState;

  const gonder = async (v) => {
    setGenelHata('');
    try {
      onTamam(kullanici ? await kullaniciApi.duzenle(kullanici.id, v) : await kullaniciApi.ekle(v));
    } catch (e) {
      sunucuHatalari(e, setError, setGenelHata);
    }
  };

  return (
    <Modal baslik={kullanici ? kullanici.adSoyad : 'Yeni kullanıcı'} onKapat={onKapat}>
      <form onSubmit={handleSubmit(gonder)}>
        <div className="izgara">
          <Alan
            etiket="Ad soyad"
            hata={errors.adSoyad && (errors.adSoyad.message || 'Zorunlu alan')}
          >
            <input type="text" {...register('adSoyad', { required: true })} />
          </Alan>
          {!kullanici && (
            <Alan
              etiket="Kullanıcı adı"
              not="Küçük harf, rakam, nokta"
              hata={errors.kullaniciAdi && (errors.kullaniciAdi.message || 'Zorunlu alan')}
            >
              <input
                type="text"
                className="mono"
                {...register('kullaniciAdi', { required: true })}
              />
            </Alan>
          )}
          <Alan
            etiket={kullanici ? 'Yeni parola (boşsa değişmez)' : 'Parola'}
            not="En az 8 karakter"
            hata={errors.parola && (errors.parola.message || 'En az 8 karakter')}
          >
            <input
              type="password"
              autoComplete="new-password"
              {...register('parola', { required: !kullanici, minLength: 8 })}
            />
          </Alan>
          <Alan etiket="Rol">
            <select {...register('rol')}>
              <option value="resepsiyon">Resepsiyon</option>
              <option value="yonetici">Yönetici</option>
              <option value="kat_gorevlisi">Kat görevlisi</option>
            </select>
          </Alan>
          {kullanici && (
            <div className="alan">
              <label className="secenekler">
                <input type="checkbox" {...register('aktif')} />
                <span>Hesap aktif</span>
              </label>
            </div>
          )}
        </div>
        {genelHata && <div className="form-hata">{genelHata}</div>}
        <div className="form-alt">
          <button type="button" className="dugme" onClick={onKapat}>
            Vazgeç
          </button>
          <button type="submit" className="dugme dugme-birincil" disabled={isSubmitting}>
            Kaydet
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Kullanicilar() {
  const { veri, yukleniyor, hata, yenile } = useYukle(() => kullaniciApi.liste(), []);
  const [form, setForm] = useState(null);

  if (yukleniyor && !veri) return <Yukleniyor />;
  if (hata) return <Uyari tur="hata">{hata}</Uyari>;

  return (
    <div className="kart">
      <div className="kart-baslik">
        <h2>Kullanıcılar</h2>
        <button
          type="button"
          className="dugme dugme-kucuk dugme-birincil"
          onClick={() => setForm({})}
        >
          + Kullanıcı
        </button>
      </div>
      <div className="tablo-sarici" style={{ boxShadow: 'none' }}>
        <table className="tablo">
          <thead>
            <tr>
              <th>Ad soyad</th>
              <th>Kullanıcı adı</th>
              <th>Rol</th>
              <th>Durum</th>
              <th>Son giriş</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {veri.map((k) => (
              <tr key={k.id}>
                <td>{k.adSoyad}</td>
                <td className="mono">{k.kullaniciAdi}</td>
                <td>{ROL[k.rol] || k.rol}</td>
                <td>{k.aktif ? 'Aktif' : <span className="soluk">Pasif</span>}</td>
                <td className="sayi">{k.sonGiris ? trTarih(k.sonGiris) : '-'}</td>
                <td className="eylem">
                  <button type="button" className="dugme dugme-kucuk" onClick={() => setForm(k)}>
                    Düzenle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {form && (
        <KullaniciFormu
          kullanici={form.id ? form : null}
          onKapat={() => setForm(null)}
          onTamam={() => {
            setForm(null);
            yenile();
          }}
        />
      )}
    </div>
  );
}

function Genel() {
  const { kullanici } = useAuth();
  const { tema, setTema } = useTema();
  const { veri, yukleniyor, hata } = useYukle(() => ayarApi.oku(), []);
  const [mesaj, setMesaj] = useState('');
  const [genelHata, setGenelHata] = useState('');
  const { register, handleSubmit, reset, setError, formState } = useForm();

  useEffect(() => {
    if (veri) {
      reset({
        kuyruk_dakika: veri.kuyruk_dakika,
        saklama_yil: veri.saklama_yil,
        giris_saati: veri.giris_saati,
        cikis_saati: veri.cikis_saati,
        cikista_temizlik: veri.cikista_temizlik === '1',
        temizlik_kontrolu: veri.temizlik_kontrolu === '1',
        gunubirlik_izinli: veri.gunubirlik_izinli === '1',
        gunubirlik_saat: veri.gunubirlik_saat,
        kvkk_metni: veri.kvkk_metni || '',
      });
    }
  }, [veri, reset]);

  const kaydet = async (v) => {
    setMesaj('');
    setGenelHata('');
    try {
      await ayarApi.kaydet({
        kuyruk_dakika: Number(v.kuyruk_dakika),
        saklama_yil: Number(v.saklama_yil),
        giris_saati: v.giris_saati,
        cikis_saati: v.cikis_saati,
        cikista_temizlik: v.cikista_temizlik ? '1' : '0',
        temizlik_kontrolu: v.temizlik_kontrolu ? '1' : '0',
        gunubirlik_izinli: v.gunubirlik_izinli ? '1' : '0',
        gunubirlik_saat: Number(v.gunubirlik_saat),
        kvkk_metni: v.kvkk_metni,
      });
      setMesaj('Kaydedildi. Kuyruk aralığı sunucu yeniden başlayınca geçerli olur.');
    } catch (e) {
      sunucuHatalari(e, setError, setGenelHata);
    }
  };

  if (yukleniyor && !veri) return <Yukleniyor />;
  if (hata) return <Uyari tur="hata">{hata}</Uyari>;
  const { errors, isSubmitting } = formState;
  const yonetici = kullanici.rol === 'yonetici';

  return (
    <>
      <div className="kart">
        <div className="kart-baslik">
          <h2>Görünüm</h2>
        </div>
        <Alan etiket="Tema" not="Bu bilgisayar için">
          <select value={tema} onChange={(e) => setTema(e.target.value)} style={{ maxWidth: 240 }}>
            {Object.keys(TEMA_ETIKET).map((t) => (
              <option key={t} value={t}>
                {TEMA_ETIKET[t]}
              </option>
            ))}
          </select>
        </Alan>
      </div>
      <form onSubmit={handleSubmit(kaydet)}>
        {mesaj && <Uyari tur="basari">{mesaj}</Uyari>}
        <fieldset disabled={!yonetici} style={{ border: 0, padding: 0, margin: 0 }}>
          <div className="kart">
            <div className="kart-baslik">
              <h2>Konaklama kuralları</h2>
            </div>
            <div className="izgara">
              <Alan etiket="Giriş saati" hata={errors.giris_saati && errors.giris_saati.message}>
                <input type="time" {...register('giris_saati')} />
              </Alan>
              <Alan etiket="Çıkış saati" hata={errors.cikis_saati && errors.cikis_saati.message}>
                <input type="time" {...register('cikis_saati')} />
              </Alan>
              <Alan
                etiket="Günübirlik süre (saat)"
                hata={errors.gunubirlik_saat && errors.gunubirlik_saat.message}
              >
                <input type="number" min={1} max={24} {...register('gunubirlik_saat')} />
              </Alan>
              <div className="alan">
                <label className="secenekler">
                  <input type="checkbox" {...register('gunubirlik_izinli')} />
                  <span>Günübirlik (saatlik) kullanım yapılabilir</span>
                </label>
              </div>
            </div>
          </div>
          <div className="kart">
            <div className="kart-baslik">
              <h2>Temizlik kuralları</h2>
            </div>
            <div className="izgara">
              <div className="alan">
                <label className="secenekler">
                  <input type="checkbox" {...register('cikista_temizlik')} />
                  <span>Çıkışta otomatik temizlik görevi aç</span>
                </label>
              </div>
              <div className="alan">
                <label className="secenekler">
                  <input type="checkbox" {...register('temizlik_kontrolu')} />
                  <span>
                    Temizlik bitince yönetici kontrolü istensin (oda "kontrol bekliyor" olur)
                  </span>
                </label>
              </div>
            </div>
          </div>
          <div className="kart">
            <div className="kart-baslik">
              <h2>Sunucu</h2>
            </div>
            <div className="izgara">
              <Alan
                etiket="Kuyruk deneme aralığı (dakika)"
                hata={errors.kuyruk_dakika && errors.kuyruk_dakika.message}
              >
                <input type="number" min={1} max={60} {...register('kuyruk_dakika')} />
              </Alan>
              <Alan
                etiket="Kayıt saklama süresi (yıl)"
                not="Konuk kayıtları bu süre sonunda silinebilir"
                hata={errors.saklama_yil && errors.saklama_yil.message}
              >
                <input type="number" min={1} max={10} {...register('saklama_yil')} />
              </Alan>
            </div>
          </div>
          <div className="kart">
            <div className="kart-baslik">
              <h2>Kayıt formu</h2>
            </div>
            <Alan
              etiket="KVKK aydınlatma metni"
              not="Kayıt formunun altına basılır"
              hata={errors.kvkk_metni && errors.kvkk_metni.message}
            >
              <textarea rows={10} maxLength={4000} {...register('kvkk_metni')} />
            </Alan>
          </div>
          {genelHata && <div className="form-hata">{genelHata}</div>}
          {yonetici && (
            <div className="form-alt">
              <button type="submit" className="dugme dugme-birincil" disabled={isSubmitting}>
                Kaydet
              </button>
            </div>
          )}
        </fieldset>
      </form>
    </>
  );
}

function Parola() {
  const { guncelle } = useAuth();
  const [mesaj, setMesaj] = useState('');
  const [genelHata, setGenelHata] = useState('');
  const { register, handleSubmit, reset, setError, watch, formState } = useForm({
    defaultValues: { eskiParola: '', yeniParola: '', tekrar: '' },
  });
  const yeni = watch('yeniParola');

  const kaydet = async (v) => {
    setMesaj('');
    setGenelHata('');
    try {
      await auth.parola({ eskiParola: v.eskiParola, yeniParola: v.yeniParola });
      guncelle({ ilkParola: false });
      reset();
      setMesaj('Parola değiştirildi.');
    } catch (e) {
      sunucuHatalari(e, setError, setGenelHata);
    }
  };

  const { errors, isSubmitting } = formState;
  return (
    <form className="kart" onSubmit={handleSubmit(kaydet)} style={{ maxWidth: 480 }}>
      <div className="kart-baslik">
        <h2>Parola değiştir</h2>
      </div>
      {mesaj && <Uyari tur="basari">{mesaj}</Uyari>}
      <div className="izgara" style={{ gridTemplateColumns: '1fr' }}>
        <Alan
          etiket="Mevcut parola"
          hata={errors.eskiParola && (errors.eskiParola.message || 'Zorunlu alan')}
        >
          <input
            type="password"
            autoComplete="current-password"
            {...register('eskiParola', { required: true })}
          />
        </Alan>
        <Alan
          etiket="Yeni parola"
          not="En az 8 karakter"
          hata={errors.yeniParola && (errors.yeniParola.message || 'En az 8 karakter')}
        >
          <input
            type="password"
            autoComplete="new-password"
            {...register('yeniParola', { required: true, minLength: 8 })}
          />
        </Alan>
        <Alan etiket="Yeni parola (tekrar)" hata={errors.tekrar && 'Parolalar aynı değil'}>
          <input
            type="password"
            autoComplete="new-password"
            {...register('tekrar', { validate: (v) => v === yeni })}
          />
        </Alan>
      </div>
      {genelHata && <div className="form-hata">{genelHata}</div>}
      <div className="form-alt">
        <button type="submit" className="dugme dugme-birincil" disabled={isSubmitting}>
          Değiştir
        </button>
      </div>
    </form>
  );
}

function boyutMetni(b) {
  if (b >= 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB';
  return Math.max(1, Math.round(b / 1024)) + ' KB';
}

const YEDEK_TUR = { otomatik: 'otomatik', manuel: 'elle', guvenlik: 'geri yükleme öncesi' };

function Yedekleme() {
  const ayar = useYukle(() => ayarApi.oku(), []);
  const liste = useYukle(() => yedekApi.liste(), []);
  const [mesaj, setMesaj] = useState('');
  const [genelHata, setGenelHata] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const { register, handleSubmit, reset, setError, formState } = useForm();

  useEffect(() => {
    if (ayar.veri) {
      reset({
        yedek_otomatik: ayar.veri.yedek_otomatik === '1',
        yedek_saati: ayar.veri.yedek_saati,
        yedek_adet: ayar.veri.yedek_adet,
        yedek_klasoru: ayar.veri.yedek_klasoru || '',
      });
    }
  }, [ayar.veri, reset]);

  const kaydet = async (v) => {
    setMesaj('');
    setGenelHata('');
    try {
      await ayarApi.kaydet({
        yedek_otomatik: v.yedek_otomatik ? '1' : '0',
        yedek_saati: v.yedek_saati,
        yedek_adet: Number(v.yedek_adet),
        yedek_klasoru: v.yedek_klasoru,
      });
      setMesaj('Kaydedildi. Zamanlama sunucu yeniden başlayınca geçerli olur.');
      liste.yenile();
    } catch (e) {
      sunucuHatalari(e, setError, setGenelHata);
    }
  };

  const islem = async (fn, basari) => {
    setMesaj('');
    setGenelHata('');
    setMesgul(true);
    try {
      await fn();
      setMesaj(basari);
      liste.yenile();
    } catch (e) {
      setGenelHata(hataMesaji(e));
    } finally {
      setMesgul(false);
    }
  };

  const geriYukle = (d) => {
    const soru =
      `${d.ad} geri yüklensin mi?\n\n` +
      'Şu anki tüm kayıtlar bu yedektekilerle değiştirilir. ' +
      'Önce mevcut durumun bir kopyası alınır.';
    if (!window.confirm(soru)) return;
    islem(() => yedekApi.geriYukle(d.ad), 'Yedek geri yüklendi.');
  };

  const sil = (d) => {
    if (!window.confirm(`${d.ad} silinsin mi?`)) return;
    islem(() => yedekApi.sil(d.ad), 'Yedek silindi.');
  };

  if ((ayar.yukleniyor && !ayar.veri) || (liste.yukleniyor && !liste.veri)) return <Yukleniyor />;
  if (ayar.hata) return <Uyari tur="hata">{ayar.hata}</Uyari>;
  const { errors, isSubmitting } = formState;
  const dosyalar = liste.veri ? liste.veri.dosyalar : [];
  const klasor = liste.veri ? liste.veri.klasor : '';

  return (
    <>
      {mesaj && <Uyari tur="basari">{mesaj}</Uyari>}
      {genelHata && <Uyari tur="hata">{genelHata}</Uyari>}
      {liste.hata && <Uyari tur="hata">{liste.hata}</Uyari>}
      <form onSubmit={handleSubmit(kaydet)}>
        <div className="kart">
          <div className="kart-baslik">
            <h2>Otomatik yedek</h2>
          </div>
          <div className="izgara">
            <div className="alan">
              <label className="secenekler">
                <input type="checkbox" {...register('yedek_otomatik')} />
                <span>Her gün kendiliğinden yedek al</span>
              </label>
            </div>
            <Alan etiket="Saat" hata={errors.yedek_saati && errors.yedek_saati.message}>
              <input type="time" {...register('yedek_saati')} />
            </Alan>
            <Alan
              etiket="Tutulacak yedek sayısı"
              not="En yeniler kalır, eskileri silinir"
              hata={errors.yedek_adet && errors.yedek_adet.message}
            >
              <input type="number" min={1} max={365} {...register('yedek_adet')} />
            </Alan>
            <Alan
              etiket="Klasör"
              genis
              not="Boş bırakılırsa veri klasörünün altındaki yedek klasörü kullanılır"
              hata={errors.yedek_klasoru && errors.yedek_klasoru.message}
            >
              <input type="text" placeholder={klasor} {...register('yedek_klasoru')} />
            </Alan>
          </div>
          <div className="form-alt">
            <button type="submit" className="dugme dugme-birincil" disabled={isSubmitting}>
              Kaydet
            </button>
          </div>
        </div>
      </form>
      <div className="kart">
        <div className="kart-baslik">
          <h2>Yedekler</h2>
          <button
            type="button"
            className="dugme dugme-kucuk dugme-birincil"
            disabled={mesgul}
            onClick={() => islem(() => yedekApi.al(), 'Yedek alındı.')}
          >
            Şimdi yedek al
          </button>
        </div>
        <p className="soluk" style={{ fontSize: '0.84rem' }}>
          Klasör: <span className="mono">{klasor}</span>. Arada bir USB'ye de kopyalayın.
        </p>
        {dosyalar.length === 0 ? (
          <p className="soluk">Yedek yok.</p>
        ) : (
          <div className="tablo-sarici" style={{ boxShadow: 'none' }}>
            <table className="tablo">
              <thead>
                <tr>
                  <th>Dosya</th>
                  <th>Tür</th>
                  <th>Boyut</th>
                  <th>Zaman</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {dosyalar.map((d) => (
                  <tr key={d.ad}>
                    <td className="mono">{d.ad}</td>
                    <td>{YEDEK_TUR[d.tur] || d.tur}</td>
                    <td className="sayi">{boyutMetni(d.boyut)}</td>
                    <td className="sayi">{trTarih(d.zaman)}</td>
                    <td className="eylem">
                      <a className="dugme dugme-kucuk" href={yedekApi.indirAdresi(d.ad)}>
                        İndir
                      </a>
                      <button
                        type="button"
                        className="dugme dugme-kucuk"
                        disabled={mesgul}
                        onClick={() => geriYukle(d)}
                      >
                        Geri yükle
                      </button>
                      <button
                        type="button"
                        className="dugme dugme-kucuk dugme-sade"
                        disabled={mesgul}
                        onClick={() => sil(d)}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default function Ayarlar() {
  const { kullanici } = useAuth();
  const yonetici = kullanici.rol === 'yonetici';
  const gorevli = kullanici.rol === 'kat_gorevlisi';
  const sekmeler = gorevli
    ? [['parola', 'Parola']]
    : [
        ['tesis', 'Tesis ve KBS'],
        ...(yonetici
          ? [
              ['katlar', 'Katlar ve odalar'],
              ['kullanicilar', 'Kullanıcılar'],
            ]
          : []),
        ['genel', 'Genel'],
        ...(yonetici ? [['yedek', 'Yedekleme']] : []),
        ['parola', 'Parola'],
      ];
  const ilk = gorevli ? 'parola' : 'tesis';
  return (
    <Sayfa baslik="Ayarlar">
      <div className="sekmeler">
        {sekmeler.map(([yol, ad]) => (
          <NavLink key={yol} to={yol} className={({ isActive }) => (isActive ? 'aktif' : '')}>
            {ad}
          </NavLink>
        ))}
      </div>
      <Routes>
        <Route index element={<Navigate to={ilk} replace />} />
        {!gorevli && <Route path="tesis" element={<TesisAyarlari />} />}
        {yonetici && <Route path="katlar" element={<Katlar />} />}
        {yonetici && <Route path="kullanicilar" element={<Kullanicilar />} />}
        {!gorevli && <Route path="genel" element={<Genel />} />}
        {yonetici && <Route path="yedek" element={<Yedekleme />} />}
        <Route path="parola" element={<Parola />} />
        <Route path="*" element={<Navigate to={ilk} replace />} />
      </Routes>
    </Sayfa>
  );
}
