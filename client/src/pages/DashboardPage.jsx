import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalProject } from '../contexts/ProjectContext';
import { useToast } from '../lib/toast';
import API from '../lib/api';
import Topbar from '../components/layout/Topbar';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/Primitives';
import { fmtDate, daysLeft, projectProgress } from '../lib/utils';

const CARD_COLORS = ['yellow', 'blue', 'pink', 'green', 'purple'];
const FILLS = { yellow: '#f59e0b', blue: '#3b82f6', pink: '#ec4899', green: '#22c55e', purple: '#8b5cf6' };
const BADGE_STATUS = { Recruiting: 'green', 'In-Progress': 'blue', Completed: 'gray' };

export default function DashboardPage() {
  const { user } = useAuth();
  const { projects, selectedProject } = useGlobalProject();
  const toast = useToast();
  const navigate = useNavigate();
  
  // Default Dashboard State
  const [stats, setStats]     = useState(null);
  const [profile, setProfile]   = useState(null);
  const [convs, setConvs]       = useState(null);

  // Scoped Dashboard State
  const [scopedTasks, setScopedTasks] = useState(null);
  const [scopedTeam, setScopedTeam]   = useState(null);
  const [scopedAI, setScopedAI]       = useState(null);
  const [scopedMsgs, setScopedMsgs]   = useState(null);

  useEffect(() => {
    (async () => {
      try { const p = await API.profile.me(); setProfile(p?.user || p); } catch {}
      try { const c = await API.dms.conversations(); setConvs(c || []); } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!selectedProject) {
      if (projects) {
        const mine = projects.filter(p => p.owner?._id === user?._id || p.owner === user?._id);
        const joined = projects.filter(p => (p.members || []).some(m => m.userId === user?._id || m.userId?._id === user?._id));
        setStats({ total: projects.length, mine: mine.length, joined: joined.length });
      }
    } else {
      // Load Scoped Project Data
      (async () => {
        try { setScopedTasks(await API.tasks.list(selectedProject._id) || []); } catch { setScopedTasks([]); }
        try { setScopedTeam(await API.projects.members(selectedProject._id) || []); } catch { setScopedTeam([]); }
        try { setScopedAI(await API.office.status(selectedProject._id)); } catch { setScopedAI(null); }
        try { const m = await API.office.messages(selectedProject._id) || []; setScopedMsgs(m.slice(-3)); } catch { setScopedMsgs([]); }
      })();
    }
  }, [selectedProject, projects, user]);

  return (
    <>
      <Topbar title={selectedProject ? `${selectedProject.title} Dashboard` : "Dashboard"} />

      {selectedProject ? (
        // =======================
        // SCOPED DASHBOARD
        // =======================
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Project Details Hero */}
          <div style={{ background: 'var(--sidebar-bg)', color: '#fff', borderRadius: 'var(--card-radius)', padding: '28px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Badge variant={BADGE_STATUS[selectedProject.status] || 'gray'}>{selectedProject.status}</Badge>
                {selectedProject.isPrivate && <span className="chip"><i className="fa-solid fa-lock" /> Private</span>}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 6 }}>{selectedProject.title}</div>
              <div style={{ fontSize: '.875rem', color: 'rgba(255,255,255,.6)', maxWidth: 540 }}>{selectedProject.description}</div>
              <div style={{ display: 'flex', gap: 20, marginTop: 18 }}>
                {[['Start', fmtDate(selectedProject.startDate)], ['Duration', `${selectedProject.duration} days`], ['Progress', `${projectProgress(selectedProject.startDate, selectedProject.duration)}%`], ['Time Left', daysLeft(selectedProject.startDate, selectedProject.duration)]].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <label style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.06em', color: 'rgba(255,255,255,.4)' }}>{l}</label>
                    <span style={{ fontWeight: 600, fontSize: '.9rem', color: 'rgba(255,255,255,.9)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="content-grid">
            {/* Scoped Team & Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 className="section-title" style={{ margin: 0 }}>Team Members</h3>
                  <button className="btn btn--sm btn--ghost" onClick={() => navigate(`/app/project/${selectedProject._id}`)}>View All →</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {scopedTeam === null ? <div className="skeleton" style={{ height: 40, width: 40, borderRadius: '50%' }} /> :
                    scopedTeam.map((m, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }} title={m.roleName}>
                        <Avatar user={m.user || m} size="md" />
                        <span style={{ fontSize: '.65rem', color: 'var(--text-muted)' }}>{m.user?.username || 'User'}</span>
                      </div>
                    ))
                  }
                </div>
              </div>

              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 1.5s infinite' }} />
                    AI Status
                  </div>
                  <button className="btn btn--sm btn--ghost" onClick={() => navigate(`/app/office/${selectedProject._id}`)}>Office →</button>
                </div>
                <div style={{ fontSize: '.82rem', color: 'var(--text)', lineHeight: 1.55 }}>
                  {scopedAI ? (scopedAI.summary || scopedAI.status || 'No data') : 'Loading AI status...'}
                </div>
              </div>
            </div>

            {/* Scoped Tasks & Messages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 className="section-title" style={{ margin: 0 }}>Recent Tasks</h3>
                  <button className="btn btn--sm btn--ghost" onClick={() => navigate(`/app/tasks`)}>My Tasks →</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {scopedTasks === null ? [1,2].map(i => <div key={i} className="skeleton" style={{ height: 50, borderRadius: 8 }} />) :
                    scopedTasks.length === 0 ? <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>No tasks assigned.</div> :
                    scopedTasks.slice(0, 4).map(t => (
                      <div key={t._id} onClick={() => navigate(`/app/task/${t._id}`)} style={{ display: 'flex', justifyContent: 'space-between', padding: 10, background: '#f9fafb', borderRadius: 8, cursor: 'pointer' }}>
                        <div>
                          <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{t.title}</div>
                          <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{t.assignedRole} • {t.status}</div>
                        </div>
                        {t.assignedTo && <Avatar user={t.assignedTo} size="sm" />}
                      </div>
                    ))
                  }
                </div>
              </div>

              <div className="card">
                <h3 className="section-title">Recent Office Chat</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {scopedMsgs === null ? [1,2].map(i => <div key={i} className="skeleton" style={{ height: 40, borderRadius: 8 }} />) :
                    scopedMsgs.length === 0 ? <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>No recent messages.</div> :
                    scopedMsgs.map((m, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10 }}>
                        <Avatar user={m.sender} size="sm" />
                        <div>
                          <div style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{m.sender?.username || 'User'}</div>
                          <div style={{ fontSize: '.8rem' }}>{m.content}</div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // =======================
        // DEFAULT DASHBOARD
        // =======================
        <>
          <div className="stats-grid">
            {stats ? (<>
              <div className="stat-card">
                <div className="stat-card__icon" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}><i className="fa-solid fa-folder-open" /></div>
                <div className="stat-card__label">Total Projects</div>
                <div className="stat-card__value">{stats.total}</div>
                <div className="stat-card__sub">{stats.mine} owned by you</div>
              </div>
              <div className="stat-card">
                <div className="stat-card__icon" style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}><i className="fa-solid fa-users" /></div>
                <div className="stat-card__label">Joined Projects</div>
                <div className="stat-card__value">{stats.joined}</div>
                <div className="stat-card__sub">As a team member</div>
              </div>
              <div className="stat-card">
                <div className="stat-card__icon" style={{ background: 'var(--yellow-bg)', color: 'var(--yellow)' }}><i className="fa-solid fa-star" /></div>
                <div className="stat-card__label">Status</div>
                <div className="stat-card__value" style={{ fontSize: '1.1rem', marginTop: 10 }}>{user?.username || user?.email?.split('@')[0]}</div>
                <div className="stat-card__sub">{user?.email || ''}</div>
              </div>
            </>) : [0,1,2].map(i => <div key={i} className="stat-card skeleton" style={{ height: 120 }} />)}
          </div>

          <div className="content-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 className="section-title" style={{ margin: 0 }}>My Projects</h3>
                <button className="btn btn--green btn--sm" onClick={() => navigate('/app/projects')}><i className="fa-solid fa-plus" /> New</button>
              </div>
              <div id="projects-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                {projects === null ? [0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 'var(--card-radius)' }} />) :
                  projects.length === 0
                    ? <div className="empty-state" style={{ gridColumn: '1/-1' }}><i className="fa-solid fa-folder-open" /><h4>No projects yet</h4><p>Create or join a project to get started.</p></div>
                    : projects.slice(0, 6).map((p, i) => {
                        const color = CARD_COLORS[i % CARD_COLORS.length];
                        const pct = projectProgress(p.startDate, p.duration);
                        return (
                          <div key={p._id} className={`project-card project-card--${color}`} onClick={() => navigate(`/app/project/${p._id}`)} style={{ cursor: 'pointer' }}>
                            <div className="p-card__date">{fmtDate(p.startDate)}</div>
                            <div className="p-card__title">{p.title}</div>
                            <ProgressBar value={pct} style={{ '--fill': FILLS[color] }} />
                            <div className="p-card__footer">
                              <span>{daysLeft(p.startDate, p.duration)}</span>
                              <span className="badge badge--gray">{p.status}</span>
                            </div>
                          </div>
                        );
                      })
                }
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                {profile ? (
                  <>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <Avatar user={profile} size="lg" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{profile.username || profile.email?.split('@')[0]}</div>
                        <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', margin: '2px 0 10px' }}>{profile.email}</div>
                      </div>
                    </div>
                  </>
                ) : <div className="skeleton" style={{ height: 80, borderRadius: 12 }} />}
              </div>

              <div className="card">
                <h3 className="section-title">Messages</h3>
                {convs === null ? [0,1].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 10, marginBottom: 10 }} />) :
                  convs.length === 0
                    ? <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: '.85rem' }}>No messages yet</div>
                    : convs.slice(0, 4).map((c) => (
                        <div key={c.user?._id} className="inbox-row" onClick={() => navigate(`/app/messages?user=${c.user?._id}`)}>
                          <Avatar user={c.user} size="md" className="inbox-row__avatar" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="inbox-row__title">{c.user?.username || c.user?.email?.split('@')[0] || 'User'}</div>
                            <div className="inbox-row__sub">{c.latestMessage || c.lastMessage?.content || '...'}</div>
                          </div>
                        </div>
                      ))
                }
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
