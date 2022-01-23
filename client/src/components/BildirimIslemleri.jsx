import { useEffect, useState } from 'react';
import { kbs } from '../api';
import { hataMesaji } from '../api/istemci';
import Modal from './Modal';
import { BILDIRIM_TUR } from '../utils/metin';
import { trTarih } from '../utils/tarih';

// KBS'ye gidecek alanları gösterir; manuel modda portala kopyalamak için.
export function AlanlarModal({ bildirimId, onKapat }) {
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState('');
  const [kopyalanan, setKopyalanan] = useState('');

  useEffect(() => {
    let iptal = false;
    kbs
      .alanlar(bildirimId)
      .then((v) => !iptal && setVeri(v))
      .catch((e) => !iptal && setHata(hataMesaji(e)));
    return () => {
      iptal = true;
    };
  }, [bildirimId]);

  const kopyala = (ad, deger) => {
    const yaz = () => setKopyalanan(ad);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(deger).then(yaz, yaz);
    } else {
      yaz();
    }
  };

  const satir = (ad, deger) =>
    deger ? (
      <div className="satir" key={ad}>
        <span>{ad}</span>
        <code>{deger}</code>
        <button type="button" className="dugme dugme-kucuk" onClick={() => kopyala(ad, deger)}>
          {kopyalanan === ad ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>
    ) : null;

  return (
    <Modal baslik="KBS'ye girilecek alanlar" onKapat={onKapat}>
      {hata && <div className="form-hata">{hata}</div>}
      {!veri && !hata && <p className="soluk">Yükleniyor...</p>}
      {veri && (
        <>
          <p className="soluk">
            {BILDIRIM_TUR[veri.tur]} bildirimi - Oda {veri.odaNo} - Tesis kodu{' '}
            {veri.tesisKodu || '-'}
          </p>
          <div className="alan-listesi">
            {satir('İşlem', BILDIRIM_TUR[veri.tur])}
            {satir('Oda no', veri.odaNo)}
            {satir(
              veri.tur === 'cikis' ? 'Çıkış zamanı' : 'Giriş zamanı',
              trTarih(veri.tur === 'cikis' ? veri.cikisZamani : veri.girisZamani)
            )}
            {veri.konuk.kimlikTuru === 'tc'
              ? satir('TC kimlik no', veri.konuk.tc)
              : [satir('Pasaport no', veri.konuk.pasaportNo), satir('Uyruk', veri.konuk.uyruk)]}
            {satir('Ad', veri.konuk.ad)}
            {satir('Soyad', veri.konuk.soyad)}
            {satir('Baba adı', veri.konuk.babaAdi)}
            {satir('Anne adı', veri.konuk.anneAdi)}
            {satir('Doğum tarihi', trTarih(veri.konuk.dogumTarihi))}
            {satir('Doğum yeri', veri.konuk.dogumYeri)}
            {satir(
              'Cinsiyet',
              veri.konuk.cinsiyet === 'K' ? 'Kadın' : veri.konuk.cinsiyet === 'E' ? 'Erkek' : ''
            )}
            {satir('Plaka', veri.plaka)}
          </div>
          <p className="soluk" style={{ marginTop: 12, fontSize: '0.82rem' }}>
            Günlüğe yazıldı.
          </p>
        </>
      )}
    </Modal>
  );
}

// Bir bildirim satırının düğmeleri: gönder / alanlar / bildirildi
export default function BildirimIslemleri({ bildirim, kbsMod, onGuncelle }) {
  const [alanlarAcik, setAlanlarAcik] = useState(false);
  const [referansAcik, setReferansAcik] = useState(false);
  const [referans, setReferans] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState('');

  const gonderildi = bildirim.durum === 'gonderildi';

  const gonder = async () => {
    setMesgul(true);
    setHata('');
    try {
      onGuncelle(await kbs.gonder(bildirim.id));
    } catch (e) {
      setHata(hataMesaji(e));
    } finally {
      setMesgul(false);
    }
  };

  const tamamla = async () => {
    setMesgul(true);
    setHata('');
    try {
      onGuncelle(await kbs.manuelTamam(bildirim.id, referans));
      setReferansAcik(false);
    } catch (e) {
      setHata(hataMesaji(e));
    } finally {
      setMesgul(false);
    }
  };

  return (
    <>
      {!gonderildi && kbsMod === 'jandarma' && (
        <button
          type="button"
          className="dugme dugme-kucuk dugme-birincil"
          onClick={gonder}
          disabled={mesgul}
        >
          {mesgul ? 'Gönderiliyor...' : 'Şimdi gönder'}
        </button>
      )}
      <button type="button" className="dugme dugme-kucuk" onClick={() => setAlanlarAcik(true)}>
        Alanlar
      </button>
      {!gonderildi && (
        <button type="button" className="dugme dugme-kucuk" onClick={() => setReferansAcik(true)}>
          Bildirildi
        </button>
      )}
      {hata && (
        <div className="form-hata" style={{ fontSize: '0.8rem' }}>
          {hata}
        </div>
      )}
      {alanlarAcik && (
        <AlanlarModal bildirimId={bildirim.id} onKapat={() => setAlanlarAcik(false)} />
      )}
      {referansAcik && (
        <Modal baslik="Portala girildi olarak işaretle" onKapat={() => setReferansAcik(false)}>
          <label className="alan">
            <span>Referans / işlem no (isteğe bağlı)</span>
            <input
              type="text"
              className="mono"
              value={referans}
              onChange={(e) => setReferans(e.target.value)}
              autoFocus
            />
          </label>
          <div className="form-alt">
            <button type="button" className="dugme" onClick={() => setReferansAcik(false)}>
              Vazgeç
            </button>
            <button
              type="button"
              className="dugme dugme-birincil"
              onClick={tamamla}
              disabled={mesgul}
            >
              Bildirildi olarak kaydet
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
