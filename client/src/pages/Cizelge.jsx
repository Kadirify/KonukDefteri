import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cizelge as cizelgeApi } from '../api';
import useYukle from '../hooks/useYukle';
import Sayfa, { Yukleniyor } from '../components/Sayfa';
import Uyari from '../components/Uyari';
import { bugunYerel, gunEkleYerel, konumYuzde, trGun, trTarih } from '../utils/tarih';

const GUN_ADLARI = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

function isaretler(veri) {
  if (veri.gorunum === 'hafta') {
    return Array.from({ length: 7 }, (_, i) => {
      const gun = gunEkleYerel(veri.gun, i).slice(0, 10);
      const d = new Date(gun + 'T00:00:00');
      return { yuzde: (i / 7) * 100, metin: `${GUN_ADLARI[d.getDay()]} ${trGun(gun).slice(0, 5)}` };
    });
  }
  return Array.from({ length: 9 }, (_, i) => ({
    yuzde: ((i * 3) / 24) * 100,
    metin: `${String(i * 3).padStart(2, '0')}:00`,
  }));
}

export default function Cizelge() {
  const [gun, setGun] = useState(bugunYerel());
  const [gorunum, setGorunum] = useState('gun');
  const navigate = useNavigate();
  const { veri, yukleniyor, hata } = useYukle(() => cizelgeApi.oku(gun, gorunum), [gun, gorunum]);

  const kaydir = (n) => setGun(gunEkleYerel(gun, gorunum === 'hafta' ? n * 7 : n).slice(0, 10));

  // TODO: blokları sürükleyip taşıma; şimdilik tıklayınca kayıt açılıyor
  const tikla = (b) => {
    if (b.konaklamaId) navigate(`/konaklamalar/${b.konaklamaId}`);
    else if (b.rezervasyonId) navigate('/rezervasyonlar');
  };

  return (
    <Sayfa baslik="Zaman çizelgesi">
      <div className="arac-cubugu">
        <button type="button" className="dugme" onClick={() => kaydir(-1)}>
          Önceki
        </button>
        <input type="date" value={gun} onChange={(e) => e.target.value && setGun(e.target.value)} />
        <button type="button" className="dugme" onClick={() => kaydir(1)}>
          Sonraki
        </button>
        <button type="button" className="dugme" onClick={() => setGun(bugunYerel())}>
          Bugün
        </button>
        <div className="sekmeler" style={{ marginBottom: 0, borderBottom: 0 }}>
          <button
            type="button"
            className={gorunum === 'gun' ? 'aktif' : ''}
            onClick={() => setGorunum('gun')}
          >
            Gün
          </button>
          <button
            type="button"
            className={gorunum === 'hafta' ? 'aktif' : ''}
            onClick={() => setGorunum('hafta')}
          >
            Hafta
          </button>
        </div>
      </div>
      {hata && <Uyari tur="hata">{hata}</Uyari>}
      {yukleniyor && !veri ? (
        <Yukleniyor />
      ) : (
        veri && (
          <div className="cizelge">
            <div className="cz-satir cz-baslik">
              <div
                className="cz-oda soluk"
                style={{ fontFamily: 'var(--yazi)', fontSize: '0.78rem' }}
              >
                {gorunum === 'hafta' ? `${trGun(veri.gun)} haftası` : trGun(veri.gun)}
              </div>
              <div className="cz-pist">
                {isaretler(veri).map((i) => (
                  <span className="cz-isaret" key={i.metin} style={{ left: `${i.yuzde}%` }}>
                    {i.metin}
                  </span>
                ))}
              </div>
            </div>
            {veri.katlar.map((kat) => (
              <div key={kat.id}>
                <div className="cz-kat">{kat.ad}</div>
                {kat.odalar
                  .filter((o) => o.tur === 'oda')
                  .map((oda) => {
                    const bloklar = veri.bloklar
                      .filter((b) => b.odaId === oda.id)
                      .map((b) => ({
                        ...b,
                        konum: konumYuzde(b.baslangic, b.bitis, veri.baslangic, veri.bitis),
                      }))
                      .filter((b) => b.konum);
                    const simdi = konumYuzde(veri.baslangic, veri.an, veri.baslangic, veri.bitis);
                    return (
                      <div className="cz-satir" key={oda.id}>
                        <div className="cz-oda">
                          {oda.odaNo}
                          <small>
                            {oda.kullanim === 'bakimda'
                              ? 'bakımda'
                              : oda.kullanim === 'kapali'
                              ? 'kapalı'
                              : oda.temizlik !== 'temiz'
                              ? oda.temizlik
                              : ''}
                          </small>
                        </div>
                        <div className="cz-pist">
                          {isaretler(veri).map((i) => (
                            <span className="cizgi" key={i.metin} style={{ left: `${i.yuzde}%` }} />
                          ))}
                          {simdi && simdi.genislik < 100 && (
                            <span
                              className="simdi"
                              style={{ left: `${simdi.genislik}%` }}
                              title={`şimdi - ${trTarih(veri.an)}`}
                            />
                          )}
                          {bloklar.map((b, i) => (
                            <button
                              type="button"
                              key={i}
                              className={`blok ${b.tur}${b.acik ? ' acik' : ''}`}
                              style={{
                                left: `${b.konum.sol}%`,
                                width: `${Math.max(b.konum.genislik, 0.6)}%`,
                              }}
                              title={`${b.etiket} - ${trTarih(b.baslangic)} - ${
                                b.acik ? 'devam ediyor' : trTarih(b.bitis)
                              }`}
                              onClick={() => tikla(b)}
                            >
                              {b.etiket}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}
            <div className="lejant" style={{ marginTop: 14 }}>
              <span>
                <i style={{ background: 'var(--renk-ana)' }} />
                konaklama
              </span>
              <span>
                <i style={{ background: 'var(--basari)' }} />
                günübirlik
              </span>
              <span>
                <i style={{ background: 'var(--renk-vurgu)' }} />
                temizlik
              </span>
              <span>
                <i style={{ background: 'var(--hata)' }} />
                bakım
              </span>
              <span>
                <i style={{ border: '2px dashed var(--renk-ana)', height: 2 }} />
                rezervasyon
              </span>
              <span>
                <i style={{ background: 'var(--hata)', width: 2 }} />
                şimdi
              </span>
            </div>
          </div>
        )
      )}
    </Sayfa>
  );
}
