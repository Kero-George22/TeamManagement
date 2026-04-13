import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../lib/toast';
import API from '../lib/api';
import Topbar from '../components/layout/Topbar';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import { daysLeft } from '../lib/utils';

const BADGE_STATUS = { Recruiting: 'green', 'In-Progress': 'blue', Completed: 'gray' };

export default function OfficePage() {
  const { id: projectId } = useParams();
  const { user: me } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const msgsEndRef = useRef();

  const [proj, setProj]       = useState(null);
  const [msgs, setMsgs]       = useState(null);
  const [input, setInput]     = useState('');
  const [aiStatus, setAiStatus] = useState(null);
  const [overview, setOverview] = useState(null);
  const [team, setTeam]         = useState(null);

  useEffect(() => {
    (async () => {
      try { const p = await API.projects.get(projectId); setProj(p); } catch { toast.error('Could not load project'); }
      loadMessages();
      loadAI();
      loadOverview();
      loadTeam();
    })();
  }, [projectId]);

  async function loadMessages() {
    try { setMsgs(await API.office.messages(projectId) || []); setTimeout(() => msgsEndRef.current?.scrollIntoView(), 100); } catch { toast.error('Failed to load messages'); }
  }

  async function loadAI() {
    try { setAiStatus(await API.office.status(projectId)); } catch { setAiStatus({ message: 'AI status unavailable' }); }
  }

  async function loadOverview() {
    try { setOverview(await API.office.overview(projectId)); } catch { setOverview(null); }
  }

  async function loadTeam() {
    try { setTeam(await API.projects.members(projectId) || []); } catch {}
  }

  async function sendMsg() {
    if (!input.trim()) return;
    const content = input.trim();
    setInput('');
    try {
      await API.office.send(projectId, content);
      setMsgs(prev => [...(prev || []), { sender: { _id: me?._id }, content, createdAt: new Date().toISOString() }]);
      setTimeout(() => msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (e) { toast.error(e.message); }
  }

  const title = proj ? `${proj.title} · Office` : 'Project Office';

  return (
    <>
      <Topbar title={title} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, flex: 1, minHeight: 0 }}>

        {/* Chat */}
        <div style={{ background: 'var(--white)', borderRadius: 'var(--card-radius)', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{title}</div>
              <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>Team communication channel</div>
            </div>
            <button className="icon-btn" onClick={loadAI} title="Refresh AI status"><i className="fa-solid fa-rotate" /></button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {msgs === null ? [0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 18, width: i % 2 ? '50%' : '75%', ...(i === 1 ? { alignSelf: 'flex-end' } : {}) }} />) :
              msgs.length === 0 ? <div className="empty-state"><i className="fa-solid fa-comments" /><h4>No messages yet</h4><p>Start the conversation!</p></div> :
              msgs.map((m, i) => {
                const isMe = (m.sender?._id || m.sender) === me?._id;
                const isAI = !!m.isAI;
                const t = new Date(m.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', ...(isMe ? { flexDirection: 'row-reverse' } : {}) }}>
                    {!isMe && !isAI && <Avatar user={m.sender} size="sm" />}
                    {isAI && <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><i className="fa-solid fa-robot" style={{ color: 'var(--green)', fontSize: '.8rem' }} /></div>}
                    <div>
                      {!isMe && <div style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }}>{isAI ? 'AI Manager' : m.sender?.username || 'User'}</div>}
                      <div style={{ maxWidth: isAI ? '90%' : '70%', padding: '10px 14px', borderRadius: 18, fontSize: '.875rem', lineHeight: 1.45,
                        ...(isAI ? { background: 'var(--green-bg)', color: '#166534' } :
                            isMe ? { background: 'var(--sidebar-bg)', color: '#fff', borderBottomRightRadius: 4 } :
                                   { background: '#f3f4f6', borderBottomLeftRadius: 4 })
                      }}>{m.content}</div>
                      <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginTop: 4, ...(isMe ? { textAlign: 'right' } : {}) }}>{t}</div>
                    </div>
                  </div>
                );
              })
            }
            <div ref={msgsEndRef} />
          </div>

          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="text" placeholder="Send a message to the team…" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMsg(); }}
              style={{ flex: 1, padding: '11px 16px', borderRadius: 99, border: '1.5px solid var(--border)', fontSize: '.875rem', background: '#f9fafb' }} />
            <button className="btn btn--primary btn--icon" onClick={sendMsg} aria-label="Send"><i className="fa-solid fa-paper-plane" /></button>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* AI Manager */}
          <div style={{ background: 'var(--sidebar-bg)', color: '#fff', borderRadius: 'var(--card-radius)', padding: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 1.5s infinite' }} />
              AI Manager
            </div>
            <p style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.5)', marginBottom: 12 }}>Monitoring your project</p>
            <div style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.8)', lineHeight: 1.55 }}>
              {aiStatus?.summary || aiStatus?.message || 'AI manager is monitoring project progress.'}
            </div>
          </div>

          {/* Overview */}
          <div className="card">
            <h3 className="section-title">Overview</h3>
            {overview ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Status</span>
                  <Badge variant={BADGE_STATUS[overview.project?.status] || 'gray'}>{overview.project?.status || '—'}</Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Tasks Done</span>
                  <span style={{ fontWeight: 600 }}>{overview.report?.taskStats?.done ?? 0} / {overview.report?.taskStats?.total ?? 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                  <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Time Left</span>
                  <span style={{ fontWeight: 600 }}>{proj ? daysLeft(proj.startDate, proj.duration) : '—'}</span>
                </div>
              </>
            ) : <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', padding: '12px 0' }}>Overview unavailable</div>}
          </div>

          {/* Team */}
          <div className="card">
            <h3 className="section-title">Team</h3>
            {(team || []).map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <Avatar user={m.user || m} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{m.user?.username || m.user?.email?.split('@')[0] || 'User'}</div>
                  <div style={{ fontSize: '.73rem', color: 'var(--text-muted)' }}>{m.roleName}</div>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
