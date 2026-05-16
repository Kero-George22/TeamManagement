import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalProject } from '../contexts/ProjectContext';
import { useToast } from '../lib/toast';
import API from '../lib/api';
import Topbar from '../components/layout/Topbar';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import { fmtDate, daysLeft, projectProgress } from '../lib/utils';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function ProfilePage() {
  const { user: authUser, updateUser } = useAuth();
  const { projects: globalProjects } = useGlobalProject();
  const toast = useToast();
  const [profile, setProfile] = useState(() => authUser);
  const [projects, setProjects] = useState(() => globalProjects || []);
  const [allTasks, setAllTasks] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [form, setForm] = useState({ username: '', email: '', bio: '' });
  const authUserId = authUser?._id || authUser?.id;

  useEffect(() => {
    if (!authUserId) return;
    (async () => {
      try {
        const [profileRes, taskOverview, dmConversations] = await Promise.all([
          API.profile.me(),
          API.tasks.dashboardOverview(),
          API.dms.conversations(),
        ]);

        const currentProfile = profileRes?.user || profileRes;
        if (currentProfile) {
          setProfile(currentProfile);
          setForm({
            username: currentProfile.username || '',
            email: currentProfile.email || '',
            bio: currentProfile.bio || '',
          });
        }

        const mine = (globalProjects || []).filter(p =>
          p.owner?._id === authUserId ||
          p.owner === authUserId ||
          (p.members || []).some(m => (m.userId?._id || m.userId) === authUserId)
        );
        setProjects(mine);
        setAllTasks(taskOverview?.tasks || []);
        setConversations(dmConversations?.conversations || dmConversations || []);
      } catch {
        toast.error('Failed to load profile');
      }
    })();
  }, [authUserId, globalProjects]);

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      try {
        const updated = await API.profile.update({ avatar: base64 });
        const u = updated?.user || updated;
        setProfile(u);
        updateUser(u);
        toast.success("Avatar updated!");
      } catch (err) {
        toast.error("Failed to update avatar");
      }
    };
    reader.readAsDataURL(file);
  };

  async function handleSaveProfile() {
    try {
      const updated = await API.profile.update({
        username: form.username,
        email: form.email,
        bio: form.bio,
      });
      const normalized = updated?.user || updated;
      setProfile(normalized);
      updateUser(normalized);
      if (updated?.emailVerificationRequired) {
        toast.success('Profile updated. Verify your new email to complete the change.');
      } else {
        toast.success('Profile updated');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    }
  }

  const calendarCells = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const map = new Map();

    allTasks.forEach(task => {
      if (!task.deadline) return;
      const key = new Date(task.deadline).toDateString();
      map.set(key, (map.get(key) || 0) + 1);
    });

    const cells = [];
    for (let x = firstDayIndex; x > 0; x--) {
      const d = new Date(year, month - 1, daysInPrevMonth - x + 1);
      cells.push({ day: d.getDate(), current: false, count: map.get(d.toDateString()) || 0, dateStr: d.toDateString() });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      cells.push({ day, current: true, count: map.get(d.toDateString()) || 0, dateStr: d.toDateString() });
    }

    while (cells.length < 42) {
      const day = cells.length - (firstDayIndex + daysInMonth) + 1;
      const d = new Date(year, month + 1, day);
      cells.push({ day, current: false, count: map.get(d.toDateString()) || 0, dateStr: d.toDateString() });
    }

    return cells;
  }, [calendarDate, allTasks]);

  if (!profile) return <><Topbar title="My Profile" /><div className="skeleton" style={{ height: 400, borderRadius: 'var(--card-radius)' }} /></>;

  const inboxItems = conversations.slice(0, 3);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Topbar title="My Profile" />
        <div style={{ display: 'flex', gap: 10 }}>
          <Badge variant="gray" style={{ padding: '6px 14px', fontSize: '.85rem' }}>{allTasks.filter(task => task.status !== 'Done' && task.status !== 'Approved').length} Open Tasks</Badge>
          <Badge variant="gray" style={{ padding: '6px 14px', fontSize: '.85rem' }}>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</Badge>
          <button className="icon-btn" onClick={() => {
            setForm({
              username: profile.username || '',
              email: profile.email || '',
              bio: profile.bio || '',
            });
          }}><i className="fa-solid fa-pen" /></button>
        </div>
      </div>

      <div className="profile-bento">
        {/* ================= LEFT COLUMN ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Main Profile Card */}
          <div className="card" style={{ padding: 32, textAlign: 'center', position: 'relative' }}>
            <button style={{ position: 'absolute', top: 20, right: 20 }} className="icon-btn" onClick={() => {}}><i className="fa-solid fa-ellipsis-vertical" /></button>
            
            <div className="avatar-upload-wrapper" style={{ marginBottom: 16 }}>
              <Avatar user={profile} size="xl" />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} />
              <div className="avatar-upload-overlay"><i className="fa-solid fa-camera" /></div>
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{profile.username || profile.email.split('@')[0]}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '.9rem', fontWeight: 500, marginBottom: 24 }}>{profile.bio || 'No bio yet'}</p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
              <button className="icon-btn" style={{ background: 'var(--sidebar-bg)', color: 'var(--white)' }}><i className="fa-regular fa-envelope" /></button>
              <button className="icon-btn"><i className="fa-solid fa-phone" /></button>
              <button className="icon-btn"><i className="fa-brands fa-whatsapp" /></button>
              <button className="icon-btn"><i className="fa-solid fa-video" /></button>
            </div>

            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '.8rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>Time Slots</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Badge variant="gray" style={{ background: 'var(--white)', border: '1px solid var(--border)', fontSize: '.85rem', padding: '6px 12px' }}>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</Badge>
                  <button className="icon-btn" style={{ width: 34, height: 34 }}><i className="fa-regular fa-calendar" /></button>
                </div>
                <Badge variant="gray" style={{ background: 'var(--white)', border: '1px solid var(--border)', fontSize: '.85rem', padding: '6px 12px' }}>
                  Meetings <span style={{ background: 'var(--sidebar-bg)', color: 'var(--white)', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: 6, fontSize: '.7rem' }}>3</span>
                </Badge>
              </div>
            </div>
          </div>

          {/* Detailed Information */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 20 }}>Detailed Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <i className="fa-regular fa-circle-dot" style={{ fontSize: '.5rem', color: 'var(--text-muted)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Full Name</div>
                    <input
                      className="form-input"
                      value={form.username}
                      onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Full name"
                    />
                  </div>
                </div>
                <Badge variant="green" style={{ background: 'transparent', border: '1px solid var(--green)', color: 'var(--green)' }}>Online</Badge>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
                  <i className="fa-regular fa-circle-dot" style={{ fontSize: '.5rem', color: 'var(--text-muted)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Email Address</div>
                    <input
                      className="form-input"
                      type="email"
                      value={form.email}
                      onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Email address"
                    />
                    {profile.pendingEmail ? (
                      <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        Pending verification: {profile.pendingEmail}
                      </div>
                    ) : null}
                  </div>
                </div>
                <i className="fa-regular fa-envelope" style={{ color: 'var(--text-muted)' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
                  <i className="fa-regular fa-circle-dot" style={{ fontSize: '.5rem', color: 'var(--text-muted)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Bio</div>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={form.bio}
                      onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Bio"
                    />
                  </div>
                </div>
                <i className="fa-solid fa-circle-info" style={{ color: 'var(--text-muted)' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <i className="fa-regular fa-circle-dot" style={{ fontSize: '.5rem', color: 'var(--text-muted)' }} />
                  <div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Projects</div>
                    <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{projects?.length || 0} active</div>
                  </div>
                </div>
                <i className="fa-regular fa-folder-open" style={{ color: 'var(--text-muted)' }} />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn btn--green btn--sm" onClick={handleSaveProfile}>Save</button>
                <button className="btn btn--outline btn--sm" onClick={() => {
                  setForm({
                    username: profile.username || '',
                    email: profile.email || '',
                    bio: profile.bio || '',
                  });
                }}>Reset</button>
              </div>
            </div>
          </div>
        </div>


        {/* ================= RIGHT COLUMN ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

          {/* Ongoing Projects (Horizontal Scroll) */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ background: 'var(--sidebar-bg)', color: 'var(--white)', padding: '8px 16px', borderRadius: 99, fontSize: '.9rem', fontWeight: 600 }}>Ongoing Projects</span>
                <button className="icon-btn" style={{ width: 36, height: 36 }}><i className="fa-solid fa-chevron-down" /></button>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="icon-btn" style={{ width: 36, height: 36 }}><i className="fa-solid fa-plus" /></button>
                <button className="icon-btn" style={{ width: 36, height: 36 }}><i className="fa-solid fa-filter" /></button>
                <button className="icon-btn" style={{ width: 36, height: 36 }}><i className="fa-solid fa-heart" /></button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 10 }}>
              {projects === null ? <div className="skeleton" style={{ height: 160, width: '100%', borderRadius: 20 }} /> :
               projects.length === 0 ? <div className="empty-state" style={{ width: '100%' }}>No projects.</div> :
               projects.map((p, i) => {
                 const colors = ['yellow', 'blue', 'pink', 'green', 'purple'];
                 const col = colors[i % colors.length];
                 return (
                   <div key={p._id} className={`project-card project-card--${col}`} style={{ minWidth: 260 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                       <Badge variant="gray" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{fmtDate(p.startDate)}</Badge>
                       <button className="icon-btn" style={{ width: 28, height: 28, background: 'transparent', boxShadow: 'none', border: '1px solid var(--border)' }}><i className="fa-solid fa-ellipsis-vertical" /></button>
                     </div>
                     <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 16 }}>{p.title}</h4>
                     
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                       <span>{p.status || 'In-Progress'}</span>
                       <Badge variant="gray" style={{ background: 'transparent', border: '1px solid var(--border)' }}>{projectProgress(p.startDate, p.duration)}% Progress</Badge>
                     </div>
                     
                     <div className="progress" style={{ background: 'rgba(0,0,0,.05)', marginBottom: 16 }}>
                       <div className="progress__fill" style={{ width: `${projectProgress(p.startDate, p.duration)}%`, background: `var(--${col === 'yellow' ? 'orange' : col === 'blue' ? 'blue' : 'pink'})` }} />
                     </div>

                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div style={{ display: 'flex', marginLeft: 10 }}>
                         <div className="avatar-placeholder" style={{ width: 24, height: 24, fontSize: '.6rem', marginLeft: -10, border: '2px solid rgba(255,255,255,.08)' }}>JD</div>
                         <div className="avatar-placeholder" style={{ width: 24, height: 24, fontSize: '.6rem', marginLeft: -10, border: '2px solid rgba(255,255,255,.08)' }}>AM</div>
                         <button className="icon-btn" style={{ width: 24, height: 24, marginLeft: -10, border: '2px solid rgba(255,255,255,.08)', background: 'var(--white)', fontSize: '.6rem' }}><i className="fa-solid fa-plus"/></button>
                       </div>
                       <Badge variant="gray" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{daysLeft(p.startDate, p.duration)}</Badge>
                     </div>
                   </div>
                 );
               })
              }
            </div>
          </div>

          {/* Bottom Split */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Calendar */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>Calendar <i className="fa-regular fa-calendar-days" style={{ color: 'var(--text-muted)' }} /></span>
                <button className="icon-btn" style={{ width: 32, height: 32 }}><i className="fa-solid fa-ellipsis-vertical" /></button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <button className="icon-btn" style={{ width: 32, height: 32, background: 'transparent', border: '1px solid var(--border)', boxShadow: 'none' }} onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}><i className="fa-solid fa-arrow-left" /></button>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{calendarDate.toLocaleString('default', { month: 'long' })}</h4>
                <button className="icon-btn" style={{ width: 32, height: 32, background: 'transparent', border: '1px solid var(--border)', boxShadow: 'none' }} onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}><i className="fa-solid fa-arrow-right" /></button>
              </div>
              <div className="calendar-widget">
                {WEEKDAYS.map(day => (
                  <div key={day} style={{ textAlign: 'center', fontSize: '.66rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    {day}
                  </div>
                ))}
                {calendarCells.map((c, index) => (
                  <div
                    key={`${c.day}-${index}`}
                    className={`calendar-widget__day ${!c.current ? 'calendar-widget__day--dim' : c.count > 0 ? 'calendar-widget__day--active' : ''}`}
                    title={c.count > 0 ? `${c.count} task deadline${c.count > 1 ? 's' : ''}` : ''}
                    style={{
                      border: c.dateStr === new Date().toDateString() ? '1px solid var(--green)' : '1px solid transparent',
                      position: 'relative',
                    }}
                  >
                    {c.day}
                    {c.count > 0 && (
                      <span style={{ position: 'absolute', bottom: 5, width: 5, height: 5, borderRadius: '50%', background: c.current ? 'rgba(255,255,255,.9)' : 'var(--green)' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Inbox */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>Inbox <i className="fa-regular fa-comment-dots" style={{ color: 'var(--text-muted)' }} /></span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {inboxItems.length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px 0' }}>
                    <h4>No conversations yet</h4>
                    <p>Recent messages will appear here.</p>
                  </div>
                ) : (
                  inboxItems.map((item, index) => (
                    <div key={item.user?._id || index} style={{ display: 'flex', gap: 12, border: '1px solid var(--border)', borderRadius: 16, padding: 14 }}>
                      <Avatar user={item.user} size="md" />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '.85rem', fontWeight: 800 }}>{item.user?.username || item.user?.email?.split('@')[0] || 'User'}</span>
                          {item.unreadCount > 0 ? (
                            <Badge variant="blue" style={{ padding: '2px 8px', fontSize: '.68rem' }}>{item.unreadCount} new</Badge>
                          ) : null}
                        </div>
                        <p style={{ fontSize: '.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{item.latestMessage || 'No messages yet.'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
