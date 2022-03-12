import { useState } from 'react';
import { Link } from 'react-router-dom';
import { hesaplar as hesapApi } from '../api';
import { hataMesaji } from '../api/istemci';
import useYukle from '../hooks/useYukle';
import { useAuth } from '../hooks/useAuth';
import Rozet from './Rozet';
import { tl, sayiOku } from '../utils/para';
import { trTarih } from '../utils/tarih';
import { KALEM_TUR, YONTEM } from '../utils/metin';

export default function HesapKarti({ konaklamaId, baslikId }) {
  const { kullanici } = useAuth();
  const yonetici = kullanici.rol === 'yonetici';
  const { veri, setVeri, yukleniyor, hata } = useYukle(
    () => hesapApi.konaklama(konaklamaId),
    [konaklamaId]
  );
  const [kalem, setKalem] = useState({ tur: 'ekstra', aciklama: '', adet: '1', birimFiyat: '' });
  const [tahsilat, setTahsilat] = useState({ tutar: '', yontem: 'nakit', notlar: '' });
  const [duzelt, setDuzelt] = useState(null);
  const [islemHata, setIslemHata] = useState('');
  const [mesgul, setMesgul] = useState(false);

  const calistir = async (fn) => {
    setMesgul(true);
    setIslemHata('');
    try {
      setVeri(await fn());
      return true;
    } catch (e) {
      setIslemHata(hataMesaji(e));
      return false;
    } finally {
      setMesgul(false);
    }
  };

  if (yukleniyor && !veri) return <div className="kart">Hesap yükleniyor...</div>;
  if (hata) return <div className="kart form-hata">{hata}</div>;
  const h = veri;
  const acik = h.durum === 'acik';

  const kalemEkle = async () => {
    if (!kalem.aciklama.trim()) return setIslemHata('Kalem açıklaması yazın');
    const tamam = await calistir(() =>
      hesapApi.kalemEkle(h.id, {
        tur: kalem.tur,
        aciklama: kalem.aciklama.trim(),
        adet: sayiOku(kalem.adet) || 1,
        birimFiyat: sayiOku(kalem.birimFiyat),
      })
    );
    if (tamam) setKalem({ tur: 'ekstra', aciklama: '', adet: '1', birimFiyat: '' });
    return undefined;
  };

  const tahsilatEkle = async () => {
    const tutar = sayiOku(tahsilat.tutar);
    if (tutar <= 0) return setIslemHata('Tahsilat tutarı girin');
    const tamam = await calistir(() =>
      hesapApi.tahsilatEkle(h.id, { tutar, yontem: tahsilat.yontem, notlar: tahsilat.notlar })
    );
    if (tamam) setTahsilat({ tutar: '', yontem: 'nakit', notlar: '' });
    return undefined;
  };

  const duzeltKaydet = async () => {
    const tamam = await calistir(() =>
      hesapApi.kalemDuzelt(h.id, duzelt.id, {
        aciklama: duzelt.aciklama,
        adet: sayiOku(duzelt.adet) || 1,
        birimFiyat: sayiOku(duzelt.birimFiyat),
      })
    );
    if (tamam) setDuzelt(null);
  };

  return (
    <div className="kart" id={baslikId}>
      <div className="kart-baslik">
        <h2>
          Hesap <Rozet tur={acik ? 'bilgi' : 'notr'}>{acik ? 'Açık' : 'Kapalı'}</Rozet>
        </h2>
        <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Link to={`/hesaplar/${h.id}/fis`} className="dugme dugme-kucuk">
            Fiş
          </Link>
          {acik ? (
            <button
              type="button"
              className="dugme dugme-kucuk"
              disabled={mesgul}
              onClick={() => calistir(() => hesapApi.kapat(h.id))}
            >
              Hesabı kapat
            </button>
          ) : (
            yonetici && (
              <button
                type="button"
                className="dugme dugme-kucuk"
                disabled={mesgul}
                onClick={() => calistir(() => hesapApi.ac(h.id))}
              >
                Hesabı aç
              </button>
            )
          )}
        </span>
      </div>
      {h.konuklar.length > 1 && (
        <p className="soluk" style={{ marginTop: -4 }}>
          Grup hesabı: {h.konuklar.map((k) => k.adSoyad).join(', ')}
        </p>
      )}

      <div className="tablo-sarici" style={{ boxShadow: 'none' }}>
        <table className="tablo">
          <thead>
            <tr>
              <th>Kalem</th>
              <th className="sag">Adet</th>
              <th className="sag">Birim</th>
              <th className="sag">Tutar</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {h.kalemler.map((k) =>
              duzelt && duzelt.id === k.id ? (
                <tr key={k.id}>
                  <td>
                    <input
                      type="text"
                      value={duzelt.aciklama}
                      onChange={(e) => setDuzelt({ ...duzelt, aciklama: e.target.value })}
                      className="kucuk-girdi"
                    />
                  </td>
                  <td className="sag">
                    <input
                      type="text"
                      value={duzelt.adet}
                      onChange={(e) => setDuzelt({ ...duzelt, adet: e.target.value })}
                      className="kucuk-girdi sag"
                      style={{ width: 60 }}
                    />
                  </td>
                  <td className="sag">
                    <input
                      type="text"
                      value={duzelt.birimFiyat}
                      onChange={(e) => setDuzelt({ ...duzelt, birimFiyat: e.target.value })}
                      className="kucuk-girdi sag"
                      style={{ width: 90 }}
                    />
                  </td>
                  <td className="sag sayi">
                    {tl(
                      sayiOku(duzelt.adet) *
                        sayiOku(duzelt.birimFiyat) *
                        (k.tur === 'indirim' ? -1 : 1)
                    )}
                  </td>
                  <td className="eylem">
                    <button
                      type="button"
                      className="dugme dugme-kucuk dugme-birincil"
                      onClick={duzeltKaydet}
                      disabled={mesgul}
                    >
                      Kaydet
                    </button>
                    <button
                      type="button"
                      className="dugme dugme-kucuk"
                      onClick={() => setDuzelt(null)}
                    >
                      Vazgeç
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={k.id}>
                  <td>
                    {k.aciklama}
                    <span className="soluk" style={{ fontSize: '0.78rem' }}>
                      {' '}
                      {KALEM_TUR[k.tur]}
                      {k.tur === 'konaklama' && k.otomatik
                        ? ', gece sayısı çıkışta kesinleşir'
                        : ''}
                    </span>
                  </td>
                  <td className="sag sayi">{k.adet}</td>
                  <td className="sag sayi">{tl(k.birimFiyat)}</td>
                  <td className="sag sayi">{tl(k.tutar)}</td>
                  <td className="eylem">
                    {acik && (
                      <>
                        <button
                          type="button"
                          className="dugme dugme-sade dugme-kucuk"
                          onClick={() =>
                            setDuzelt({
                              id: k.id,
                              aciklama: k.aciklama,
                              adet: String(k.adet),
                              birimFiyat: String(Math.abs(k.birimFiyat)),
                            })
                          }
                        >
                          Düzelt
                        </button>
                        {k.tur !== 'konaklama' && (
                          <button
                            type="button"
                            className="dugme dugme-sade dugme-kucuk"
                            disabled={mesgul}
                            onClick={() => calistir(() => hesapApi.kalemSil(h.id, k.id))}
                          >
                            Sil
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              )
            )}
            {acik && (
              <tr>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select
                      value={kalem.tur}
                      onChange={(e) => setKalem({ ...kalem, tur: e.target.value })}
                      className="kucuk-girdi"
                      style={{ width: 90 }}
                    >
                      <option value="ekstra">Ekstra</option>
                      <option value="indirim">İndirim</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Kahvaltı"
                      value={kalem.aciklama}
                      onChange={(e) => setKalem({ ...kalem, aciklama: e.target.value })}
                      className="kucuk-girdi"
                      style={{ flex: 1 }}
                    />
                  </div>
                </td>
                <td className="sag">
                  <input
                    type="text"
                    value={kalem.adet}
                    onChange={(e) => setKalem({ ...kalem, adet: e.target.value })}
                    className="kucuk-girdi sag"
                    style={{ width: 60 }}
                  />
                </td>
                <td className="sag">
                  <input
                    type="text"
                    placeholder="0,00"
                    value={kalem.birimFiyat}
                    onChange={(e) => setKalem({ ...kalem, birimFiyat: e.target.value })}
                    className="kucuk-girdi sag"
                    style={{ width: 90 }}
                  />
                </td>
                <td className="sag sayi soluk">
                  {tl(
                    sayiOku(kalem.adet) *
                      sayiOku(kalem.birimFiyat) *
                      (kalem.tur === 'indirim' ? -1 : 1)
                  )}
                </td>
                <td className="eylem">
                  <button
                    type="button"
                    className="dugme dugme-kucuk"
                    onClick={kalemEkle}
                    disabled={mesgul}
                  >
                    Ekle
                  </button>
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="sag">
                <b>Toplam</b>
              </td>
              <td className="sag sayi">
                <b>{tl(h.toplam)}</b>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <h3 style={{ marginTop: 18 }}>Tahsilatlar</h3>
      <div className="tablo-sarici" style={{ boxShadow: 'none', marginTop: 8 }}>
        <table className="tablo">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Yöntem</th>
              <th>Alan</th>
              <th>Not</th>
              <th className="sag">Tutar</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {h.tahsilatlar.map((t) => (
              <tr key={t.id}>
                <td className="sayi">{trTarih(t.tarih)}</td>
                <td>{YONTEM[t.yontem] || t.yontem}</td>
                <td>{t.alan}</td>
                <td className="soluk">{t.notlar}</td>
                <td className="sag sayi">{tl(t.tutar)}</td>
                <td className="eylem">
                  {acik && yonetici && (
                    <button
                      type="button"
                      className="dugme dugme-sade dugme-kucuk"
                      disabled={mesgul}
                      onClick={() => calistir(() => hesapApi.tahsilatSil(h.id, t.id))}
                    >
                      Sil
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {h.tahsilatlar.length === 0 && (
              <tr>
                <td colSpan={6} className="soluk">
                  Tahsilat yok.
                </td>
              </tr>
            )}
            {acik && (
              <tr>
                <td colSpan={2}>
                  <select
                    value={tahsilat.yontem}
                    onChange={(e) => setTahsilat({ ...tahsilat, yontem: e.target.value })}
                    className="kucuk-girdi"
                  >
                    {Object.keys(YONTEM).map((y) => (
                      <option key={y} value={y}>
                        {YONTEM[y]}
                      </option>
                    ))}
                  </select>
                </td>
                <td colSpan={2}>
                  <input
                    type="text"
                    placeholder="Not"
                    value={tahsilat.notlar}
                    onChange={(e) => setTahsilat({ ...tahsilat, notlar: e.target.value })}
                    className="kucuk-girdi"
                    style={{ width: '100%' }}
                  />
                </td>
                <td className="sag">
                  <input
                    type="text"
                    placeholder={h.bakiye > 0 ? String(h.bakiye) : '0,00'}
                    value={tahsilat.tutar}
                    onChange={(e) => setTahsilat({ ...tahsilat, tutar: e.target.value })}
                    onFocus={() => {
                      if (!tahsilat.tutar && h.bakiye > 0)
                        setTahsilat({ ...tahsilat, tutar: String(h.bakiye) });
                    }}
                    className="kucuk-girdi sag"
                    style={{ width: 100 }}
                  />
                </td>
                <td className="eylem">
                  <button
                    type="button"
                    className="dugme dugme-kucuk dugme-birincil"
                    onClick={tahsilatEkle}
                    disabled={mesgul}
                  >
                    Tahsil et
                  </button>
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="sag">
                Tahsil edilen <b>{tl(h.tahsilat)}</b>
              </td>
              <td
                className="sag sayi"
                style={{
                  color:
                    h.bakiye > 0 ? 'var(--hata)' : h.bakiye < 0 ? 'var(--uyari)' : 'var(--basari)',
                }}
              >
                <b>{h.bakiye < 0 ? 'İade ' + tl(-h.bakiye) : 'Bakiye ' + tl(h.bakiye)}</b>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      {islemHata && <div className="form-hata">{islemHata}</div>}
    </div>
  );
}
