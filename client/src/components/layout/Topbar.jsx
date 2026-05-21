import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import NotificationBell from '../NotificationBell';
import API from '../../lib/api';

const NAV = [
  { label: 'Dashboard', to: '/app/dashboard' },
  { label: 'My Tasks',  to: '/app/tasks'     },
  { label: 'Explore',   to: '/app/explore'   },
  { label: 'Projects',  to: '/app/projects'  },
  { label: 'Messages',  to: '/app/messages'  },
  { label: 'Profile',   to: '/app/profile'   },
];

export default function Topbar({ title, backTo = null, onBack = null, action = null }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDark, setIsDark] = useState(
    () => document.body.classList.contains('dark')
  );
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const pollRef = useRef(null);

  useEffect(() => {
    async function fetchUnread() {
      try {
        const count = await API.dms.unreadCount();
        setUnreadMsgs(count);
      } catch { /* silent */ }
    }
    fetchUnread();
    pollRef.current = setInterval(fetchUnread, 30000);
    return () => clearInterval(pollRef.current);
  }, []);

  const toggleDark = () => {
    if (isDark) {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          className="icon-btn"
          onClick={() => {
            if (onBack) return onBack();
            if (backTo) return navigate(backTo);
            return navigate(-1);
          }}
          aria-label="Back"
        >
          <i className="fa-solid fa-arrow-left" />
        </button>
        <h1 className="topbar__title">{title}</h1>
        {action}
      </div>

      <nav className="topbar__nav" aria-label="Page navigation">
        {NAV.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) => `topbar__nav-link ${isActive ? 'active' : ''}`}
          >
            {l.label}
          </NavLink>
        ))}
      </nav>

      <div className="topbar__actions">
        {user?.isAdmin && (
          <button className="icon-btn" onClick={() => navigate('/app/admin/analytics')} aria-label="Admin" title="Admin">
            <i className="fa-solid fa-shield-halved" />
          </button>
        )}
        <button className="icon-btn" onClick={toggleDark} aria-label="Toggle dark mode">
          <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`} />
        </button>
        <button className="icon-btn" onClick={() => { navigate('/app/messages'); setUnreadMsgs(0); }} aria-label="Messages" style={{ position: 'relative' }}>
          <i className="fa-regular fa-envelope" />
          {unreadMsgs > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: 4,
              background: '#ef4444', color: '#fff',
              borderRadius: '50%', width: 16, height: 16,
              fontSize: '.65rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1, border: '2px solid var(--bg)',
            }}>
              {unreadMsgs > 9 ? '9+' : unreadMsgs}
            </span>
          )}
        </button>
        <NotificationBell />
        {user?.avatar
          ? <img src={user.avatar} alt="Profile" className="topbar__user-avatar" onClick={() => navigate('/app/profile')} />
          : <div
              className="topbar__user-avatar"
              style={{
                background: 'var(--green-bg)', color: '#16a34a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '.9rem', cursor: 'pointer',
              }}
              onClick={() => navigate('/app/profile')}
            >
              {(user?.username || user?.email || '?')[0].toUpperCase()}
            </div>
        }
      </div>
    </header>
  );
}
