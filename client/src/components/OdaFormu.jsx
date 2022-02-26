import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { odalar as odaApi } from '../api';
import { hataAlanlari, hataMesaji } from '../api/istemci';
import Modal from './Modal';
import Alan from './Alan';

export default function OdaFormu({ oda, katlar, varsayilanKat, onKapat, onTamam }) {
  const [genelHata, setGenelHata] = useState('');
  const { register, handleSubmit, setError, formState } = useForm({
    defaultValues: oda
      ? {
          odaNo: oda.odaNo,
          tip: oda.tip,
          kapasite: oda.kapasite,
          katId: oda.kat ? oda.kat.id : '',
          sira: oda.sira,
          tur: oda.tur,
          ozellikler: oda.ozellikler.join(', '),
          notlar: oda.notlar,
          kullanim: oda.kullanim === 'bakimda' ? 'kullanimda' : oda.kullanim,
        }
      : {
          odaNo: '',
          tip: '',
          kapasite: 2,
          katId: varsayilanKat || '',
          sira: '',
          tur: 'oda',
          ozellikler: '',
          notlar: '',
          kullanim: 'kullanimda',
        },
  });
  const { errors, isSubmitting } = formState;

  const gonder = async (v) => {
    setGenelHata('');
    const veri = {
      odaNo: v.odaNo,
      tip: v.tip,
      kapasite: Number(v.kapasite),
      katId: Number(v.katId),
      tur: v.tur,
      ozellikler: v.ozellikler,
      notlar: v.notlar,
      kullanim: oda && oda.kullanim === 'bakimda' ? undefined : v.kullanim,
    };
    if (v.sira !== '' && v.sira !== undefined) veri.sira = Number(v.sira);
    try {
      const sonuc = oda ? await odaApi.duzenle(oda.id, veri) : await odaApi.ekle(veri);
      onTamam(sonuc);
    } catch (e) {
      const alanlar = hataAlanlari(e);
      Object.keys(alanlar).forEach((a) => setError(a, { type: 'server', message: alanlar[a] }));
      if (!Object.keys(alanlar).length) setGenelHata(hataMesaji(e));
    }
  };

  return (
    <Modal baslik={oda ? `Oda ${oda.odaNo}` : 'Yeni oda'} onKapat={onKapat}>
      <form onSubmit={handleSubmit(gonder)}>
        <div className="izgara">
          <Alan etiket="Oda no" hata={errors.odaNo && (errors.odaNo.message || 'Zorunlu alan')}>
            <input type="text" className="mono" {...register('odaNo', { required: true })} />
          </Alan>
          <Alan etiket="Kat" hata={errors.katId && (errors.katId.message || 'Seçin')}>
            <select {...register('katId', { required: true })}>
              <option value="">Seçin</option>
              {katlar.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.ad}
                </option>
              ))}
            </select>
          </Alan>
          <Alan etiket="Tür">
            <select {...register('tur')}>
              <option value="oda">Konuk odası</option>
              <option value="ortak">Ortak alan</option>
            </select>
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
          <Alan etiket="Kattaki sırası" not="Boş bırakılırsa sona eklenir">
            <input type="number" min={0} {...register('sira')} />
          </Alan>
          <Alan etiket="Özellikler" genis not="virgülle ayırın">
            <input type="text" {...register('ozellikler')} />
          </Alan>
          <Alan etiket="Not" genis>
            <input type="text" {...register('notlar')} />
          </Alan>
          {(!oda || oda.kullanim !== 'bakimda') && (
            <Alan etiket="Durum">
              <select {...register('kullanim')}>
                <option value="kullanimda">Kullanımda</option>
                <option value="kapali">Kapalı</option>
              </select>
            </Alan>
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
