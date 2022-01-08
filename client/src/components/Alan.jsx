export default function Alan({ etiket, hata, not, genis, children }) {
  return (
    <label className={'alan' + (hata ? ' hatali' : '') + (genis ? ' genis' : '')}>
      {etiket && <span>{etiket}</span>}
      {children}
      {hata ? (
        <small className="alan-hata">{hata}</small>
      ) : not ? (
        <small className="alan-not">{not}</small>
      ) : null}
    </label>
  );
}
