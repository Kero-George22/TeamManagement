import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../lib/toast';
import API from '../lib/api';
import Topbar from '../components/layout/Topbar';
import Avatar from '../components/ui/Avatar';

function getUserId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return String(value._id || value.id || '');
}

export default function MessagesPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const myId = getUserId(me);

  const [convs, setConvs]   = useState(null);
  const [activeId, setActiveId] = useState(params.get('user'));
  const [activeUser, setActiveUser] = useState(null);
  const [msgs, setMsgs]     = useState(null);
  const [input, setInput]   = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const msgsEndRef = useRef();
  const searchTimer = useRef();

  useEffect(() => { loadConversations(); }, []);

  useEffect(() => { if (activeId) loadMessages(activeId); }, [activeId]);

  useEffect(() => {
    const handleNewMessage = (e) => {
      const msg = e.detail;
      const senderId = getUserId(msg.sender);
      
      setConvs(prev => {
        if (!prev) return prev;
        const exist = prev.find(c => getUserId(c.user) === senderId);
        const next = exist ? prev.filter(c => getUserId(c.user) !== senderId) : [...prev];
        const updatedConv = exist ? { ...exist, lastMessage: msg } : { user: msg.sender, lastMessage: msg };
        return [updatedConv, ...next];
      });

      if (activeId === senderId) {
        setMsgs(prev => {
          if (prev && prev.some(m => m._id === msg._id)) return prev;
          return [...(prev || []), msg];
        });
        setTimeout(() => msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    };

    window.addEventListener('dm:message', handleNewMessage);
    return () => window.removeEventListener('dm:message', handleNewMessage);
  }, [activeId]);

  async function loadConversations() {
    try {
      const c = await API.dms.conversations();
      const visibleConvs = (c || []).filter(conv => getUserId(conv.user) !== myId);
      setConvs(visibleConvs);
      
      // If we loaded the page with a ?user= ID but don't have the user details yet
      if (activeId && !activeUser) {
        const exist = visibleConvs.find(conv => getUserId(conv.user) === activeId);
        if (exist) {
          setActiveUser(exist.user);
        } else {
          try {
            const u = await API.profile.user(activeId);
            if (u) setActiveUser(u);
          } catch {
            // fallback if user not found
            setActiveUser({ _id: activeId });
          }
        }
      }
    } catch { toast.error('Failed to load conversations'); }
  }

  async function openChat(userId, userObj) {
    const nextUserId = getUserId(userId);
    if (!nextUserId || nextUserId === myId) {
      toast.error('You cannot message yourself');
      return;
    }
    setActiveId(nextUserId);
    setActiveUser(userObj);
  }

  async function loadMessages(userId) {
    if (getUserId(userId) === myId) {
      setActiveId(null);
      setActiveUser(null);
      setMsgs([]);
      toast.error('You cannot message yourself');
      return;
    }
    try {
      const m = await API.dms.messages(userId);
      setMsgs(m || []);
      setTimeout(() => msgsEndRef.current?.scrollIntoView(), 100);
    } catch { toast.error('Failed to load messages'); }
  }

  async function sendMsg() {
    if (!input.trim() || !activeId) return;
    if (activeId === myId) {
      toast.error('You cannot message yourself');
      return;
    }
    const content = input.trim();
    setInput('');
    try {
      const res = await API.dms.send(activeId, content);
      const newMsg = res || { _id: Date.now().toString(), sender: { _id: myId }, content, createdAt: new Date().toISOString() };

      setMsgs(prev => [...(prev || []), newMsg]);
      setConvs(prev => {
        if (!prev) return prev;
        const exist = prev.find(c => getUserId(c.user) === activeId);
        const next = exist ? prev.filter(c => getUserId(c.user) !== activeId) : [...prev];
        const updatedConv = exist ? { ...exist, lastMessage: newMsg } : { user: activeUser, lastMessage: newMsg };
        return [updatedConv, ...next];
      });
      setTimeout(() => msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (e) { toast.error(e.message); }
  }

  function handleSearch(q) {
    setSearchQ(q);
    clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults(null); return; }
    searchTimer.current = setTimeout(async () => {
      try { setSearchResults(await API.dms.search(q) || []); } catch { setSearchResults([]); }
    }, 400);
  }

  return (
    <>
      <Topbar title="Messages" />
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, flex: 1, minHeight: 0 }}>

        {/* Left: conversations */}
        <div style={{ background: 'var(--white)', borderRadius: 'var(--card-radius)', padding: 16, boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
          <h3 className="section-title" style={{ margin: 0 }}>Messages</h3>
          <div style={{ position: 'relative' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '.8rem' }} />
            <input type="text" placeholder="Search users…" value={searchQ} onChange={e => handleSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: '.85rem', background: 'var(--white)', color: 'var(--text-primary)' }} />
          </div>

          {searchResults ? (
            searchResults.length ? searchResults.map(u => (
              <div key={u._id} className="inbox-row" onClick={() => { openChat(u._id, u); setSearchQ(''); setSearchResults(null); }}>
                <Avatar user={u} size="md" className="inbox-row__avatar" />
                <div><div className="inbox-row__title">{u.username || u.email?.split('@')[0]}</div><div className="inbox-row__sub">{u.email}</div></div>
              </div>
            )) : <div style={{ textAlign: 'center', padding: 8, color: 'var(--text-muted)', fontSize: '.8rem' }}>No users found</div>
          ) : (
            convs === null ? [0,1].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 12, marginTop: 6 }} />) :
            convs.length === 0 ? <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: '.85rem' }}>No conversations yet</div> :
            convs.map(c => (
              <div key={getUserId(c.user)} className={`inbox-row ${getUserId(c.user) === activeId ? 'active' : ''}`} onClick={() => openChat(getUserId(c.user), c.user)}>
                <Avatar user={c.user} size="md" className="inbox-row__avatar" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="inbox-row__title">{c.user?.username || c.user?.email?.split('@')[0] || 'User'}</div>
                  <div className="inbox-row__sub">{c.lastMessage?.content || c.latestMessage || '…'}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right: chat */}
        <div style={{ background: 'var(--white)', borderRadius: 'var(--card-radius)', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!activeId ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 12 }}>
              <i className="fa-regular fa-comment-dots" style={{ fontSize: '3rem', opacity: .25 }} />
              <p style={{ fontSize: '.9rem' }}>Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar user={activeUser} size="md" />
                <div>
                  <div style={{ fontWeight: 700 }}>{activeUser?.username || activeUser?.email?.split('@')[0] || 'User'}</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--green)' }}>Active</div>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {msgs === null ? <div className="skeleton" style={{ height: 48, borderRadius: 18, width: '60%' }} /> :
                  msgs.length === 0 ? <div className="empty-state"><i className="fa-regular fa-comment" /><p>No messages yet. Say hello!</p></div> :
                  msgs.map((m, i) => {
                    const mSenderId = getUserId(m.sender);
                    const isMe = mSenderId === myId;
                    const t = new Date(m.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '65%',
                          padding: '10px 14px',
                          borderRadius: 18,
                          fontSize: '.875rem',
                          lineHeight: 1.5,
                          wordBreak: 'break-word',
                          ...(isMe
                            ? { background: 'var(--green)', color: '#fff', borderBottomRightRadius: 4 }
                            : { background: 'var(--white)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderBottomLeftRadius: 4 })
                        }}>{m.content}</div>
                        <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginTop: 3 }}>{t}</div>
                      </div>
                    );
                  })
                }
                <div ref={msgsEndRef} />
              </div>
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="text" placeholder="Type a message…" value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendMsg(); }}
                  style={{ flex: 1, padding: '11px 16px', borderRadius: 99, border: '1.5px solid var(--border)', fontSize: '.875rem', background: 'var(--white)', color: 'var(--text-primary)' }} />
                <button className="btn btn--green btn--icon" onClick={sendMsg} aria-label="Send"><i className="fa-solid fa-paper-plane" /></button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
