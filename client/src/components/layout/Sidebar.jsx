import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalProject } from '../../contexts/ProjectContext';

const NAV = [
  { icon: 'fa-house',       to: '/app/dashboard', label: 'Dashboard' },
  { icon: 'fa-clipboard-list', to: '/app/tasks',  label: 'My Tasks'  },
  { icon: 'fa-bullseye',    to: '/app/goals',    label: 'Goals'     },
  { icon: 'fa-comment',     to: '/app/messages',  label: 'Messages'  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { projects, selectedProject, selectProject } = useGlobalProject();
  const navigate = useNavigate();
  
  const [showProjects, setShowProjects] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowProjects(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">TeamForge</div>
      <nav className="sidebar__nav" role="navigation" aria-label="Main navigation">
        {NAV.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) => `sidebar__link ${isActive ? 'active' : ''}`}
            aria-label={n.label} title={n.label}
          >
             <i className={`fa-solid ${n.icon}`} />
          </NavLink>
        ))}

        {/* Projects Popup Toggle */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button 
            className={`sidebar__link ${showProjects ? 'active' : ''}`}
            onClick={() => setShowProjects(!showProjects)}
            style={{ border: 'none', cursor: 'pointer' }}
            title="Projects"
          >
            <i className="fa-solid fa-folder-open" />
          </button>

          {/* Indented Projects List */}
          {showProjects && (
            <div style={{ 
              position: 'absolute', top: 0, left: '100%', marginLeft: '12px',
              background: 'var(--sidebar-bg)', borderRadius: '12px', padding: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)', width: 200, zIndex: 100 
            }}>
              <h4 style={{ fontSize: '.75rem', color: 'var(--green)', textTransform: 'uppercase', marginBottom: 8, padding: '0 8px' }}>Your Projects</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {projects.length === 0 ? (
                  <div style={{ padding: '8px', fontSize: '.8rem', color: 'rgba(255,255,255,.3)' }}>No projects</div>
                ) : (
                  projects.map(p => {
                    const isActive = selectedProject?._id === p._id;
                    return (
                      <button 
                        key={p._id} 
                        onClick={() => { selectProject(p._id); setShowProjects(false); navigate(`/app/project/${p._id}`); }}
                        style={{
                          display: 'block', padding: '8px 12px', borderRadius: 8, width: '100%', textAlign: 'left',
                          background: isActive ? 'rgba(34,197,94,.18)' : 'transparent',
                          color: isActive ? 'var(--green)' : 'rgba(255,255,255,.6)',
                          border: 'none', cursor: 'pointer', fontSize: '.85rem', fontWeight: 500,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          transition: 'background 0.2s, color 0.2s'
                        }}
                      >
                        {p.title}
                      </button>
                    );
                  })
                )}
                
                <div style={{ borderTop: '1px solid rgba(255,255,255,.1)', marginTop: 8, paddingTop: 8 }}>
                  {selectedProject && (
                    <button 
                      onClick={() => { selectProject(null); setShowProjects(false); navigate('/app/dashboard'); }}
                      style={{ padding: '8px 12px', width: '100%', textAlign: 'left', borderRadius: 6, fontSize: '.8rem', color: 'rgba(255,255,255,.4)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <i className="fa-solid fa-times" style={{ width: 14 }} /> Clear selection
                    </button>
                  )}
                  <button 
                    onClick={() => { setShowProjects(false); navigate('/app/projects'); }}
                    style={{ padding: '8px 12px', width: '100%', textAlign: 'left', borderRadius: 6, fontSize: '.8rem', color: 'var(--blue)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <i className="fa-solid fa-compass" style={{ width: 14 }} /> Browse all
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="sidebar__bottom">
        {user?.avatar ? (
          <img src={user.avatar} alt="Avatar" className="sidebar__avatar" />
        ) : (
          <div className="sidebar__avatar" style={{
              background: 'var(--green-bg)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '.9rem', flexShrink: 0
            }}>
              {(user?.username || user?.email || '?')[0].toUpperCase()}
          </div>
        )}
        <button className="sidebar__logout" onClick={logout} aria-label="Logout" title="Logout">
          <i className="fa-solid fa-right-from-bracket" />
        </button>
      </div>
    </aside>
  );
}
