import { BILDIRIM_DURUM } from '../utils/metin';

export default function Rozet({ tur = 'notr', children }) {
  return <span className={'rozet rozet-' + tur}>{children}</span>;
}

export function BildirimRozeti({ durum }) {
  const b = BILDIRIM_DURUM[durum] || { etiket: durum, tur: 'notr' };
  return <Rozet tur={b.tur}>{b.etiket}</Rozet>;
}
