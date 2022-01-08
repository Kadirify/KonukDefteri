import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { hataMesaji } from '../api/istemci';
import Alan from '../components/Alan';
import Logo from '../components/Logo';

export default function Giris() {
  const { kullanici, giris } = useAuth();
  const navigate = useNavigate();
  const konum = useLocation();
  const [hata, setHata] = useState('');
  const { register, handleSubmit, formState } = useForm({
    defaultValues: { kullaniciAdi: '', parola: '' },
  });

  if (kullanici) return <Navigate to="/" replace />;

  const gonder = async (v) => {
    setHata('');
    try {
      await giris(v);
      const hedef = (konum.state && konum.state.nereden) || '/';
      navigate(hedef, { replace: true });
    } catch (e) {
      setHata(hataMesaji(e));
    }
  };

  return (
    <div className="tam-ekran">
      <form className="giris-kutusu" onSubmit={handleSubmit(gonder)}>
        <div className="marka">
          <Logo boyut={34} />
        </div>
        <div className="izgara" style={{ gridTemplateColumns: '1fr' }}>
          <Alan etiket="Kullanıcı adı">
            <input
              type="text"
              autoComplete="username"
              autoFocus
              {...register('kullaniciAdi', { required: true })}
            />
          </Alan>
          <Alan etiket="Parola">
            <input
              type="password"
              autoComplete="current-password"
              {...register('parola', { required: true })}
            />
          </Alan>
        </div>
        {hata && <div className="form-hata">{hata}</div>}
        <div className="form-alt">
          <button type="submit" className="dugme dugme-birincil" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? 'Giriş yapılıyor...' : 'Giriş yap'}
          </button>
        </div>
      </form>
    </div>
  );
}
