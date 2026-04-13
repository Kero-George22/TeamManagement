import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalProject } from '../contexts/ProjectContext';
import { useToast } from '../lib/toast';
import API from '../lib/api';
import Topbar from '../components/layout/Topbar';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { ProgressBar } from '../components/ui/Primitives';
import { fmtDate, daysLeft, projectProgress } from '../lib/utils';

const STATUS_COLORS = { Recruiting: 'green', 'In-Progress': 'blue', Completed: 'pink' };

export default function ProjectsPage() {
  const { user } = useAuth();
  const { refreshProjects } = useGlobalProject();
  const toast = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState(null);
  const [filter, setFilter]     = useState('');
  const [search, setSearch]     = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [roles, setRoles]         = useState([{ roleName: '', totalSlots: 1 }]);

  useEffect(() => { loadProjects(); }, []);

  async function loadProjects() {
    try { setProjects(await API.projects.list() || []); } catch { toast.error('Failed to load projects'); }
  }

  const filtered = (projects || []).filter(p => {
    const matchStatus = !filter || p.status === filter;
    const q = search.toLowerCase();
    const matchQ = !q || p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    return matchStatus && matchQ;
  });

  async function handleCreate(e) {
    e.preventDefault();
    const activeRoles = roles.filter(r => r.roleName.trim());
    if (activeRoles.length === 0) {
      toast.error('Please add at least one role with a valid name.');
      return;
    }
    
    setCreating(true);
    const fd = new FormData(e.target);
    try {
      const proj = await API.projects.create({
        title: fd.get('title'),
        description: fd.get('description'),
        startDate: fd.get('startDate'),
        duration: Number(fd.get('duration')),
        isPrivate: fd.get('isPrivate') === 'on',
        rolesRequired: roles.filter(r => r.roleName.trim()),
      });
      toast.success('Project created!');
      setModalOpen(false);
      setRoles([{ roleName: '', totalSlots: 1 }]);
      loadProjects();
      refreshProjects();
      navigate(`/app/project/${proj._id || proj.project?._id}`);
    } catch (err) { toast.error(err.message); }
    finally { setCreating(false); }
  }

  return (
    <>
      <Topbar title="Projects" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Discover Projects</h2>
          <button className="btn btn--green btn--sm" onClick={() => setModalOpen(true)}>
            <i className="fa-solid fa-plus" /> Create Project
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '.85rem' }} />
            <input type="text" placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: 99, border: '1.5px solid var(--border)', background: 'var(--white)', fontSize: '.875rem' }} />
          </div>
          {['', 'Recruiting', 'In-Progress', 'Completed'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`btn btn--sm ${filter === s ? 'btn--primary' : 'btn--outline'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {projects === null ? [0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 'var(--card-radius)' }} />) :
          filtered.length === 0
            ? <div className="empty-state" style={{ gridColumn: '1/-1' }}><i className="fa-solid fa-folder-open" /><h4>No projects found</h4><p>Try a different filter or create a new project.</p></div>
            : filtered.map(p => {
                const pct = projectProgress(p.startDate, p.duration);
                const isOwner = p.owner?._id === user?._id || p.owner === user?._id;
                const totalOpen = (p.rolesRequired || []).reduce((acc, r) => acc + Math.max(0, r.totalSlots - (r.filledSlots || 0)), 0);
                const isFullTeam = totalOpen === 0;
                return (
                  <div key={p._id} className="card" onClick={() => navigate(`/app/project/${p._id}`)} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          {p.isPrivate && <i className="fa-solid fa-lock" style={{ fontSize: '.75rem', color: 'var(--text-muted)' }} />}
                          <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{p.title}</h3>
                        </div>
                        <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>by {p.owner?.username || p.owner?.email?.split('@')[0] || 'Unknown'}</div>
                      </div>
                      <Badge variant={STATUS_COLORS[p.status] || 'gray'}>{p.status}</Badge>
                    </div>
                    <p style={{ fontSize: '.82rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, lineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 14 }}>{p.description}</p>
                    
                    {/* Roles */}
                    {p.isPrivate ? (
                      <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 14 }}>Invite only</div>
                    ) : isFullTeam ? (
                      <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>Full team · {(p.members || []).length} members</div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                        {(p.rolesRequired || []).map((r, i) => {
                          const open = r.totalSlots - (r.filledSlots || 0);
                          const full = open <= 0;
                          return (
                            <span key={i} className="chip" style={{ opacity: full ? 0.5 : 1 }}>
                              <i className="fa-solid fa-person" /> {r.roleName}
                              <span style={{ color: full ? 'var(--text-muted)' : 'var(--green)', fontWeight: 700, marginLeft: 4 }}>
                                {full ? 'Full' : `(${r.filledSlots || 0}/${r.totalSlots})`}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="divider" />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '.78rem', color: 'var(--text-muted)' }}>
                      <span><i className="fa-regular fa-calendar" style={{ marginRight: 4 }} />{fmtDate(p.startDate)} · {p.duration}d</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isOwner && <Badge variant="green">Owner</Badge>}
                        <span>{(p.members || []).length} members</span>
                      </div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <ProgressBar value={pct} />
                      <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>{pct}% elapsed • {daysLeft(p.startDate, p.duration)}</div>
                    </div>
                  </div>
                );
              })
        }
      </div>

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Project" maxWidth={560}>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group"><label className="form-label">Title *</label><input name="title" className="form-input" required placeholder="e.g. E-commerce Platform" /></div>
          <div className="form-group"><label className="form-label">Description *</label><textarea name="description" className="form-input" rows={3} required placeholder="What's this project about?" /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Start Date *</label><input name="startDate" type="date" className="form-input" required defaultValue={new Date().toISOString().split('T')[0]} /></div>
            <div className="form-group"><label className="form-label">Duration (days) *</label><input name="duration" type="number" className="form-input" min="1" required placeholder="30" /></div>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              Roles Required
              <button type="button" onClick={() => setRoles([...roles, { roleName: '', totalSlots: 1 }])} style={{ color: 'var(--green)', fontWeight: 600, fontSize: '.78rem', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add Role</button>
            </label>
            {roles.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                <input className="form-input" placeholder="Role name" required value={r.roleName} onChange={e => { const n = [...roles]; n[i].roleName = e.target.value; setRoles(n); }} style={{ flex: 2 }} />
                <input className="form-input" type="number" required min="1" placeholder="Slots" value={r.totalSlots} onChange={e => { const n = [...roles]; n[i].totalSlots = +e.target.value; setRoles(n); }} style={{ width: 80 }} />
                <button type="button" onClick={() => setRoles(roles.filter((_, j) => j !== i))} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><i className="fa-solid fa-trash" /></button>
              </div>
            ))}
          </div>
          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" name="isPrivate" style={{ width: 18, height: 18, accentColor: 'var(--green)', cursor: 'pointer' }} />
            <label style={{ fontSize: '.875rem', cursor: 'pointer' }}>Private project</label>
          </div>
          <button className="btn btn--green" disabled={creating} style={{ width: '100%' }}>
            {creating ? <span className="spinner" /> : 'Create Project'}
          </button>
        </form>
      </Modal>
    </>
  );
}
