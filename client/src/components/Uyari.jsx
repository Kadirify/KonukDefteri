export default function Uyari({ tur = 'bilgi', children, eylem }) {
  if (!children) return null;
  return (
    <div className={'uyari uyari-' + tur}>
      <div>{children}</div>
      {eylem}
    </div>
  );
}
