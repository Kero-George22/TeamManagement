import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../lib/toast';
import API from '../lib/api';
import Topbar from '../components/layout/Topbar';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import { fmtDate } from '../lib/utils';

export default function ProfilePage() {
  const { user: authUser, updateUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState(null);

  useEffect(() => {
    (async () => {
      try { const r = await API.profile.me(); setProfile(r?.user || r); } catch { toast.error('Failed to load profile'); }
      try {
        const all = await API.projects.list();
        const mine = (all || []).filter(p => p.owner?._id === authUser?._id || p.owner === authUser?._id || (p.members || []).some(m => (m.userId?._id || m.userId) === authUser?._id));
        setProjects(mine);
      } catch {
        setProjects([]);
      }
    })();
  }, []);

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

  if (!profile) return <><Topbar title="My Profile" /><div className="skeleton" style={{ height: 400, borderRadius: 'var(--card-radius)' }} /></>;

  // Calendar mock data
  const calendarDays = [];
  for (let i = 1; i <= 31; i++) {
    let active = i === 12 || i === 27; // blue
    let warning = i === 5 || i === 23; // red/yellow
    let unavail = i === 8 || i === 17 || i === 20 || i === 25; // dark gray
    calendarDays.push({ day: i, active, warning, unavail });
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Topbar title="My Profile" />
        <div style={{ display: 'flex', gap: 10 }}>
          <Badge variant="gray" style={{ padding: '6px 14px', fontSize: '.85rem' }}>Pending</Badge>
          <Badge variant="gray" style={{ padding: '6px 14px', fontSize: '.85rem' }}>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</Badge>
          <button className="icon-btn"><i className="fa-regular fa-calendar-plus" /></button>
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
            <p style={{ color: 'var(--text-secondary)', fontSize: '.9rem', fontWeight: 500, marginBottom: 24 }}>{profile.bio || 'Product Designer'}</p>

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
              {[
                { label: 'Full Name', val: profile.username || '—', icon: 'fa-regular fa-circle-dot', right: <Badge variant="green" style={{ background: 'transparent', border: '1px solid var(--green)', color: 'var(--green)' }}>Online</Badge> },
                { label: 'Email Address', val: profile.email, icon: 'fa-regular fa-circle-dot', rightIcon: 'fa-regular fa-envelope' },
                { label: 'Contact Number', val: '(555) 555-5674', icon: 'fa-regular fa-circle-dot', rightIcon: 'fa-solid fa-phone' },
                { label: 'Designation', val: profile.bio || 'Product Designer', icon: 'fa-regular fa-circle-dot', rightIcon: 'fa-solid fa-circle-info' },
                { label: 'Availability', val: 'Schedule the time slot', icon: 'fa-regular fa-circle-dot', rightIcon: 'fa-regular fa-calendar-plus' },
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: idx < 4 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <i className={item.icon} style={{ fontSize: '.5rem', color: 'var(--text-muted)' }} />
                    <div>
                      <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{item.label}</div>
                      <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{item.val}</div>
                    </div>
                  </div>
                  {item.right ? item.right : <i className={item.rightIcon} style={{ color: 'var(--text-muted)' }} />}
                </div>
              ))}
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
                       <span>{p.category || 'Development'}</span>
                       <Badge variant="gray" style={{ background: 'transparent', border: '1px solid var(--border)' }}>{(i*10 + 30)}% Progress</Badge>
                     </div>
                     
                     <div className="progress" style={{ background: 'rgba(0,0,0,.05)', marginBottom: 16 }}>
                       <div className="progress__fill" style={{ width: `${(i*10 + 30)}%`, background: `var(--${col === 'yellow' ? 'orange' : col === 'blue' ? 'blue' : 'pink'})` }} />
                     </div>

                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div style={{ display: 'flex', marginLeft: 10 }}>
                         <div className="avatar-placeholder" style={{ width: 24, height: 24, fontSize: '.6rem', marginLeft: -10, border: '2px solid rgba(255,255,255,.08)' }}>JD</div>
                         <div className="avatar-placeholder" style={{ width: 24, height: 24, fontSize: '.6rem', marginLeft: -10, border: '2px solid rgba(255,255,255,.08)' }}>AM</div>
                         <button className="icon-btn" style={{ width: 24, height: 24, marginLeft: -10, border: '2px solid rgba(255,255,255,.08)', background: 'var(--white)', fontSize: '.6rem' }}><i className="fa-solid fa-plus"/></button>
                       </div>
                       <Badge variant="gray" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{p.duration} Days Left</Badge>
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
                <button className="icon-btn" style={{ width: 32, height: 32, background: 'transparent', border: '1px solid var(--border)', boxShadow: 'none' }}><i className="fa-solid fa-arrow-left" /></button>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{new Date().toLocaleString('default', { month: 'long' })}</h4>
                <button className="icon-btn" style={{ width: 32, height: 32, background: 'transparent', border: '1px solid var(--border)', boxShadow: 'none' }}><i className="fa-solid fa-arrow-right" /></button>
              </div>
              <div className="calendar-widget">
                {[1,2,3,4].map(n => <div key={'prev'+n} className="calendar-widget__day calendar-widget__day--dim">{27+n}</div>)}
                {calendarDays.map(c => (
                  <div key={c.day} className={`calendar-widget__day ${c.active ? 'calendar-widget__day--active' : c.warning ? 'badge--red' : c.unavail ? 'badge--gray' : ''}`} style={c.unavail ? { background: '#4b5563', color: '#fff' } : c.warning ? { background: '#f87171', color: '#fff' } : {}}>
                    {c.day}
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
                
                <div style={{ display: 'flex', gap: 12, border: '1px solid var(--border)', borderRadius: 16, padding: 14 }}>
                  <div className="avatar-placeholder" style={{ width: 36, height: 36, flexShrink: 0 }}>RB</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '.85rem', fontWeight: 800 }}>Web Designing</span>
                      <i className="fa-solid fa-thumbtack" style={{ fontSize: '.7rem', color: 'var(--text-muted)' }} />
                    </div>
                    <p style={{ fontSize: '.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>Hey tell me about progress of project? Waiting for your response</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, background: 'var(--sidebar-bg)', color: 'var(--white)', borderRadius: 16, padding: 14 }}>
                  <div className="avatar-placeholder" style={{ width: 36, height: 36, flexShrink: 0, background: 'var(--yellow)', color: '#000' }}>ST</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '.85rem', fontWeight: 800 }}>Stephanie</span>
                      <i className="fa-solid fa-thumbtack" style={{ fontSize: '.7rem' }} />
                    </div>
                    <p style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.7)', margin: 0, lineHeight: 1.4 }}>I got your first assignment. It was quite good 👌</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, border: '1px solid var(--border)', borderRadius: 16, padding: 14 }}>
                  <div className="avatar-placeholder" style={{ width: 36, height: 36, flexShrink: 0 }}>WM</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '.85rem', fontWeight: 800 }}>William</span>
                      <i className="fa-solid fa-thumbtack" style={{ fontSize: '.7rem', color: 'var(--text-muted)' }} />
                    </div>
                    <p style={{ fontSize: '.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>I want some changes in previous work you sent me. Waiting for your reply.</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
