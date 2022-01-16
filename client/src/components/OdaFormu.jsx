import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Alan from './Alan';
import { hataAlanlari, hataMesaji } from '../api/istemci';

export const bosOda = {
  odaNo: '',
  tip: '',
  kapasite: 2,
  kat: '',
  aktif: true,
  notlar: '',
};

// onKaydet(values) bir promise döndürür; sunucu alan hatası dönerse forma yazılır.
export default function OdaFormu({ varsayilan, onKaydet, onIptal }) {
  const [genelHata, setGenelHata] = useState('');
  const { register, handleSubmit, setError, formState } = useForm({
    defaultValues: varsayilan
      ? {
          odaNo: varsayilan.odaNo,
          tip: varsayilan.tip || '',
          kapasite: varsayilan.kapasite,
          kat: varsayilan.kat || '',
          aktif: varsayilan.aktif,
          notlar: varsayilan.notlar || '',
        }
      : bosOda,
  });
  const { errors, isSubmitting } = formState;

  const gonder = async (v) => {
    setGenelHata('');
    try {
      await onKaydet({
        odaNo: v.odaNo,
        tip: v.tip,
        kapasite: Number(v.kapasite),
        kat: v.kat,
        aktif: !!v.aktif,
        notlar: v.notlar,
      });
    } catch (e) {
      const alanlar = hataAlanlari(e);
      Object.keys(alanlar).forEach((a) => setError(a, { type: 'server', message: alanlar[a] }));
      if (!Object.keys(alanlar).length) setGenelHata(hataMesaji(e));
    }
  };

  return (
    <form onSubmit={handleSubmit(gonder)}>
      <div className="izgara">
        <Alan etiket="Oda no" hata={errors.odaNo && (errors.odaNo.message || 'Zorunlu alan')}>
          <input type="text" className="mono" {...register('odaNo', { required: true })} />
        </Alan>
        <Alan etiket="Tip">
          <input type="text" {...register('tip')} />
        </Alan>
        <Alan
          etiket="Kapasite (kişi)"
          hata={errors.kapasite && (errors.kapasite.message || '1-20')}
        >
          <input
            type="number"
            min={1}
            max={20}
            {...register('kapasite', { required: true, min: 1, max: 20 })}
          />
        </Alan>
        <Alan etiket="Kat" not="Zemin, 1, 2...">
          <input type="text" {...register('kat')} />
        </Alan>
        <Alan etiket="Not" genis>
          <input type="text" {...register('notlar')} />
        </Alan>
        <div className="alan genis">
          <label className="secenekler">
            <input type="checkbox" {...register('aktif')} />
            <span>Aktif (girişe açık)</span>
          </label>
        </div>
      </div>
      {genelHata && <div className="form-hata">{genelHata}</div>}
      <div className="form-alt">
        {onIptal && (
          <button type="button" className="dugme" onClick={onIptal}>
            Vazgeç
          </button>
        )}
        <button type="submit" className="dugme dugme-birincil" disabled={isSubmitting}>
          {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}
