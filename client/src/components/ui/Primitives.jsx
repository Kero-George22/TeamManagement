export function Spinner({ dark }) {
  return (
    <span
      className="spinner"
      style={dark ? { borderTopColor: 'var(--text-primary)' } : undefined}
    />
  );
}

export function EmptyState({ icon = 'fa-inbox', title, children }) {
  return (
    <div className="empty-state">
      <i className={`fa-solid ${icon}`} />
      {title && <h4>{title}</h4>}
      {children && <p>{children}</p>}
    </div>
  );
}

export function ProgressBar({ value = 0, style }) {
  return (
    <div className="progress" style={style}>
      <div className="progress__fill" style={{ width: `${value}%` }} />
    </div>
  );
}
