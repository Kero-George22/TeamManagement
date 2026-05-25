import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import Topbar from '../components/layout/Topbar';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import { fmtDate } from '../lib/utils';
import { useToast } from '../lib/toast';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'stats') {
        const res = await API.admin.stats();
        setStats(res);
      } else if (activeTab === 'users') {
        const res = await API.admin.users();
        setUsers(res || []);
      } else if (activeTab === 'projects') {
        const res = await API.admin.projects();
        setProjects(res || []);
      }
    } catch (err) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleBan(userId) {
    if (!window.confirm('Are you sure you want to toggle ban status for this user?')) return;
    try {
      const res = await API.admin.toggleBan(userId);
      toast.success(res.message || 'User ban status updated');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm('WARNING: This will permanently delete the user and all their owned projects. Continue?')) return;
    try {
      const res = await API.admin.deleteUser(userId);
      toast.success(res.message || 'User deleted');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  }

  async function handleDeleteProject(projectId) {
    if (!window.confirm('WARNING: This will permanently delete the project and all tasks inside it. Continue?')) return;
    try {
      const res = await API.admin.deleteProject(projectId);
      toast.success(res.message || 'Project deleted');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  }

  return (
    <>
      <Topbar title="Admin Dashboard" />

      <div style={{ maxWidth: 1200, margin: '0 auto', paddingTop: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Platform Administration</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Manage users, projects, and platform-wide settings</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn--outline" onClick={() => navigate('/app/admin/analytics')}>
              <i className="fa-solid fa-chart-line" /> Analytics
            </button>
            <button className="btn btn--outline" onClick={() => navigate('/app/admin/reviews')}>
              <i className="fa-solid fa-star" /> Flagged Reviews
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 24, display: 'flex', gap: 10, borderBottom: '1px solid var(--border)' }}>
          {['stats', 'users', 'projects'].map(t => (
            <button
              key={t}
              className={`tab-link ${activeTab === t ? 'active' : ''}`}
              onClick={() => setActiveTab(t)}
              style={{
                background: 'none', border: 'none', padding: '10px 16px', fontSize: '.95rem', fontWeight: 600,
                cursor: 'pointer', borderBottom: activeTab === t ? '2px solid var(--blue)' : '2px solid transparent',
                color: activeTab === t ? 'var(--blue)' : 'var(--text-secondary)', textTransform: 'capitalize'
              }}
            >
              <i className={`fa-solid fa-${t === 'stats' ? 'chart-simple' : t === 'users' ? 'users' : 'folder-open'}`} style={{ marginRight: 6 }} />
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-spinner fa-spin fa-2x" />
            <p>Loading...</p>
          </div>
        ) : (
          <div className="admin-content">
            {activeTab === 'stats' && stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--blue)' }}>{stats.usersCount}</div>
                  <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total Users</div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--green)' }}>{stats.projectsCount}</div>
                  <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total Projects</div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--purple)' }}>{stats.tasksCount}</div>
                  <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total Tasks</div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--red)' }}>{stats.bannedCount}</div>
                  <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Banned Users</div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: 'var(--bg-hover)', borderBottom: '2px solid var(--border)' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '.85rem' }}>User</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '.85rem' }}>Email</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '.85rem' }}>Role</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '.85rem' }}>Status</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '.85rem' }}>Joined</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '.85rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar user={u} size="sm" />
                            <span style={{ fontWeight: 600 }}>{u.username || 'Unnamed'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '.9rem' }}>{u.email}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {u.isAdmin ? <Badge variant="purple">Admin</Badge> : <Badge variant="gray">User</Badge>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {u.isBanned 
                            ? <Badge variant="red">Banned</Badge>
                            : (u.isVerified ? <Badge variant="green">Verified</Badge> : <Badge variant="yellow">Pending</Badge>)
                          }
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '.85rem', color: 'var(--text-secondary)' }}>{fmtDate(u.createdAt)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          {!u.isAdmin && (
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button className={`btn btn--sm ${u.isBanned ? 'btn--green' : 'btn--outline'}`} onClick={() => handleToggleBan(u._id)} style={{ padding: '4px 8px' }}>
                                <i className={`fa-solid ${u.isBanned ? 'fa-unlock' : 'fa-ban'}`} /> {u.isBanned ? 'Unban' : 'Ban'}
                              </button>
                              <button className="btn btn--sm btn--red" onClick={() => handleDeleteUser(u._id)} style={{ padding: '4px 8px' }}>
                                <i className="fa-solid fa-trash" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--text-muted)' }}>No users found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'projects' && (
              <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: 'var(--bg-hover)', borderBottom: '2px solid var(--border)' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '.85rem' }}>Project</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '.85rem' }}>Owner</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '.85rem' }}>Status</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '.85rem' }}>Visibility</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '.85rem' }}>Created</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '.85rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map(p => (
                      <tr key={p._id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontWeight: 600 }}>{p.title}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {p.owner ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Avatar user={p.owner} size="sm" />
                              <span style={{ fontSize: '.9rem' }}>{p.owner.username || 'User'}</span>
                            </div>
                          ) : <span style={{ color: 'var(--text-muted)' }}>Unknown</span>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge variant={p.status === 'Completed' ? 'green' : (p.status === 'Planning' ? 'yellow' : 'blue')}>{p.status}</Badge>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {p.isPrivate ? <Badge variant="pink"><i className="fa-solid fa-lock" /> Private</Badge> : <Badge variant="gray"><i className="fa-solid fa-globe" /> Public</Badge>}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '.85rem', color: 'var(--text-secondary)' }}>{fmtDate(p.createdAt)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button className="btn btn--sm btn--outline" onClick={() => window.open(`/app/project/${p._id}`, '_blank')} style={{ padding: '4px 8px' }}>
                              <i className="fa-solid fa-eye" />
                            </button>
                            <button className="btn btn--sm btn--red" onClick={() => handleDeleteProject(p._id)} style={{ padding: '4px 8px' }}>
                              <i className="fa-solid fa-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {projects.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--text-muted)' }}>No projects found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}