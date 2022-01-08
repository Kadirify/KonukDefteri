export default function Sayfa({ baslik, aciklama, eylemler, children }) {
  return (
    <>
      <div className="sayfa-baslik">
        <div>
          <h1>{baslik}</h1>
          {aciklama && <p>{aciklama}</p>}
        </div>
        {eylemler && <div className="eylemler">{eylemler}</div>}
      </div>
      {children}
    </>
  );
}

export function Yukleniyor({ metin = 'Yükleniyor...' }) {
  return <div className="yukleniyor">{metin}</div>;
}

export function BosDurum({ children }) {
  return <div className="bos-durum">{children}</div>;
}
