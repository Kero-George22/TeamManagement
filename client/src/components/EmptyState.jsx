import React from 'react';

export default function EmptyState({ icon = '📭', text, sub, action }) {
  return (
    <div className="empty-state">
      <div className="es-icon">{icon}</div>
      {text && <div className="es-text">{text}</div>}
      {sub  && <div className="es-sub">{sub}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
