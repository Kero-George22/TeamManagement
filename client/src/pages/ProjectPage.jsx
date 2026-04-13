import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../lib/toast';
import API from '../lib/api';
import Topbar from '../components/layout/Topbar';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import TaskSidePanel from '../components/ui/TaskSidePanel';
import { ProgressBar } from '../components/ui/Primitives';
import { fmtDate, daysLeft, projectProgress } from '../lib/utils';

const STATUSES = ['Todo', 'In-Progress', 'Done', 'Approved'];
const SCOL = { Todo: 'gray', 'In-Progress': 'blue', Review: 'yellow', Done: 'green', Approved: 'purple' };
const BADGE_STATUS = { Recruiting: 'green', 'In-Progress': 'blue', Completed: 'gray' };
const PDOT = { High: 'priority-dot--high', Medium: 'priority-dot--medium', Low: 'priority-dot--low' };

export default function ProjectPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks]     = useState(null);
  const [members, setMembers] = useState(null);
  const [requests, setRequests] = useState(null);
  const [tab, setTab]         = useState('tasks');
  const [taskView, setTaskView] = useState('list');
  const [taskModal, setTaskModal] = useState(false);
  const [joinModal, setJoinModal] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [joinRole, setJoinRole] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  const [inlineAdding, setInlineAdding] = useState(null); // stores the status section where adding is active
  const [inlineTitle, setInlineTitle] = useState('');
  const [myTasksOnly, setMyTasksOnly] = useState(false);

  const isOwner  = project && (project.owner?._id === user?._id || project.owner === user?._id);
  const isMember = isOwner || (project?.members || []).some(m => (m.userId?._id || m.userId) === user?._id);

  useEffect(() => { init(); }, [id]);

  async function init() {
    try {
      const p = await API.projects.get(id);
      setProject(p);
      loadTasks();
      loadMembers();
    } catch { toast.error('Could not load project'); }
  }

  async function loadTasks() {
    try { setTasks(await API.tasks.list(id) || []); } catch { toast.error('Failed to load tasks'); }
  }

  async function loadMembers() {
    try { setMembers(await API.projects.members(id) || []); } catch {}
  }

  async function loadRequests() {
    try { setRequests((await API.projects.joinRequests(id) || []).filter(r => r.status === 'pending')); } catch {}
  }

  useEffect(() => { if (isOwner) loadRequests(); }, [isOwner]);

  const grouped = {};
  STATUSES.forEach(s => grouped[s] = []);
  (tasks || [])
    .filter(t => myTasksOnly ? (t.assignedTo?._id || t.assignedTo) === user?._id : true)
    .forEach(t => { if (grouped[t.status]) grouped[t.status].push(t); else grouped.Todo.push(t); });

  const pct = project ? projectProgress(project.startDate, project.duration) : 0;

  async function handleGenerate() {
    setGenLoading(true);
    try { await API.tasks.generate(id); toast.success('Tasks generated!'); loadTasks(); } catch (e) { toast.error(e.message); }
    finally { setGenLoading(false); }
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await API.tasks.create(id, {
        title: fd.get('title'), description: fd.get('description'),
        assignedRole: fd.get('role'), priority: fd.get('priority'),
        xpPoints: Number(fd.get('xp')) || 50, deadline: fd.get('deadline') || undefined,
      });
      toast.success('Task created!'); setTaskModal(false); loadTasks();
    } catch (e) { toast.error(e.message); }
  }

  async function handleJoin() {
    if (!joinRole) { toast.error('Please select a role'); return; }
    setJoinLoading(true);
    try { await API.projects.requestJoin(id, joinRole); toast.success('Request sent! Waiting for owner approval.'); setJoinModal(false); }
    catch (e) { toast.error(e.message); }
    finally { setJoinLoading(false); }
  }

  async function handleReq(reqId, status) {
    try { await API.projects.handleRequest(id, reqId, status); toast.success(`Request ${status}`); loadRequests(); loadMembers(); init(); } catch (e) { toast.error(e.message); }
  }

  function handleTaskUpdate(updatedTask) {
    setTasks(ts => ts.map(t => t._id === updatedTask._id ? { ...t, ...updatedTask } : t));
    setSelectedTask(prev => prev?._id === updatedTask._id ? { ...prev, ...updatedTask } : prev);
  }

  async function handleDrop(e, status) {
    e.preventDefault();
    if (!draggedTask || draggedTask.status === status) return;
    
    // Optimistic update
    const previousStatus = draggedTask.status;
    const updParams = { _id: draggedTask._id, status };
    handleTaskUpdate(updParams);

    try {
      await API.tasks.status(draggedTask._id, status);
    } catch (err) {
      toast.error('Failed to update status');
      // Revert on failure
      handleTaskUpdate({ _id: draggedTask._id, status: previousStatus });
    }
    setDraggedTask(null);
  }

  async function handleInlineCreate(e, status) {
    if (e.key === 'Escape') {
      setInlineAdding(null);
      setInlineTitle('');
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!inlineTitle.trim()) return;
      
      const defaultRole = project?.rolesRequired?.[0]?.roleName || 'Member';
      
      try {
        await API.tasks.create(id, {
          title: inlineTitle.trim(),
          description: '',
          assignedRole: defaultRole,
          priority: 'Medium',
          status: status,
          xpPoints: 50
        });
        setInlineAdding(null);
        setInlineTitle('');
        loadTasks();
      } catch (err) {
        toast.error(err.message);
      }
    }
  }

  if (!project) return <><Topbar title="Project" /><div className="skeleton" style={{ height: 160, borderRadius: 'var(--card-radius)' }} /></>;

  return (
    <>
      <Topbar title={project.title} />

      {/* Hero */}
      <div style={{ background: 'var(--sidebar-bg)', color: '#fff', borderRadius: 'var(--card-radius)', padding: '28px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Badge variant={BADGE_STATUS[project.status] || 'gray'}>{project.status}</Badge>
            {project.isPrivate && <span className="chip"><i className="fa-solid fa-lock" /> Private</span>}
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 6 }}>{project.title}</div>
          <div style={{ fontSize: '.875rem', color: 'rgba(255,255,255,.6)', maxWidth: 540 }}>{project.description}</div>
          <div style={{ display: 'flex', gap: 20, marginTop: 18 }}>
            {[['Start', fmtDate(project.startDate)], ['Duration', `${project.duration} days`], ['Members', (project.members || []).length], ['Roles', (project.rolesRequired || []).length]].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <label style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.06em', color: 'rgba(255,255,255,.4)' }}>{l}</label>
                <span style={{ fontWeight: 600, fontSize: '.9rem', color: 'rgba(255,255,255,.9)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', fontWeight: 600, marginBottom: 8 }}>
          <span>Project progress</span>
          <span>{pct}% · {daysLeft(project.startDate, project.duration)}</span>
        </div>
        <ProgressBar value={pct} style={{ height: 12 }} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--white)', borderRadius: 14, padding: 5, boxShadow: 'var(--shadow)', width: 'fit-content' }}>
        {['tasks', 'members', ...(isOwner ? ['requests'] : [])].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`btn btn--sm ${tab === t ? 'btn--primary' : 'btn--ghost'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
        <button className="btn btn--sm btn--ghost" onClick={() => navigate(`/app/office/${id}`)}>
          <i className="fa-solid fa-comments" /> Office
        </button>
      </div>

      {/* ═══════════════ TASKS TAB ═══════════════ */}
      {tab === 'tasks' && (
        <>
          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 4, background: 'var(--white)', borderRadius: 10, padding: 4, boxShadow: 'var(--shadow)' }}>
              <button className={`btn btn--sm ${taskView === 'list' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setTaskView('list')}><i className="fa-solid fa-list" /> List</button>
              <button className={`btn btn--sm ${taskView === 'board' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setTaskView('board')}><i className="fa-brands fa-trello" /> Board</button>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button 
                className={`btn btn--sm ${myTasksOnly ? 'btn--primary' : 'btn--ghost'}`} 
                onClick={() => setMyTasksOnly(!myTasksOnly)}
              >
                <i className="fa-solid fa-user" /> {myTasksOnly ? 'My tasks' : 'All tasks'}
              </button>
              {isOwner && (
                <>
                  <button className="btn btn--ghost btn--sm" onClick={handleGenerate} disabled={genLoading}>
                    {genLoading ? <span className="spinner" style={{ borderTopColor: 'var(--text-primary)' }} /> : <><i className="fa-solid fa-wand-magic-sparkles" /> AI Generate</>}
                  </button>
                  <button className="btn btn--green btn--sm" onClick={() => setTaskModal(true)}><i className="fa-solid fa-plus" /> Add Task</button>
                </>
              )}
            </div>
          </div>

          {tasks === null ? <div className="skeleton" style={{ height: 200, borderRadius: 'var(--card-radius)' }} /> : (tasks || []).length === 0 ? (
            <div className="empty-state"><i className="fa-solid fa-clipboard-list" /><h4>No tasks yet</h4><p>Tasks will be generated when your team is complete.</p></div>
          ) : taskView === 'list' ? (
            /* ─── LIST VIEW ─── */
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Column header */}
              <div style={{ display: 'grid', gridTemplateColumns: '28px 3fr 1fr 100px 90px 90px', gap: 12, padding: '10px 20px', borderBottom: '2px solid var(--border)', fontSize: '.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                <div></div><div>Task Name</div><div>Assignee</div><div>Due Date</div><div>Priority</div><div>Status</div>
              </div>
              <div style={{ padding: '0 6px' }}>
                {STATUSES.map(status => (
                  <div key={status}>
                    <div className="task-list-section-header">
                      <h4>{status}</h4>
                      <Badge variant={SCOL[status]} style={{ fontSize: '.68rem' }}>{grouped[status].length}</Badge>
                    </div>
                    {grouped[status].map(t => (
                      <div key={t._id} className="task-list-row" style={{ gridTemplateColumns: '28px 3fr 1fr 100px 90px 90px' }} onClick={() => setSelectedTask(t)}>
                        <div className={`task-circle ${t.status === 'Done' || t.status === 'Approved' ? 'task-circle--done' : ''}`} style={{ width: 20, height: 20 }}>
                          {(t.status === 'Done' || t.status === 'Approved') && <i className="fa-solid fa-check" style={{ fontSize: '.5rem' }} />}
                        </div>
                        <div style={{ fontWeight: 500, fontSize: '.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                        <div>{t.assignedTo ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Avatar user={t.assignedTo} size="sm" /><span style={{ fontSize: '.78rem' }}>{t.assignedTo?.username || t.assignedTo?.email?.split('@')[0]}</span></div> : <span style={{ color: 'var(--text-muted)', fontSize: '.78rem' }}>—</span>}</div>
                        <div style={{ fontSize: '.78rem', color: t.deadline && new Date(t.deadline) < new Date() ? '#ef4444' : 'var(--text-muted)' }}>{t.deadline ? fmtDate(t.deadline) : '—'}</div>
                        <div><div className={`priority-dot ${PDOT[t.priority]}`} title={t.priority} /></div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <select 
                            className="form-input" 
                            style={{ padding: '2px 6px', fontSize: '.7rem', height: 24, borderRadius: 12, background: `var(--badge-${SCOL[t.status]}-bg)`, color: `var(--badge-${SCOL[t.status]}-text)`, border: 'none', fontWeight: 600 }}
                            value={t.status}
                            onChange={(e) => {
                              const newStatus = e.target.value;
                              const upd = { _id: t._id, status: newStatus };
                              handleTaskUpdate(upd);
                              API.tasks.status(t._id, newStatus).catch(() => handleTaskUpdate({ _id: t._id, status: t.status }));
                            }}
                          >
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                    ))}
                    {isOwner && grouped[status].length === 0 && !inlineAdding && <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: '.8rem' }}>Empty</div>}
                    
                    {/* Inline Add Task Row */}
                    {isOwner && (
                      inlineAdding === status ? (
                         <div className="task-list-row" style={{ gridTemplateColumns: '28px 1fr' }}>
                           <div className="task-circle" style={{ width: 20, height: 20 }}></div>
                           <input 
                             autoFocus
                             className="form-input" 
                             style={{ padding: '4px 8px', fontSize: '.875rem' }}
                             placeholder="Write a task name and press Enter" 
                             value={inlineTitle}
                             onChange={(e) => setInlineTitle(e.target.value)}
                             onKeyDown={(e) => handleInlineCreate(e, status)}
                             onBlur={() => { setInlineAdding(null); setInlineTitle(''); }}
                           />
                         </div>
                      ) : (
                        <div className="task-list-row" style={{ gridTemplateColumns: 'minmax(0, 1fr)', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setInlineAdding(status)}>
                           <div style={{ fontSize: '.875rem', fontWeight: 500, paddingLeft: 34 }}>
                             <i className="fa-solid fa-plus" style={{ marginRight: 8 }} /> Add task...
                           </div>
                        </div>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ─── BOARD VIEW ─── */
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STATUSES.length}, 1fr)`, gap: 14 }}>
              {STATUSES.map(s => (
                <div key={s} 
                     className="board-col"
                     onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                     onDrop={(e) => handleDrop(e, s)}>
                  <div className="board-col__header">
                    <div><span className="board-col__caret">▸</span> {s === 'Todo' ? 'Todo list' : s === 'In-Progress' ? 'In Progress' : s === 'Review' ? 'In Review' : s === 'Approved' ? 'Approved' : 'Done'}</div>
                    <div style={{ display: 'flex', gap: 8, color: 'var(--text-muted)' }}>
                      <i className="fa-solid fa-plus" style={{ cursor: 'pointer' }} />
                      <i className="fa-solid fa-ellipsis-vertical" style={{ cursor: 'pointer' }} />
                    </div>
                  </div>
                  {grouped[s].length ? grouped[s].map(t => {
                    const KANBAN_COLORS = ['blue', 'purple', 'red', 'orange', 'green', 'pink'];
                    const cCol = KANBAN_COLORS[Math.abs(t._id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % KANBAN_COLORS.length];
                    const progressVal = t.xpPoints > 100 ? 100 : (t.xpPoints < 10 ? 10 : t.xpPoints);

                    return (
                      <div key={t._id} className={`kanban-card kanban-card--${cCol}`} style={{ cursor: 'grab', opacity: draggedTask?._id === t._id ? 0.5 : 1 }} 
                           onClick={() => setSelectedTask(t)}
                           draggable
                           onDragStart={(e) => { setDraggedTask(t); e.dataTransfer.setData('text/plain', t._id); e.dataTransfer.effectAllowed = 'move'; }}
                           onDragEnd={() => setDraggedTask(null)}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <span className="task-tag">#{t.priority.toLowerCase()}</span>
                            <span className="task-tag">#{t.assignedRole?.toLowerCase().replace(/\s+/g, '') || 'task'}</span>
                          </div>
                          <i className="fa-solid fa-ellipsis-vertical" style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }} />
                        </div>
                        
                        <div style={{ fontWeight: 800, fontSize: '.95rem', color: `var(--${cCol})`, filter: 'brightness(0.4)', lineHeight: 1.3 }}>{t.title}</div>
                        
                        {t.description && <div style={{ fontSize: '.75rem', color: `var(--${cCol})`, filter: 'brightness(0.6)', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>Note: {t.description}</div>}
                        


                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                          <div style={{ display: 'flex', marginLeft: 8 }}>
                            {t.assignedTo ? <Avatar user={t.assignedTo} size="sm" style={{ border: '2px solid rgba(255,255,255,0.8)', marginLeft: -8, width: 26, height: 26 }} /> : <div className="avatar-placeholder" style={{ width: 26, height: 26, fontSize: '.6rem', marginLeft: -8, border: '2px solid rgba(255,255,255,0.8)', background: `var(--${cCol})`, color: '#fff', filter: 'brightness(0.8)' }}>UI</div>}
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <div className="task-meta-pill"><i className="fa-regular fa-comment-dots" /> {t.comments?.length || 0}</div>
                            <div className="task-meta-pill"><i className="fa-solid fa-paperclip" /> {Math.floor(Math.abs(t._id.charCodeAt(5)) % 5)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  }) : <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: '.8rem' }}>Drop here</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══════════════ MEMBERS TAB ═══════════════ */}
      {tab === 'members' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-title" style={{ margin: 0 }}>Team Members</span>
            {!isMember && project.status === 'Recruiting' && (
              <button className="btn btn--green btn--sm" onClick={() => setJoinModal(true)}><i className="fa-solid fa-user-plus" /> Request to Join</button>
            )}
          </div>

          {/* Roles overview */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(project.rolesRequired || []).map((r, i) => {
              const open = r.totalSlots - (r.filledSlots || 0);
              return (
                <div key={i} className="chip" style={{ fontSize: '.78rem' }}>
                  <i className="fa-solid fa-person" /> {r.roleName}
                  <span style={{ color: open > 0 ? 'var(--green)' : 'var(--text-muted)', fontWeight: 700, marginLeft: 4 }}>({r.filledSlots || 0}/{r.totalSlots})</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {(members || []).map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--white)', borderRadius: 18, padding: 14, boxShadow: 'var(--shadow)' }}>
                <Avatar user={m.user || m} size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{m.user?.username || m.user?.email?.split('@')[0] || 'User'}</div>
                  <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>{m.roleName}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══════════════ REQUESTS TAB ═══════════════ */}
      {tab === 'requests' && isOwner && (
        <>
          <h3 className="section-title">Join Requests {requests?.length ? <Badge variant="yellow">{requests.length} pending</Badge> : null}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!requests?.length
              ? <div className="empty-state"><i className="fa-solid fa-inbox" /><h4>No pending requests</h4></div>
              : requests.map(r => (
                <div key={r._id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--white)', borderRadius: 14, padding: 14, boxShadow: 'var(--shadow)' }}>
                  <Avatar user={r.user} size="md" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{r.user?.username || r.user?.email || 'User'}</div>
                    <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>Requested: <strong>{r.roleName}</strong></div>
                    {r.requestedAt && <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Sent: {fmtDate(r.requestedAt)}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn--danger btn--sm" onClick={() => handleReq(r._id, 'rejected')}>Reject</button>
                    <button className="btn btn--green btn--sm" onClick={() => handleReq(r._id, 'accepted')}>Accept</button>
                  </div>
                </div>
              ))
            }
          </div>
        </>
      )}

      {/* ═══════════════ CREATE TASK MODAL ═══════════════ */}
      <Modal open={taskModal} onClose={() => setTaskModal(false)} title="Add Task">
        <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group"><label className="form-label">Title *</label><input name="title" className="form-input" required placeholder="Task title" /></div>
          <div className="form-group"><label className="form-label">Description *</label><textarea name="description" className="form-input" rows={3} required placeholder="What needs to be done?" /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Role *</label>
              <select name="role" className="form-input" required>
                {(project.rolesRequired || []).map((r, i) => <option key={i} value={r.roleName}>{r.roleName}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Priority</label>
              <select name="priority" className="form-input"><option>Low</option><option selected>Medium</option><option>High</option></select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">XP Points</label><input name="xp" className="form-input" type="number" defaultValue={50} min={1} /></div>
            <div className="form-group"><label className="form-label">Deadline</label><input name="deadline" className="form-input" type="date" /></div>
          </div>
          <button className="btn btn--green" style={{ width: '100%' }}>Create Task</button>
        </form>
      </Modal>

      {/* ═══════════════ JOIN MODAL ═══════════════ */}
      <Modal open={joinModal} onClose={() => setJoinModal(false)} title={`Join ${project.title}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', margin: 0 }}>Select your role:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(project.rolesRequired || []).map((r, i) => {
              const full = (r.filledSlots || 0) >= r.totalSlots;
              const open = r.totalSlots - (r.filledSlots || 0);
              return (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${joinRole === r.roleName ? 'var(--green)' : 'var(--border)'}`, cursor: full ? 'not-allowed' : 'pointer', opacity: full ? 0.5 : 1, background: joinRole === r.roleName ? 'var(--green-bg)' : 'transparent', transition: 'all .15s' }}>
                  <input type="radio" name="joinRole" value={r.roleName} disabled={full} checked={joinRole === r.roleName} onChange={() => setJoinRole(r.roleName)} style={{ accentColor: 'var(--green)' }} />
                  <span style={{ fontWeight: 600, fontSize: '.9rem', flex: 1 }}>{r.roleName}</span>
                  <span style={{ fontSize: '.78rem', color: full ? 'var(--text-muted)' : 'var(--green)', fontWeight: 600 }}>{full ? 'Full' : `${open} slot${open > 1 ? 's' : ''} open`}</span>
                </label>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn--outline" onClick={() => setJoinModal(false)} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn--green" onClick={handleJoin} disabled={!joinRole || joinLoading} style={{ flex: 1 }}>
              {joinLoading ? <span className="spinner" /> : 'Send Request'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ═══════════════ TASK SIDE PANEL ═══════════════ */}
      {selectedTask && (
        <TaskSidePanel
          task={selectedTask}
          onClose={() => { setSelectedTask(null); loadTasks(); }}
          isOwner={isOwner}
          isMember={isMember}
          userId={user?._id}
          projectId={id}
          onTaskUpdate={handleTaskUpdate}
        />
      )}
    </>
  );
}
