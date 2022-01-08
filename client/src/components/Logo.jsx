// zemin="yok": kenar çubuğunda koyu zemine, "kutu": beyaz zeminde
export function LogoIsaret({ boyut = 24, zemin = 'kutu', className }) {
  const sayfa = zemin === 'kutu' ? '#f3f4f7' : '#ffffff';
  const sirt = zemin === 'kutu' ? '#c3cad6' : '#aebbd0';
  const satir = '#1f3b63';
  return (
    <svg
      width={boyut}
      height={boyut}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {zemin === 'kutu' && <rect width="32" height="32" rx="7" fill="#1f3b63" />}
      <rect x="7" y="5" width="18" height="22" rx="2.5" fill={sayfa} />
      <rect x="7" y="5" width="3.2" height="22" rx="1.6" fill={sirt} />
      <rect x="13" y="11.5" width="8.5" height="1.9" rx="0.95" fill={satir} />
      <rect x="13" y="16" width="8.5" height="1.9" rx="0.95" fill={satir} />
      <rect x="13" y="20.5" width="5.5" height="1.9" rx="0.95" fill={satir} />
      <path d="M19.5 5h4.5v9.2l-2.25-1.9-2.25 1.9z" fill="#d99a2b" />
    </svg>
  );
}

export default function Logo({ boyut = 22, zemin = 'kutu', className }) {
  return (
    <span className={'logo' + (className ? ' ' + className : '')}>
      <LogoIsaret boyut={boyut} zemin={zemin} />
      <span className="logo-ad">
        Konuk<b>Defteri</b>
      </span>
    </span>
  );
}
