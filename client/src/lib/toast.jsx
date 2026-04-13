import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICONS = {
  success: 'fa-check-circle',
  error:   'fa-exclamation-circle',
  info:    'fa-info-circle',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const show = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const toast = {
    success: (msg) => show(msg, 'success'),
    error:   (msg) => show(msg, 'error'),
    info:    (msg) => show(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div id="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast--${t.type}`}>
              <i className={`fa-solid ${ICONS[t.type]}`} />
              <span>{t.message}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}
