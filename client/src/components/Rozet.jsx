
export default function Rozet({ tur = 'notr', children }) {
  return <span className={'rozet rozet-' + tur}>{children}</span>;
}
