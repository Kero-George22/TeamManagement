import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_LINKS = [
  { to: '/dashboard',   label: 'Dashboard' },
  { to: '/projects',    label: 'Projects'  },
  { to: '/tasks',       label: 'Tasks'     },
  { to: '/leaderboard', label: 'Ranks'     },
  { to: '/assessment',  label: 'Assess'    },
  { to: '/portfolio',   label: 'Portfolio' },
  { to: '/office',      label: 'Office'    },
];

export default function Nav() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  if (!user) return null;

  return (
    <>
      <nav className="topnav">
        {/* Logo */}
        <Link to="/dashboard" className="tn-logo">
          <div className="tn-hex">XP</div>
          <span className="tn-brand">JOB<b>XP</b></span>
        </Link>

        {/* Center links */}
        <div className="tn-center">
          {NAV_LINKS.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`tn-link ${location.pathname.startsWith(l.to) ? 'active' : ''}`}
            >
              {l.label}
            </Link>
          ))}
          {user.isAdmin && (
            <Link
              to="/admin"
              className={`tn-link tn-link-admin ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
            >
              ⚙ Admin
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="tn-right">
          <div className="tn-xp">
            XP <span className="tn-xp-val">{(user.totalXP || 0).toLocaleString()}</span>
          </div>
          <div className="tn-lvl">LVL {user.level || 1}</div>

          {/* Avatar — click goes to profile */}
          <Link to="/profile" className="tn-avatar" title="View profile">
            {user.avatar && (user.avatar.startsWith('data:') || user.avatar.startsWith('http') || user.avatar.startsWith('/'))
              ? <img src={user.avatar} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'inherit' }} />
              : (user.avatar || '👤')}
          </Link>

          {/* Logout button */}
          <button
            className="tn-logout"
            title="Logout"
            onClick={() => logout()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>

          <button className="tn-mobile-btn" onClick={() => setMobileOpen(o => !o)}>☰</button>
        </div>
      </nav>

      {/* Mobile nav overlay */}
      <div className={`mobile-nav ${mobileOpen ? 'open' : ''}`}>
        <button
          style={{ position:'absolute', top:24, right:24, fontSize:24, color:'var(--text-1)', background:'none', border:'none', cursor:'pointer' }}
          onClick={() => setMobileOpen(false)}
        >✕</button>
        {NAV_LINKS.map(l => (
          <Link key={l.to} to={l.to}>{l.label}</Link>
        ))}
        {user.isAdmin && <Link to="/admin">⚙ Admin</Link>}
        <Link to="/profile">Profile</Link>
        <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>Logout</a>
      </div>
    </>
  );
}

