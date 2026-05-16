export default function Avatar({ user, size = 'md', className = '' }) {
  const sizeMap = { sm: 32, md: 44, lg: 72, xl: 96 };
  const px = sizeMap[size] || 44;

  if (user?.avatar) {
    const isDataUrl = user.avatar.startsWith('data:');
    return (
      <img
        src={user.avatar}
        alt={user.username || 'User'}
        className={`avatar avatar--${size} ${className}`}
        loading={isDataUrl ? 'eager' : 'lazy'}
        decoding="async"
        style={isDataUrl ? { imageRendering: 'auto' } : undefined}
      />
    );
  }

  const initial = (user?.username || user?.email || '?')[0].toUpperCase();
  return (
    <div
      className={`avatar-placeholder avatar-placeholder--pixel avatar avatar--${size} ${className}`}
      style={{ width: px, height: px }}
    >
      {initial}
    </div>
  );
}
