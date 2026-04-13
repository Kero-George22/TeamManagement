export default function Badge({ variant = 'gray', children }) {
  return <span className={`badge badge--${variant}`}>{children}</span>;
}
