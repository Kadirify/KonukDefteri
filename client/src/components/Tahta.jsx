import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cizelge as cizelgeApi } from '../api';
import useYukle from '../hooks/useYukle';
import { Yukleniyor } from './Sayfa';
import Uyari from './Uyari';
import { buAy, bugunYerel, konumYuzde, trTarih } from '../utils/tarih';

const GUN_KISA = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

function ayBilgisi(ay) {
  const [y, m] = ay.split('-').map(Number);
  const gunSayisi = new Date(y, m, 0).getDate();
  const gunler = [];
  for (let g = 1; g <= gunSayisi; g++) {
    const d = new Date(y, m - 1, g);
    gunler.push({
      no: g,
      tarih: `${ay}-${String(g).padStart(2, '0')}`,
      haftaSonu: d.getDay() === 0 || d.getDay() === 6,
      harf: GUN_KISA[d.getDay()],
    });
  }
  return { y, m, gunSayisi, gunler };
}

function ayKaydir(ay, n) {
  const [y, m] = ay.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const AY_ADLARI = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

export default function Tahta({ onBosGun, onRezervasyon, yenileSayaci }) {
  const [ay, setAy] = useState(buAy());
  const navigate = useNavigate();
  const { veri, yukleniyor, hata } = useYukle(
    () => cizelgeApi.oku(`${ay}-01`, 'ay'),
    [ay, yenileSayaci]
  );
  const bilgi = ayBilgisi(ay);
  const bugun = bugunYerel();
  const sutunlar = `repeat(${bilgi.gunSayisi}, minmax(26px, 1fr))`;

  const tikla = (b) => {
    if (b.konaklamaId) navigate(`/konaklamalar/${b.konaklamaId}`);
    else if (b.rezervasyonId && onRezervasyon) onRezervasyon(b.rezervasyonId);
  };

  return (
    <div className="tahta">
      <div className="arac-cubugu">
        <button type="button" className="dugme" onClick={() => setAy(ayKaydir(ay, -1))}>
          Önceki ay
        </button>
        <b style={{ minWidth: 120, textAlign: 'center' }}>
          {AY_ADLARI[bilgi.m - 1]} {bilgi.y}
        </b>
        <button type="button" className="dugme" onClick={() => setAy(ayKaydir(ay, 1))}>
          Sonraki ay
        </button>
        <button type="button" className="dugme" onClick={() => setAy(buAy())}>
          Bu ay
        </button>
      </div>
      {hata && <Uyari tur="hata">{hata}</Uyari>}
      {yukleniyor && !veri ? (
        <Yukleniyor />
      ) : (
        veri && (
          <div className="tahta-kaydir">
            <div className="tahta-satir tahta-baslik">
              <div className="tahta-oda" />
              <div className="tahta-pist" style={{ gridTemplateColumns: sutunlar }}>
                {bilgi.gunler.map((g) => (
                  <div
                    key={g.no}
                    className={
                      'tahta-gun' +
                      (g.haftaSonu ? ' hafta-sonu' : '') +
                      (g.tarih === bugun ? ' bugun' : '')
                    }
                  >
                    <b>{g.no}</b>
                    <small>{g.harf}</small>
                  </div>
                ))}
              </div>
            </div>
            {veri.katlar.map((kat) => (
              <div key={kat.id}>
                <div className="tahta-kat">{kat.ad}</div>
                {kat.odalar
                  .filter((o) => o.tur === 'oda')
                  .map((oda) => {
                    const bloklar = veri.bloklar
                      .filter((b) => b.odaId === oda.id && b.tur !== 'temizlik')
                      .map((b) => ({
                        ...b,
                        konum: konumYuzde(b.baslangic, b.bitis, veri.baslangic, veri.bitis),
                      }))
                      .filter((b) => b.konum);
                    return (
                      <div className="tahta-satir" key={oda.id}>
                        <div className="tahta-oda">
                          {oda.odaNo}
                          <small>
                            {oda.kullanim === 'bakimda'
                              ? 'bakımda'
                              : oda.kullanim === 'kapali'
                              ? 'kapalı'
                              : ''}
                          </small>
                        </div>
                        <div className="tahta-pist" style={{ gridTemplateColumns: sutunlar }}>
                          {bilgi.gunler.map((g) => (
                            <button
                              type="button"
                              key={g.no}
                              className={
                                'tahta-gun' +
                                (g.haftaSonu ? ' hafta-sonu' : '') +
                                (g.tarih === bugun ? ' bugun' : '')
                              }
                              title={`${oda.odaNo} - ${trTarih(g.tarih)} - rezervasyon`}
                              onClick={() => onBosGun && onBosGun(oda.id, g.tarih)}
                              disabled={oda.kullanim === 'kapali'}
                            />
                          ))}
                          <div className="tahta-bloklar">
                            {bloklar.map((b, i) => (
                              <button
                                type="button"
                                key={i}
                                className={`blok ${b.tur}${b.acik ? ' acik' : ''}`}
                                style={{
                                  left: `${b.konum.sol}%`,
                                  width: `${Math.max(b.konum.genislik, 1)}%`,
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
                      </div>
                    );
                  })}
              </div>
            ))}
            <div className="lejant" style={{ marginTop: 12 }}>
              <span>
                <i style={{ background: 'var(--renk-ana)' }} />
                konaklama
              </span>
              <span>
                <i style={{ background: 'var(--basari)' }} />
                günübirlik
              </span>
              <span>
                <i style={{ border: '2px dashed var(--renk-ana)', height: 2 }} />
                rezervasyon
              </span>
              <span>
                <i style={{ background: 'var(--hata)' }} />
                bakım
              </span>
            </div>
          </div>
        )
      )}
    </div>
  );
}
