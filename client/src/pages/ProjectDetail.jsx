import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { SpinnerWrap } from '../components/Spinner.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../api/index.js';
import { timeAgo, priorityColor } from '../utils.js';

const TASK_FILTERS = ['All','todo','in-progress','review','done'];

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast    = useToast();

  const [project,     setProject]     = useState(null);
  const [members,     setMembers]     = useState([]);
  const [tasks,       setTasks]       = useState([]);
  const [performance, setPerformance] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [taskFilter,  setTaskFilter]  = useState('All');
  const [activeTab,   setActiveTab]   = useState('tasks');
  const [joinModal,   setJoinModal]   = useState(false);
  const [aiModal,     setAiModal]     = useState(false);
  const [joinRole,    setJoinRole]    = useState('');
  const [aiPrompt,    setAiPrompt]    = useState('');
  const [aiCount,     setAiCount]     = useState(5);
  const [submitting,  setSubmitting]  = useState(false);
  const currentUserId = user?._id || user?.id;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [proj, memberData] = await Promise.all([
        api.get('/projects/' + id),
        api.get('/projects/' + id + '/members'),
      ]);

      const projectData = proj.project || proj;
      const rawMembers = memberData.members || memberData || [];
      const normalizedMembers = rawMembers.map((m) => {
        const u = m.user || m.userId || {};
        return {
          _id: u._id || m._id || m.userId,
          userId: u._id || m.userId,
          username: u.username || m.username,
          email: u.email || m.email,
          avatar: u.avatar || m.avatar,
          totalXP: u.totalXP || u.xp || m.totalXP || 0,
          completedTasks: u.completedTasks || m.completedTasks || 0,
          role: m.role || m.roleName || '—',
          joinedAt: m.joinedAt,
        };
      });

      setProject(projectData);
      setMembers(normalizedMembers);

      const memberIds = normalizedMembers.map((m) => String(m._id || m.userId));
      const canSeeTasks = user?.isAdmin || memberIds.includes(String(currentUserId));
      if (canSeeTasks) {
        const taskData = await api.get('/tasks/' + id);
        setTasks(taskData.tasks || taskData || []);
      } else {
        setTasks([]);
        setActiveTab('members');
      }
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  }, [id, currentUserId, user?.isAdmin]);

  useEffect(() => { load(); }, [load]);

  async function loadPerformance() {
    if (performance) return;
    try {
      const data = await api.get('/tasks/' + id + '/performance');
      setPerformance(data);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function joinProject() {
    setSubmitting(true);
    try {
      await api.post('/projects/' + id + '/join', { roleName: joinRole });
      toast.success('Joined project!');
      setJoinModal(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally { setSubmitting(false); }
  }

  async function generateTasks() {
    setSubmitting(true);
    try {
      await api.post('/tasks/' + id + '/ai-generate', {
        projectDescription: aiPrompt || project?.description,
        count: +aiCount,
      });
      toast.success('AI tasks generated!');
      setAiModal(false);
      const taskData = await api.get('/tasks/' + id);
      setTasks(taskData.tasks || taskData || []);
    } catch (err) {
      toast.error(err.message);
    } finally { setSubmitting(false); }
  }

  if (loading) return <Layout><SpinnerWrap /></Layout>;
  if (!project) return <Layout><EmptyState icon="🔍" text="Project not found" /></Layout>;

  const isMember    = members.some(m => String(m._id || m.userId) === String(currentUserId));
  const canSeeTasks = isMember || user?.isAdmin;
  const filteredTasks = taskFilter === 'All' ? tasks : tasks.filter(t => t.status === taskFilter);

  const p = project;

  return (
    <Layout>
      {/* Project hero */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', padding:'28px 32px', marginBottom:24, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,var(--cyan),var(--purple),var(--gold))' }} />
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(16px,3vw,26px)', fontWeight:900, letterSpacing:4, marginBottom:8 }}>{p.name}</div>
            <div style={{ color:'var(--text-2)', fontSize:13, lineHeight:1.7, maxWidth:600, marginBottom:14 }}>{p.description}</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
              {(p.techStack||[]).map(t => <span key={t} className="badge-chip cyan">{t}</span>)}
            </div>
            <div style={{ display:'flex', gap:16, fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-2)', flexWrap:'wrap' }}>
              <span>👥 {members.length}/{p.maxMembers || '∞'} members</span>
              <span>⚔️ {tasks.length} tasks</span>
              <span>{timeAgo(p.createdAt)}</span>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10, alignItems:'flex-end' }}>
            <StatusBadge status={p.status} />
            {!isMember && <button className="btn btn-cyan" onClick={() => setJoinModal(true)}>⚡ Join Project</button>}
            {user?.isAdmin && (
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button className="btn btn-outline btn-sm" onClick={() => setAiModal(true)}>🤖 AI Generate Tasks</button>
                <Link to={`/office/${id}`} className="btn btn-ghost btn-sm">💬 Office</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[canSeeTasks ? 'tasks' : null,'members','roles',user?.isAdmin ? 'performance' : null].filter(Boolean).map(tab => (
          <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab); if (tab === 'performance') loadPerformance(); }}>
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tasks tab */}
      {activeTab === 'tasks' && canSeeTasks && (
        <>
          <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
            {TASK_FILTERS.map(f => (
              <button key={f}
                className={`btn btn-sm ${taskFilter === f ? 'btn-cyan' : 'btn-ghost'}`}
                onClick={() => setTaskFilter(f)}>
                {f === 'All' ? 'All' : f} {f !== 'All' && `(${tasks.filter(t => t.status === f).length})`}
              </button>
            ))}
          </div>
          {filteredTasks.length === 0
            ? <EmptyState icon="📋" text="No tasks" sub={taskFilter !== 'All' ? `No ${taskFilter} tasks.` : 'No tasks yet.'} />
            : filteredTasks.map(t => (
              <div key={t._id} className={`task-card ${(t.status||'todo').replace(/\s+/g,'-')}`}
                onClick={() => navigate('/tasks/' + t._id)}>
                <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                  <div className="task-card-title">{t.title}</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <StatusBadge status={t.status} />
                    {t.priority && (
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color: priorityColor(t.priority) }}>{t.priority}</span>
                    )}
                  </div>
                </div>
                <div className="task-card-meta">
                  <span>⚡ {t.xpReward || 0} XP</span>
                  {t.assignedTo && <span>👤 Assigned</span>}
                  <span>{timeAgo(t.createdAt)}</span>
                </div>
              </div>
            ))
          }
        </>
      )}

      {/* Members tab */}
      {activeTab === 'members' && (
        <div className="card">
          {members.length === 0
            ? <EmptyState icon="👥" text="No members yet" />
            : (
              <table className="table">
                <thead>
                  <tr><th>HERO</th><th>ROLE</th><th>TASKS</th><th>XP</th><th>JOINED</th></tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m._id || m.userId} onClick={() => navigate('/profile/' + (m._id || m.userId))}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <span style={{ fontSize:20 }}>{m.avatar || '👤'}</span>
                          <div>
                            <div style={{ fontFamily:'var(--font-display)', fontSize:12, letterSpacing:2 }}>{m.username || 'Hero'}</div>
                            <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-3)' }}>{m.email || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge-chip cyan">{m.role || '—'}</span></td>
                      <td style={{ fontFamily:'var(--font-display)', fontSize:14 }}>{m.completedTasks || 0}</td>
                      <td style={{ fontFamily:'var(--font-display)', fontSize:14, color:'var(--gold)' }}>{(m.totalXP||0).toLocaleString()}</td>
                      <td style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-2)' }}>{timeAgo(m.joinedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      )}

      {/* Roles tab */}
      {activeTab === 'roles' && (
        <div className="card">
          {!(p.roles||[]).length
            ? <EmptyState icon="🎭" text="No roles defined" />
            : <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                {(p.roles||[]).map(r => <span key={r} className="badge-chip purple" style={{ fontSize:12, padding:'6px 16px' }}>{r}</span>)}
              </div>
          }
        </div>
      )}

      {/* Performance tab (admin) */}
      {activeTab === 'performance' && (
        <div className="card">
          {!performance
            ? <SpinnerWrap />
            : (
              <div>
                <div className="stat-cards mb-6">
                  <div className="stat-card"><span className="sc-icon">✅</span><div className="sc-val">{performance.completedTasks || 0}</div><div className="sc-lbl">Completed</div></div>
                  <div className="stat-card gold"><span className="sc-icon">⭐</span><div className="sc-val">{(performance.avgScore || 0).toFixed(1)}</div><div className="sc-lbl">Avg Score</div></div>
                  <div className="stat-card purple"><span className="sc-icon">⚡</span><div className="sc-val">{(performance.totalXpAwarded || 0).toLocaleString()}</div><div className="sc-lbl">XP Awarded</div></div>
                  <div className="stat-card green"><span className="sc-icon">⌛</span><div className="sc-val">{performance.inProgress || 0}</div><div className="sc-lbl">In Progress</div></div>
                </div>
                {performance.aiInsights && (
                  <div style={{ background:'var(--cyan-dim)', border:'1px solid var(--cyan)', padding:20 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:10, letterSpacing:3, color:'var(--cyan)', marginBottom:10 }}>🤖 AI INSIGHTS</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--text-1)', lineHeight:1.8, whiteSpace:'pre-wrap' }}>
                      {performance.aiInsights}
                    </div>
                  </div>
                )}
              </div>
            )
          }
        </div>
      )}

      {/* Join modal */}
      <Modal isOpen={joinModal} onClose={() => setJoinModal(false)} title="JOIN PROJECT"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setJoinModal(false)}>Cancel</button>
            <button className="btn btn-cyan" disabled={submitting} onClick={joinProject}>
              {submitting ? 'JOINING…' : '⚡ Join'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Select Role</label>
          <select className="form-select" value={joinRole} onChange={e => setJoinRole(e.target.value)}>
            <option value="">No specific role</option>
            {(p.rolesRequired || []).map(r => <option key={r.roleName} value={r.roleName}>{r.roleName}</option>)}
          </select>
        </div>
      </Modal>

      {/* AI generate tasks modal */}
      <Modal isOpen={aiModal} onClose={() => setAiModal(false)} title="🤖 AI GENERATE TASKS"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setAiModal(false)}>Cancel</button>
            <button className="btn btn-cyan" disabled={submitting} onClick={generateTasks}>
              {submitting ? 'GENERATING…' : '🤖 Generate'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Context / Prompt (optional)</label>
          <textarea className="form-textarea" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
            placeholder="Describe what kind of tasks to generate…" />
        </div>
        <div className="form-group">
          <label className="form-label">Number of Tasks</label>
          <input type="number" className="form-input" value={aiCount} min={1} max={20}
            onChange={e => setAiCount(e.target.value)} />
        </div>
      </Modal>
    </Layout>
  );
}
