import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { useToast } from '../lib/toast';

export default function NotificationBell() {
  const navigate = useNavigate();
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  const loadData = async () => {
    try {
      const [notifs, countRes] = await Promise.all([
        API.notifications.list(),
        API.notifications.unreadCount(),
      ]);
      setNotifications(notifs?.notifications || []);
      setUnreadCount(countRes?.count || 0);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [open]);

  async function handleMarkRead(id) {
    try {
      await API.notifications.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch {}
  }

  async function handleMarkAllRead() {
    try {
      await API.notifications.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch {}
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    try {
      await API.notifications.remove(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (!notifications.find(n => n._id === id)?.read) {
        setUnreadCount(c => Math.max(0, c - 1));
      }
    } catch {}
  }

  function handleNotificationClick(notif) {
    setOpen(false);
    handleMarkRead(notif._id);
    if (notif.type.startsWith('task_') || notif.type === 'comment_added' || notif.type === 'mention' || notif.type === 'deadline_reminder' || notif.type === 'overdue_alert') {
      if (notif.project && notif.task) {
        navigate(`/app/project/${typeof notif.project === 'object' ? notif.project._id : notif.project}?task=${typeof notif.task === 'object' ? notif.task._id : notif.task}`);
      } else if (notif.task) {
        navigate(`/app/task/${typeof notif.task === 'object' ? notif.task._id : notif.task}`);
      }
    } else if (notif.type === 'dm') {
      navigate(`/app/messages`);
    } else if (notif.type === 'join_request' || notif.type === 'join_request_accepted' || notif.type === 'join_request_rejected') {
      navigate(`/app/project/${typeof notif.project === 'object' ? notif.project._id : notif.project}?tab=team`);
    } else if (notif.project) {
      navigate(`/app/project/${typeof notif.project === 'object' ? notif.project._id : notif.project}`);
    }
  }

  const typeIcons = {
    task_assigned: 'fa-user-plus',
    task_status_changed: 'fa-arrows-rotate',
    comment_added: 'fa-comment',
    mention: 'fa-at',
    deadline_reminder: 'fa-clock',
    overdue_alert: 'fa-triangle-exclamation',
    task_approved: 'fa-circle-check',
    join_request: 'fa-right-to-bracket',
    join_request_accepted: 'fa-check',
    join_request_rejected: 'fa-xmark',
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        className="icon-btn"
        onClick={() => setOpen(!open)}
        style={{ position: 'relative' }}
        aria-label="Notifications"
      >
        <i className="fa-regular fa-bell" />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            background: '#ef4444', color: '#fff', fontSize: '.6rem',
            fontWeight: 700, borderRadius: '50%', width: 18, height: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'fixed', top: 60, right: 16, zIndex: 99999,
          background: 'var(--white)', border: '1px solid var(--border)',
          borderRadius: 16, width: 380, maxHeight: '80vh', overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,.2)', display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Notifications</h3>
            {unreadCount > 0 && (
              <button className="btn btn--ghost btn--sm" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-spinner fa-spin" /> Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <i className="fa-regular fa-bell" style={{ fontSize: '2rem', marginBottom: 12, display: 'block' }} />
                No notifications yet
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    padding: '14px 20px', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', display: 'flex', gap: 12,
                    background: notif.read ? 'transparent' : 'var(--bg)',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = notif.read ? 'transparent' : 'var(--bg)'}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: notif.read ? 'var(--border)' : 'var(--green-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: notif.read ? 'var(--text-muted)' : 'var(--green)',
                  }}>
                    <i className={`fa-solid ${typeIcons[notif.type] || 'fa-bell'}`} style={{ fontSize: '.85rem' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: notif.read ? 500 : 700, fontSize: '.85rem', marginBottom: 4 }}>
                      {notif.title}
                    </div>
                    <div style={{ fontSize: '.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {notif.message}
                    </div>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button
                    className="icon-btn"
                    onClick={(e) => handleDelete(notif._id, e)}
                    style={{ flexShrink: 0, width: 28, height: 28, opacity: 0.5 }}
                  >
                    <i className="fa-solid fa-xmark" style={{ fontSize: '.75rem' }} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
