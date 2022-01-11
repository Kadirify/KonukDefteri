import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { auth, ayarlar as ayarApi, kullanicilar as kullaniciApi, tesis as tesisApi } from '../api';
import { hataAlanlari, hataMesaji } from '../api/istemci';
import { useAuth } from '../hooks/useAuth';
import useTema, { TEMA_ETIKET } from '../hooks/useTema';
import useYukle from '../hooks/useYukle';
import Sayfa, { Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import Alan from '../components/Alan';
import Modal from '../components/Modal';
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
  const { register, handleSubmit, reset, setError, formState } = useForm();

  useEffect(() => {
    if (veri) reset(veri);
  }, [veri, reset]);

  const kaydet = async (v) => {
    setMesaj('');
    setGenelHata('');
    try {
      reset(await tesisApi.kaydet(v));
      setMesaj('Tesis ayarları kaydedildi.');
    } catch (e) {
      sunucuHatalari(e, setError, setGenelHata);
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
            <Alan etiket="Bağlı olduğu birim" hata={errors.bolge && errors.bolge.message}>
              <select {...register('bolge')}>
                <option value="emniyet">Emniyet (belediye sınırı içi)</option>
                <option value="jandarma">Jandarma (köy, yayla, kırsal)</option>
              </select>
            </Alan>
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

function KullaniciFormu({ kullanici, onKapat, onTamam }) {
  const [genelHata, setGenelHata] = useState('');
  const { register, handleSubmit, setError, formState } = useForm({
    defaultValues: kullanici
      ? {
          adSoyad: kullanici.adSoyad,
          rol: kullanici.rol,
          aktif: kullanici.aktif,
          parola: '',
        }
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
    if (veri) reset({ saklama_yil: veri.saklama_yil });
  }, [veri, reset]);

  const kaydet = async (v) => {
    setMesaj('');
    setGenelHata('');
    try {
      await ayarApi.kaydet({ saklama_yil: Number(v.saklama_yil) });
      setMesaj('Kaydedildi.');
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
              <h2>Kayıtlar</h2>
            </div>
            <div className="izgara">
              <Alan
                etiket="Kayıt saklama süresi (yıl)"
                not="Konuk kayıtları bu süre sonunda silinebilir"
                hata={errors.saklama_yil && errors.saklama_yil.message}
              >
                <input type="number" min={1} max={10} {...register('saklama_yil')} />
              </Alan>
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

export default function Ayarlar() {
  const { kullanici } = useAuth();
  const yonetici = kullanici.rol === 'yonetici';
  const sekmeler = [
    ['tesis', 'Tesis'],
    ...(yonetici ? [['kullanicilar', 'Kullanıcılar']] : []),
    ['genel', 'Genel'],
    ['parola', 'Parola'],
  ];
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
        <Route index element={<Navigate to="tesis" replace />} />
        <Route path="tesis" element={<TesisAyarlari />} />
        {yonetici && <Route path="kullanicilar" element={<Kullanicilar />} />}
        <Route path="genel" element={<Genel />} />
        <Route path="parola" element={<Parola />} />
        <Route path="*" element={<Navigate to="tesis" replace />} />
      </Routes>
    </Sayfa>
  );
}
