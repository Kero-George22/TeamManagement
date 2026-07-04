import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalProject } from '../contexts/ProjectContext';
import { useToast } from '../lib/toast';
import API from '../lib/api';
import Topbar from '../components/layout/Topbar';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { ProgressBar } from '../components/ui/Primitives';
import { fmtDate, daysLeft, projectProgress, getCategoryColor } from '../lib/utils';

import { projectTemplates } from '../data/projectTemplates';

const STATUS_COLORS = { Recruiting: 'green', 'In-Progress': 'blue', Completed: 'pink' };

const DEFAULT_TASK_STATUSES = ['Todo', 'In-Progress', 'Review', 'Done', 'Approved'];

const CATEGORY_OPTIONS = [
  'Web Development', 'Mobile Development', 'Software Development',
  'Data Science & AI', 'DevOps & Cloud', 'Cybersecurity',
  'Blockchain', 'IoT & Hardware', 'Game Development',
  'UI/UX Design', 'Business & Marketing', 'Finance & Accounting',
  'Engineering', 'Education & Training', 'Healthcare',
  'E-commerce', 'Social Impact', 'Research & Development', 'Other',
];

export default function ProjectsPage() {
  const { user } = useAuth();
  const { refreshProjects } = useGlobalProject();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState(null);
  const [filter, setFilter]     = useState('');
  const [search, setSearch]     = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', duration: '', category: 'Other' });
  const [roles, setRoles]         = useState([{ roleName: '', totalSlots: 1 }]);
  const [taskStatuses, setTaskStatuses] = useState([...DEFAULT_TASK_STATUSES]);
  const [showStatusEditor, setShowStatusEditor] = useState(false);

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
        category: fd.get('category') || 'Other',
        isPrivate: fd.get('isPrivate') === 'on',
        rolesRequired: roles.filter(r => r.roleName.trim()),
        taskStatuses: taskStatuses.length > 0 ? taskStatuses : DEFAULT_TASK_STATUSES,
      });
      toast.success('Project created!');
      setModalOpen(false);
      setRoles([{ roleName: '', totalSlots: 1 }]);
      setTaskStatuses([...DEFAULT_TASK_STATUSES]);
      setShowStatusEditor(false);
      loadProjects();
      refreshProjects();
      navigate(`/app/project/${proj._id || proj.project?._id}`, { state: { from: location.pathname + location.search } });
    } catch (err) { toast.error(err.message); }
    finally { setCreating(false); }
  }

  function handleModalClose() {
    setModalOpen(false);
    setSelectedTemplate(null);
    setFormData({ title: '', description: '', duration: '', category: 'Other' });
    setRoles([{ roleName: '', totalSlots: 1 }]);
    setTaskStatuses([...DEFAULT_TASK_STATUSES]);
    setShowStatusEditor(false);
  }

  function handleSelectTemplate(t) {
    setSelectedTemplate(t.id);
    setFormData({ title: t.title, description: t.description, duration: t.duration, category: t.category });
    setRoles(t.rolesRequired.map(r => ({ ...r })));
    setTaskStatuses([...t.taskStatuses]);
  }

  function addTaskStatus() {
    setTaskStatuses([...taskStatuses, '']);
  }

  function updateTaskStatus(index, value) {
    const updated = [...taskStatuses];
    updated[index] = value;
    setTaskStatuses(updated);
  }

  function removeTaskStatus(index) {
    setTaskStatuses(taskStatuses.filter((_, i) => i !== index));
  }

  function resetToDefaultStatuses() {
    setTaskStatuses([...DEFAULT_TASK_STATUSES]);
  }

  return (
    <>
      <Topbar title="Projects" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>My Projects</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => navigate('/app/explore')}>
              <i className="fa-solid fa-compass" /> Explore teams
            </button>
            <button type="button" className="btn btn--green btn--sm" onClick={() => setModalOpen(true)}>
              <i className="fa-solid fa-plus" /> Create Project
            </button>
          </div>
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
                const catColor = getCategoryColor(p.category);
                return (
                  <div key={p._id} className="card" onClick={() => navigate(`/app/project/${p._id}`, { state: { from: location.pathname + location.search } })} style={{ 
                    cursor: 'pointer',
                    borderTop: `4px solid ${catColor}`,
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = `0 12px 24px -10px ${catColor}60`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}>
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
                      <div style={{ height: 4, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: catColor, borderRadius: 2, transition: 'width 0.3s' }} />
                      </div>
                      <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>{pct}% elapsed • {daysLeft(p.startDate, p.duration)}</div>
                    </div>
                  </div>
                );
              })
        }
      </div>

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={handleModalClose} title="New Project" maxWidth={700}>
        <div style={{ marginBottom: 20 }}>
          <label className="form-label">Or start with a Template</label>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'thin' }}>
            {projectTemplates.map(t => (
              <div 
                key={t.id} 
                onClick={() => handleSelectTemplate(t)}
                style={{ 
                  minWidth: 200, 
                  padding: 12, 
                  border: `2px solid ${selectedTemplate === t.id ? 'var(--green)' : 'var(--border)'}`, 
                  borderRadius: 12, 
                  cursor: 'pointer',
                  background: selectedTemplate === t.id ? 'var(--green-bg)' : 'transparent'
                }}>
                <div style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: 4 }}>{t.title}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{t.duration} days · {t.rolesRequired.length} roles</div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group"><label className="form-label">Title *</label><input name="title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="form-input" required placeholder="e.g. E-commerce Platform" /></div>
          <div className="form-group"><label className="form-label">Description *</label><textarea name="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="form-input" rows={3} required placeholder="What's this project about?" /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Start Date *</label><input name="startDate" type="date" className="form-input" required defaultValue={new Date().toISOString().split('T')[0]} /></div>
            <div className="form-group"><label className="form-label">Duration (days) *</label><input name="duration" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} type="number" className="form-input" min="1" required placeholder="30" /></div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select name="category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="form-input">
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
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

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Task Statuses <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '.75rem' }}>(optional, defaults to standard)</span></span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => setShowStatusEditor(!showStatusEditor)} style={{ color: 'var(--green)', fontWeight: 600, fontSize: '.78rem', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showStatusEditor ? 'Hide' : 'Customize'}
                </button>
                {showStatusEditor && (
                  <button type="button" onClick={resetToDefaultStatuses} style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '.78rem', background: 'none', border: 'none', cursor: 'pointer' }}>Reset</button>
                )}
              </div>
            </label>
            
            {!showStatusEditor ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {taskStatuses.map((s, i) => (
                  <span key={i} className="chip" style={{ fontSize: '.75rem' }}>{s}</span>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 6 }}>
                {taskStatuses.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                    <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', width: 20 }}>{i + 1}.</span>
                    <input className="form-input" placeholder="Status name" value={s} onChange={e => updateTaskStatus(i, e.target.value)} style={{ flex: 1 }} />
                    <button type="button" onClick={() => removeTaskStatus(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '.85rem' }}><i className="fa-solid fa-trash" /></button>
                  </div>
                ))}
                <button type="button" onClick={addTaskStatus} style={{ marginTop: 8, color: 'var(--green)', fontWeight: 600, fontSize: '.78rem', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add Status</button>
              </div>
            )}
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
