import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { gunluk as gunlukApi, kullanicilar as kullaniciApi } from '../api';
import useYukle from '../hooks/useYukle';
import Sayfa, { BosDurum, Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import { trTarih } from '../utils/tarih';
import { islemMetni } from '../utils/metin';

// hedef "konaklama:12" biçiminde; bilinen türler kendi sayfasına bağlanır
const HEDEF_YOLU = {
  konaklama: (id) => `/konaklamalar/${id}`,
  konuk: (id) => `/konuklar/${id}`,
  hesap: (id) => `/hesaplar/${id}/fis`,
  kesinti: (id) => `/kbs/kesintiler/${id}`,
  bildirim: () => '/kbs',
  rezervasyon: () => '/rezervasyonlar',
  oda: () => '/odalar',
  kullanici: () => '/ayarlar/kullanicilar',
  kat: () => '/ayarlar/katlar',
};

function Hedef({ hedef }) {
  if (!hedef) return <span className="soluk">-</span>;
  const [tur, idler] = hedef.split(':');
  const yol = HEDEF_YOLU[tur];
  if (!yol || !idler) return <span className="mono">{hedef}</span>;
  // grup girişinde "konaklama:3,4,5" yazılıyor, ilkine git
  return (
    <Link to={yol(idler.split(',')[0])} className="mono">
      {hedef}
    </Link>
  );
}

function ayrintiMetni(s) {
  if (!s) return '';
  try {
    const o = JSON.parse(s);
    if (o && typeof o === 'object') {
      return Object.keys(o)
        .map((k) => `${k}: ${String(o[k]).slice(0, 40)}`)
        .join(', ');
    }
    return String(o);
  } catch (e) {
    return s;
  }
}

const BOS_SUZGEC = { q: '', islem: '', kullanici: '', baslangic: '', bitis: '' };

export default function Gunluk() {
  const [q, setQ] = useState('');
  const [suzgec, setSuzgec] = useState(BOS_SUZGEC);
  const [sayfa, setSayfa] = useState(1);
  const { veri, yukleniyor, hata } = useYukle(
    () => gunlukApi.liste({ ...suzgec, sayfa }),
    [suzgec, sayfa]
  );
  const kullanicilar = useYukle(() => kullaniciApi.liste(), []);

  // arama kutusunda her tuşta istek atmasın
  useEffect(() => {
    const z = setTimeout(() => {
      setSuzgec((s) => (s.q === q ? s : { ...s, q }));
      setSayfa(1);
    }, 300);
    return () => clearTimeout(z);
  }, [q]);

  const degistir = (ad) => (e) => {
    setSayfa(1);
    setSuzgec((s) => ({ ...s, [ad]: e.target.value }));
  };

  const toplamSayfa = veri ? Math.max(1, Math.ceil(veri.toplam / veri.sayfaBoyu)) : 1;

  return (
    <Sayfa baslik="İşlem günlüğü">
      <div className="arac-cubugu">
        <input
          type="search"
          placeholder="Hedef ya da ayrıntıda ara"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={suzgec.islem} onChange={degistir('islem')}>
          <option value="">Tüm işlemler</option>
          {(veri ? veri.islemler : []).map((k) => (
            <option key={k} value={k}>
              {islemMetni(k)}
            </option>
          ))}
        </select>
        <select value={suzgec.kullanici} onChange={degistir('kullanici')}>
          <option value="">Tüm kullanıcılar</option>
          {(kullanicilar.veri || []).map((k) => (
            <option key={k.id} value={k.id}>
              {k.adSoyad}
            </option>
          ))}
        </select>
        <input type="date" value={suzgec.baslangic} onChange={degistir('baslangic')} />
        <input type="date" value={suzgec.bitis} onChange={degistir('bitis')} />
        {(q || suzgec.islem || suzgec.kullanici || suzgec.baslangic || suzgec.bitis) && (
          <button
            type="button"
            className="dugme dugme-sade dugme-kucuk"
            onClick={() => {
              setQ('');
              setSuzgec(BOS_SUZGEC);
              setSayfa(1);
            }}
          >
            Temizle
          </button>
        )}
      </div>
      {hata && <Uyari tur="hata">{hata}</Uyari>}
      {yukleniyor && !veri ? (
        <Yukleniyor />
      ) : (
        veri && (
          <>
            <div className="tablo-sarici">
              <table className="tablo">
                <thead>
                  <tr>
                    <th>Zaman</th>
                    <th>Kullanıcı</th>
                    <th>İşlem</th>
                    <th>Hedef</th>
                    <th>Ayrıntı</th>
                  </tr>
                </thead>
                <tbody>
                  {veri.satirlar.map((i) => (
                    <tr key={i.id}>
                      <td className="sayi">{trTarih(i.zaman)}</td>
                      <td>{i.kullanici}</td>
                      <td>{islemMetni(i.islem)}</td>
                      <td>
                        <Hedef hedef={i.hedef} />
                      </td>
                      <td className="soluk" style={{ fontSize: '0.8rem' }}>
                        {ayrintiMetni(i.ayrinti)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {veri.satirlar.length === 0 && <BosDurum>Bu süzgeçle kayıt yok.</BosDurum>}
            </div>
            <div className="sayfalama">
              <button
                type="button"
                className="dugme dugme-kucuk"
                disabled={sayfa <= 1}
                onClick={() => setSayfa(sayfa - 1)}
              >
                Önceki
              </button>
              <span className="soluk">
                {veri.toplam} kayıt, sayfa {sayfa} / {toplamSayfa}
              </span>
              <button
                type="button"
                className="dugme dugme-kucuk"
                disabled={sayfa >= toplamSayfa}
                onClick={() => setSayfa(sayfa + 1)}
              >
                Sonraki
              </button>
            </div>
          </>
        )
      )}
    </Sayfa>
  );
}
