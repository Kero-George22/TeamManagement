import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import { SpinnerWrap } from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../api/index.js';
import { timeAgo } from '../utils.js';

const POLL_MS = 5000;

export default function Office() {
  const { projectId } = useParams();
  const navigate      = useNavigate();
  const { user }      = useAuth();
  const toast         = useToast();
  const currentUserId = user?._id || user?.id;

  const [projects,   setProjects]   = useState([]);
  const [messages,   setMessages]   = useState([]);
  const [project,    setProject]    = useState(null);
  const [text,       setText]       = useState('');
  const [loading,    setLoading]    = useState(true);
  const [sending,    setSending]    = useState(false);
  const [members,    setMembers]    = useState([]);
  const [report,     setReport]     = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const bottomRef  = useRef(null);
  const pollRef    = useRef(null);
  const lastMsgId  = useRef(null);

  useEffect(() => {
    setAccessDenied(false);
  }, [projectId]);

  /* ── Load project list ── */
  useEffect(() => {
    api.get('/projects?limit=50').then(d => {
      const allProjects = d.projects || d || [];
      const visibleProjects = allProjects.filter((p) =>
        (p.members || []).some((m) => {
          const memberId = m.userId?._id || m.userId || m._id;
          return String(memberId) === String(currentUserId);
        })
      );

      setProjects(visibleProjects);
      if (!projectId && visibleProjects.length > 0) {
        navigate('/office/' + visibleProjects[0]._id, { replace: true });
      }
    }).catch(() => {});
  }, [projectId, navigate, user?.isAdmin, currentUserId]);

  /* ── Load office overview when projectId changes ── */
  const loadOverview = useCallback(async (silent = false) => {
    if (!projectId || accessDenied) return;
    try {
      const data = await api.get('/office/' + projectId + '/overview');
      setMembers(data.members || []);
      setReport(data.report || null);
      if (!project || project._id !== projectId) {
        const p = data.project;
        if (p) setProject({ _id: p._id, title: p.title, status: p.status });
      }
    } catch (err) {
      if (err.status === 403) {
        setAccessDenied(true);
        if (!silent) {
          toast.error('You can open Office only for projects you joined');
          if (projects.length > 0) navigate('/office/' + projects[0]._id, { replace: true });
          else navigate('/projects');
        }
        return;
      }
      if (!silent) toast.error(err.message);
    }
  }, [projectId, accessDenied, project, projects, navigate]);

  /* ── Load messages when projectId changes ── */
  const loadMessages = useCallback(async (silent = false) => {
    if (!projectId || accessDenied) return;
    if (!silent) setLoading(true);
    try {
      const msgData = await api.get('/office/' + projectId + '/messages');
      const msgs = msgData.messages || msgData || [];
      setMessages(msgs);

      const last = msgs[msgs.length - 1];
      if (last && last._id !== lastMsgId.current) {
        lastMsgId.current = last._id;
      }
    } catch (err) {
      if (err.status === 403) {
        setAccessDenied(true);
        if (!silent) toast.error('You can chat only with your project team members');
        return;
      }
      if (!silent) toast.error(err.message);
    } finally { if (!silent) setLoading(false); }
  }, [projectId, accessDenied]);

  useEffect(() => {
    loadOverview();
    loadMessages();
    pollRef.current = setInterval(() => {
      loadMessages(true);
      loadOverview(true);
    }, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [loadMessages, loadOverview]);

  useEffect(() => {
    if (projectId) {
      const proj = projects.find(p => p._id === projectId);
      setProject(proj || null);
    }
  }, [projectId, projects]);

  /* ── Auto-scroll to bottom ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  async function sendMessage() {
    const content = text.trim();
    if (!content || sending) return;
    setText('');
    setSending(true);

    // Optimistic message
    const optimistic = {
      _id: 'opt_' + Date.now(),
      content,
      sender: { _id: user?._id, username: user?.username, avatar: user?.avatar },
      isAI: false,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages(ms => [...ms, optimistic]);

    try {
      await api.post('/office/' + projectId + '/messages', { content });
      await loadMessages(true);
    } catch (err) {
      toast.error(err.message);
      setMessages(ms => ms.filter(m => m._id !== optimistic._id));
    } finally { setSending(false); }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  /* ── Render ── */
  return (
    <>
      <Nav />
      <div style={{ position:'fixed', top:'var(--nav-h)', left:0, right:0, bottom:0, display:'flex', background:'var(--bg-1)', overflow:'hidden' }}>

      {/* Sidebar: project list */}
      <div style={{ width:240, minWidth:200, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', background:'var(--bg-2)', flexShrink:0 }}>
        <div style={{ padding:'16px 16px 10px', fontFamily:'var(--font-display)', fontSize:9, letterSpacing:3, color:'var(--cyan)', borderBottom:'1px solid var(--border)' }}>
          💬 OFFICE
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
          {projects.map(p => (
            <Link key={p._id} to={'/office/' + p._id}
              style={{
                display:'block', padding:'10px 16px', textDecoration:'none',
                background: p._id === projectId ? 'var(--cyan-dim)' : 'transparent',
                borderLeft: p._id === projectId ? '2px solid var(--cyan)' : '2px solid transparent',
                transition:'all .15s',
              }}
              onMouseEnter={e => { if (p._id !== projectId) e.currentTarget.style.background='var(--bg-3)'; }}
              onMouseLeave={e => { if (p._id !== projectId) e.currentTarget.style.background='transparent'; }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:11, letterSpacing:1,
                color: p._id === projectId ? 'var(--cyan)' : 'var(--text-1)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {p.title || p.name}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Main chat pane */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* Header */}
        <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)', background:'var(--bg-card)', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
          {project ? (
            <>
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:12, letterSpacing:2 }}>{project.title || project.name}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-3)' }}>{messages.length} messages</div>
              </div>
              <div style={{ marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-3)' }}>TEAM CHAT</div>
            </>
          ) : (
            <div style={{ fontFamily:'var(--font-display)', fontSize:10, letterSpacing:3, color:'var(--text-3)' }}>
              SELECT A PROJECT
            </div>
          )}
        </div>

        {/* Messages */}
        {!projectId ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <EmptyState icon="💬" text="Select a project" sub="Choose a project from the sidebar to open the office chat" />
          </div>
        ) : loading ? (
          <div style={{ flex:1 }}><SpinnerWrap /></div>
        ) : (
          <div style={{ flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:12 }}>
            {messages.length === 0 && (
              <EmptyState icon="💬" text="No messages yet" sub="Start the team conversation" />
            )}
            {messages.map(msg => {
              const senderId = msg.sender?._id || msg.sender || msg.user;
              const isMe = !msg.isAI && String(senderId || '') === String(currentUserId || '');
              const isAI = msg.isAI || msg.type === 'ai';
              const senderAvatar = msg.sender?.avatar || msg.avatar;
              const senderName = msg.sender?.username || msg.username || 'Hero';
              const avatarIsImage = !!senderAvatar &&
                (String(senderAvatar).startsWith('data:') ||
                 String(senderAvatar).startsWith('http') ||
                 String(senderAvatar).startsWith('/'));
              return (
                <div key={msg._id}
                  style={{ display:'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap:10, alignItems:'flex-end' }}>
                  {/* Avatar */}
                  <div style={{ flexShrink:0, fontSize:18, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center',
                    background:'var(--bg-3)', borderRadius:isAI ? 0 : '50%',
                    clipPath: isAI ? 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)' : 'none',
                    border: isAI ? '1px solid var(--cyan)' : 'none', overflow:'hidden' }}>
                    {isAI
                      ? '🤖'
                      : avatarIsImage
                        ? <img src={senderAvatar} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        : (senderAvatar || '👤')}
                  </div>
                  {/* Bubble */}
                  <div style={{ maxWidth:'72%', minWidth:0 }}>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-3)', marginBottom:3,
                      textAlign: isMe ? 'right' : 'left' }}>
                      {isAI ? 'AI' : senderName} · {timeAgo(msg.createdAt)}
                    </div>
                    <div style={{
                      background: isAI ? 'var(--cyan-dim)' : isMe ? 'var(--bg-3)' : 'var(--bg-card)',
                      border: `1px solid ${isAI ? 'var(--cyan)' : isMe ? 'var(--border)' : 'var(--border)'}`,
                      padding:'10px 14px',
                      fontSize:13,
                      lineHeight:1.7,
                      color:'var(--text-1)',
                      opacity: msg.pending ? 0.6 : 1,
                      fontFamily: isAI ? 'var(--font-mono)' : 'inherit',
                      whiteSpace:'pre-wrap',
                      wordBreak:'break-word',
                      overflowWrap:'anywhere',
                      maxWidth:'100%',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} />
          </div>
        )}

        {/* Input */}
        {projectId && (
          <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border)', background:'var(--bg-card)', display:'flex', gap:10, flexShrink:0 }}>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Message your project team… (Enter to send, Shift+Enter for newline)"
              rows={1}
              style={{
                flex:1, background:'var(--bg-3)', border:'1px solid var(--border)', color:'var(--text-1)',
                padding:'10px 14px', fontFamily:'inherit', fontSize:13, resize:'none', outline:'none',
                transition:'border-color .2s', lineHeight:1.5,
              }}
              onFocus={e => e.target.style.borderColor='var(--cyan)'}
              onBlur={e  => e.target.style.borderColor='var(--border)'}
            />
            <button className="btn btn-cyan" disabled={!text.trim() || sending} onClick={sendMessage}
              style={{ alignSelf:'flex-end', flexShrink:0 }}>
              {sending ? '…' : '▶'}
            </button>
          </div>
        )}
      </div>

      {/* Right panel: members + shared report */}
      <div style={{ width:320, minWidth:260, borderLeft:'1px solid var(--border)', background:'var(--bg-2)', display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>
        <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', fontFamily:'var(--font-display)', fontSize:10, letterSpacing:2, color:'var(--cyan)' }}>
          PROJECT MEMBERS
        </div>
        <div style={{ maxHeight:'42%', overflowY:'auto', padding:'8px 10px', borderBottom:'1px solid var(--border)' }}>
          {members.length === 0 ? (
            <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-3)' }}>No members found</div>
          ) : members.map(m => {
            const isImg = m.avatar && (m.avatar.startsWith('data:') || m.avatar.startsWith('http') || m.avatar.startsWith('/'));
            return (
              <div key={m.userId || m.username} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 6px', borderBottom:'1px dashed var(--border)' }}>
                <div style={{ width:30, height:30, borderRadius:'50%', overflow:'hidden', background:'var(--bg-3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {isImg
                    ? <img src={m.avatar} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : <span style={{ fontSize:18 }}>{m.avatar || '👤'}</span>}
                </div>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:10, letterSpacing:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {m.username}
                  </div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-2)' }}>{m.roleName}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:4 }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background: m.online ? 'var(--green)' : '#6b7280', boxShadow: m.online ? '0 0 6px var(--green)' : 'none', display:'inline-block' }} />
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color: m.online ? 'var(--green)' : 'var(--text-3)' }}>{m.online ? 'ONLINE' : 'OFFLINE'}</span>
                  </div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'var(--text-3)' }}>
                    {m.lastSeen ? timeAgo(m.lastSeen) : 'never'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', fontFamily:'var(--font-display)', fontSize:10, letterSpacing:2, color:'var(--cyan)' }}>
          AI PROJECT REPORT
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'12px 12px 16px' }}>
          {!report?.status ? (
            <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-3)' }}>No report available yet</div>
          ) : (
            <>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-3)', marginBottom:8 }}>
                Generated {report.generatedAt ? timeAgo(report.generatedAt) : 'just now'}
              </div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:12, lineHeight:1.7, whiteSpace:'pre-wrap', color:'var(--text-1)', background:'var(--bg-card)', border:'1px solid var(--border)', padding:'10px 12px' }}>
                {report.status}
              </div>
            </>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
