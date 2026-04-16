import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';

const NAV = [
  { label: 'Dashboard', to: '/app/dashboard' },
  { label: 'Projects',  to: '/app/projects'  },
  { label: 'Messages',  to: '/app/messages'  },
  { label: 'Profile',   to: '/app/profile'   },
];

export default function Topbar({ title, backTo = null, onBack = null }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDark, setIsDark] = useState(
    () => document.body.classList.contains('dark')
  );

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
        <button className="icon-btn" onClick={toggleDark} aria-label="Toggle dark mode">
          <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`} />
        </button>
        <button className="icon-btn" onClick={() => navigate('/app/messages')} aria-label="Messages">
          <i className="fa-regular fa-envelope" />
        </button>
        <button className="icon-btn" aria-label="Notifications">
          <i className="fa-regular fa-bell" />
        </button>
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
