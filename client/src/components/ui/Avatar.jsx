import { useNavigate } from 'react-router-dom';

export default function Avatar({ user, size = 'md', className = '', onClick }) {
  const navigate = useNavigate();
  const sizeMap = { sm: 32, md: 44, lg: 72, xl: 96, xxl: 120 };
  const px = sizeMap[size] || 44;

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
      return;
    }
    const id = user?._id || user?.id;
    if (id) {
      e.stopPropagation();
      e.preventDefault();
      navigate(`/app/profile/${id}`);
    }
  };

  const cursorStyle = (onClick || user?._id || user?.id) ? 'pointer' : 'default';

  if (user?.avatar) {
    const isDataUrl = user.avatar.startsWith('data:');
    return (
      <img
        src={user.avatar}
        alt={user.username || 'User'}
        className={`avatar avatar--${size} ${className}`}
        loading={isDataUrl ? 'eager' : 'lazy'}
        decoding="async"
        onClick={handleClick}
        style={{ cursor: cursorStyle, ...(isDataUrl ? { imageRendering: 'auto' } : {}) }}
      />
    );
  }

  const initial = (user?.username || user?.email || '?')[0].toUpperCase();
  return (
    <div
      className={`avatar-placeholder avatar-placeholder--pixel avatar avatar--${size} ${className}`}
      onClick={handleClick}
      style={{ width: px, height: px, cursor: cursorStyle }}
    >
      {initial}
    </div>
  );
}
