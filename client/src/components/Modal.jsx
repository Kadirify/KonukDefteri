import { useEffect } from 'react';

export default function Modal({ baslik, onKapat, genis, children }) {
  useEffect(() => {
    const dinle = (e) => {
      if (e.key === 'Escape') onKapat();
    };
    document.addEventListener('keydown', dinle);
    return () => document.removeEventListener('keydown', dinle);
  }, [onKapat]);

  return (
    <div
      className="modal-arka"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onKapat();
      }}
    >
      <div
        className={'modal' + (genis ? ' genis' : '')}
        role="dialog"
        aria-modal="true"
        aria-label={baslik}
      >
        <div className="modal-baslik">
          <h2>{baslik}</h2>
          <button type="button" onClick={onKapat} aria-label="Kapat">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
