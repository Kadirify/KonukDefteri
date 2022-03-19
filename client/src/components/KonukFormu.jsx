import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Alan from './Alan';
import useUyruklar from '../hooks/useUyruklar';
import { tcknGecerli } from '../utils/tckn';
import { hataAlanlari, hataMesaji } from '../api/istemci';

export const bosKonuk = {
  kimlikTuru: 'tc',
  tc: '',
  pasaportNo: '',
  uyruk: 'TUR',
  ad: '',
  soyad: '',
  babaAdi: '',
  anneAdi: '',
  dogumTarihi: '',
  dogumYeri: '',
  cinsiyet: '',
  telefon: '',
  kvkkOnay: false,
  notlar: '',
};

// sunucu alan hatası dönerse forma yazılır
export default function KonukFormu({
  varsayilan,
  duzenleme,
  onKaydet,
  onIptal,
  kaydetMetni = 'Kaydet',
}) {
  const uyruklar = useUyruklar();
  const [genelHata, setGenelHata] = useState('');
  const { register, handleSubmit, watch, setError, formState } = useForm({
    defaultValues: { ...bosKonuk, ...(varsayilan || {}) },
  });
  const kimlikTuru = watch('kimlikTuru');
  const karaListe = watch('karaListe');
  const { errors, isSubmitting } = formState;

  const gonder = async (v) => {
    setGenelHata('');
    const veri = { ...v, uyruk: v.kimlikTuru === 'tc' ? 'TUR' : v.uyruk };
    try {
      await onKaydet(veri);
    } catch (e) {
      const alanlar = hataAlanlari(e);
      const adlar = Object.keys(alanlar);
      adlar.forEach((a) => setError(a, { type: 'server', message: alanlar[a] }));
      if (!adlar.length || alanlar.konukId) setGenelHata(hataMesaji(e));
    }
  };

  return (
    <form onSubmit={handleSubmit(gonder)}>
      <div className="izgara">
        <div className="alan genis">
          <span>Kimlik türü</span>
          <div className="secenekler">
            <label>
              <input type="radio" value="tc" {...register('kimlikTuru')} /> TC vatandaşı
            </label>
            <label>
              <input type="radio" value="pasaport" {...register('kimlikTuru')} /> Yabancı (pasaport)
            </label>
          </div>
        </div>

        {kimlikTuru === 'tc' ? (
          <Alan
            etiket="TC kimlik no"
            hata={errors.tc && (errors.tc.message || 'Geçersiz TC kimlik numarası')}
            not={duzenleme ? 'Boş bırakılırsa kayıtlı numara korunur' : ''}
          >
            <input
              type="text"
              inputMode="numeric"
              maxLength={11}
              className="mono"
              placeholder={duzenleme ? '' : '11 hane'}
              {...register('tc', {
                validate: (v) =>
                  !v && duzenleme ? true : tcknGecerli(v) || 'Geçersiz TC kimlik numarası',
              })}
            />
          </Alan>
        ) : (
          <>
            <Alan
              etiket="Pasaport no"
              hata={errors.pasaportNo && (errors.pasaportNo.message || 'Zorunlu alan')}
            >
              <input type="text" className="mono" {...register('pasaportNo', { required: true })} />
            </Alan>
            <Alan etiket="Uyruk" hata={errors.uyruk && 'Seçin'}>
              <select {...register('uyruk', { required: true })}>
                {uyruklar
                  .filter((u) => u.kod !== 'TUR')
                  .map((u) => (
                    <option key={u.kod} value={u.kod}>
                      {u.ad}
                    </option>
                  ))}
              </select>
            </Alan>
          </>
        )}

        <Alan etiket="Ad" hata={errors.ad && (errors.ad.message || 'Zorunlu alan')}>
          <input type="text" {...register('ad', { required: true })} />
        </Alan>
        <Alan etiket="Soyad" hata={errors.soyad && (errors.soyad.message || 'Zorunlu alan')}>
          <input type="text" {...register('soyad', { required: true })} />
        </Alan>
        <Alan etiket="Baba adı" hata={errors.babaAdi && errors.babaAdi.message}>
          <input type="text" {...register('babaAdi')} />
        </Alan>
        <Alan etiket="Anne adı" hata={errors.anneAdi && errors.anneAdi.message}>
          <input type="text" {...register('anneAdi')} />
        </Alan>
        <Alan etiket="Doğum tarihi" hata={errors.dogumTarihi && errors.dogumTarihi.message}>
          <input type="date" {...register('dogumTarihi')} />
        </Alan>
        <Alan etiket="Doğum yeri" hata={errors.dogumYeri && errors.dogumYeri.message}>
          <input type="text" {...register('dogumYeri')} />
        </Alan>
        <Alan etiket="Cinsiyet">
          <select {...register('cinsiyet')}>
            <option value="">Belirtilmedi</option>
            <option value="K">Kadın</option>
            <option value="E">Erkek</option>
          </select>
        </Alan>
        <Alan etiket="Telefon" hata={errors.telefon && errors.telefon.message}>
          <input type="tel" {...register('telefon')} />
        </Alan>
        <Alan etiket="Not" genis hata={errors.notlar && errors.notlar.message}>
          <input type="text" {...register('notlar')} />
        </Alan>
        <div className="alan genis">
          <label className="secenekler">
            <input type="checkbox" {...register('kvkkOnay')} />
            <span>
              KVKK aydınlatma metni okundu, kimlik bilgilerinin 1774 sayılı Kanun gereği
              bildirileceği anlatıldı
            </span>
          </label>
        </div>
        {duzenleme && (
          <>
            <div className="alan genis">
              <label className="secenekler">
                <input type="checkbox" {...register('karaListe')} />
                <span>Kara listede</span>
              </label>
            </div>
            {karaListe && (
              <Alan
                etiket="Neden"
                genis
                hata={errors.karaListeNeden && errors.karaListeNeden.message}
              >
                <input type="text" maxLength={200} {...register('karaListeNeden')} />
              </Alan>
            )}
          </>
        )}
      </div>
      {genelHata && <div className="form-hata">{genelHata}</div>}
      <div className="form-alt">
        {onIptal && (
          <button type="button" className="dugme" onClick={onIptal}>
            Vazgeç
          </button>
        )}
        <button type="submit" className="dugme dugme-birincil" disabled={isSubmitting}>
          {isSubmitting ? 'Kaydediliyor...' : kaydetMetni}
        </button>
      </div>
    </form>
  );
}
