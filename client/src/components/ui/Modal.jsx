import { useEffect, useCallback } from 'react';

export default function Modal({ id, open, onClose, title, children, maxWidth }) {
  const handleOverlay = useCallback((e) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && open) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div
      className={`modal-overlay ${open ? 'open' : ''}`}
      onClick={handleOverlay}
    >
      <div className="modal" style={maxWidth ? { maxWidth } : undefined}>
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button className="modal__close" onClick={onClose}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
