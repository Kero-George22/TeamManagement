import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalProject } from '../contexts/ProjectContext';
import { useToast } from '../lib/toast';
import API from '../lib/api';
import Topbar from '../components/layout/Topbar';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import { fmtDate, daysLeft, projectProgress } from '../lib/utils';
import Cropper from 'react-easy-crop';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function ProfilePage() {
  const { user: authUser, updateUser } = useAuth();
  const { projects: globalProjects } = useGlobalProject();
  const toast = useToast();
  const [profile, setProfile] = useState(() => authUser);
  const [projects, setProjects] = useState(() => globalProjects || []);
  const [allTasks, setAllTasks] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [aiUsage, setAiUsage] = useState(null);
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [form, setForm] = useState({ username: '', email: '', bio: '', skills: [], socials: { whatsapp: '', facebook: '', linkedin: '', twitter: '', github: '' } });
  
  // Crop state
  const [cropFileUrl, setCropFileUrl] = useState(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

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
            skills: currentProfile.skills || [],
            socials: currentProfile.socials || { whatsapp: '', facebook: '', linkedin: '', twitter: '', github: '' },
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

        // Load AI usage
        API.ai.usage().then(setAiUsage).catch(() => {});
      } catch {
        toast.error('Failed to load profile');
      }
    })();
  }, [authUserId, globalProjects]);

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCropFileUrl(url);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setCropModalOpen(true);
    e.target.value = null;
  };

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise(resolve => (image.onload = resolve));
    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg');
    });
  };

  const handleCropSave = async () => {
    try {
      const croppedFile = await getCroppedImg(cropFileUrl, croppedAreaPixels);
      setCropModalOpen(false);
      toast.success("Uploading avatar...");
      const updated = await API.profile.uploadAvatar(croppedFile);
      const u = updated?.user || updated;
      setProfile(u);
      updateUser(u);
      toast.success("Avatar updated!");
    } catch (err) {
      toast.error(err.message || "Failed to update avatar");
    }
  };

  async function handleSaveProfile() {
    try {
      const updated = await API.profile.update({
        username: form.username,
        email: form.email,
        bio: form.bio,
        skills: form.skills,
        socials: form.socials,
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

  if (!profile) return (
    <>
      <Topbar title="My Profile" />

      {cropModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 400, padding: 24, background: 'var(--bg)' }}>
            <h3 style={{ marginBottom: 16, fontSize: '1.2rem', fontWeight: 800 }}>Position and size</h3>
            <div style={{ position: 'relative', width: '100%', height: 300, background: '#111', borderRadius: 8, overflow: 'hidden' }}>
              <Cropper
                image={cropFileUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <i className="fa-solid fa-image" style={{ fontSize: '.9rem', color: 'var(--text-muted)' }} />
              <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(e.target.value)} style={{ flex: 1, accentColor: 'var(--primary)' }} />
              <i className="fa-solid fa-image" style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn btn--outline" onClick={() => setCropModalOpen(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleCropSave}>Save Photo</button>
            </div>
          </div>
        </div>
      )}

      <div className="profile-bento" style={{ marginTop: 16 }}><div className="skeleton" style={{ height: 400, borderRadius: 'var(--card-radius)' }} /></div>
    </>);

  const inboxItems = conversations.slice(0, 3);

  return (
    <>
      {cropModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 400, padding: 24, background: 'var(--bg)' }}>
            <h3 style={{ marginBottom: 16, fontSize: '1.2rem', fontWeight: 800 }}>Position and size</h3>
            <div style={{ position: 'relative', width: '100%', height: 300, background: '#111', borderRadius: 8, overflow: 'hidden' }}>
              <Cropper
                image={cropFileUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <i className="fa-solid fa-image" style={{ fontSize: '.9rem', color: 'var(--text-muted)' }} />
              <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(e.target.value)} style={{ flex: 1, accentColor: 'var(--primary)' }} />
              <i className="fa-solid fa-image" style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn btn--outline" onClick={() => setCropModalOpen(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleCropSave}>Save Photo</button>
            </div>
          </div>
        </div>
      )}
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
              skills: profile.skills || [],
              socials: profile.socials || { whatsapp: '', facebook: '', linkedin: '', twitter: '', github: '' },
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
            <p style={{ color: 'var(--text-secondary)', fontSize: '.9rem', fontWeight: 500, marginBottom: profile.skills?.length ? 16 : 24 }}>{profile.bio || 'No bio yet'}</p>

            {profile.skills?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
                {profile.skills.map(s => (
                  <Badge key={s} variant="green" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>{s}</Badge>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
              {profile.socials?.whatsapp && <a href={profile.socials.whatsapp} target="_blank" rel="noreferrer" className="icon-btn" style={{ background: '#25D366', color: 'white' }}><i className="fa-brands fa-whatsapp" /></a>}
              {profile.socials?.facebook && <a href={profile.socials.facebook} target="_blank" rel="noreferrer" className="icon-btn" style={{ background: '#1877F2', color: 'white' }}><i className="fa-brands fa-facebook-f" /></a>}
              {profile.socials?.linkedin && <a href={profile.socials.linkedin} target="_blank" rel="noreferrer" className="icon-btn" style={{ background: '#0A66C2', color: 'white' }}><i className="fa-brands fa-linkedin-in" /></a>}
              {profile.socials?.twitter  && <a href={profile.socials.twitter} target="_blank" rel="noreferrer" className="icon-btn" style={{ background: '#1DA1F2', color: 'white' }}><i className="fa-brands fa-twitter" /></a>}
              {profile.socials?.github   && <a href={profile.socials.github} target="_blank" rel="noreferrer" className="icon-btn" style={{ background: '#333', color: 'white' }}><i className="fa-brands fa-github" /></a>}
              
              {!profile.socials?.whatsapp && !profile.socials?.facebook && !profile.socials?.linkedin && !profile.socials?.twitter && !profile.socials?.github && (
                <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>No social links added</div>
              )}
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

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <i className="fa-regular fa-circle-dot" style={{ fontSize: '.5rem', color: 'var(--text-muted)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Skills</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {form.skills.map(skill => (
                          <span key={skill} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--green-bg)', color: 'var(--green)', padding: '4px 10px', borderRadius: 100, fontSize: '.75rem', fontWeight: 600 }}>
                            {skill}
                            <button className="icon-btn" style={{ width: 16, height: 16, padding: 0, color: 'var(--green)' }} onClick={() => setForm(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }))}>
                              <i className="fa-solid fa-times" style={{ fontSize: '.6rem' }} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ paddingLeft: 22 }}>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginBottom: 6 }}>Suggestions:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {['React', 'Node.js', 'UI/UX Design', 'Project Management', 'Marketing', 'Python', 'DevOps'].filter(s => !form.skills.includes(s)).map(skill => (
                        <button key={skill} className="btn btn--outline btn--sm" style={{ padding: '2px 8px', fontSize: '.7rem', borderRadius: 100 }} onClick={() => setForm(prev => ({ ...prev, skills: [...prev.skills, skill] }))}>
                          + {skill}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 14, width: '100%' }}>
                  <i className="fa-regular fa-circle-dot" style={{ fontSize: '.5rem', color: 'var(--text-muted)', marginTop: 8 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>Social Links</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <input className="form-input" placeholder="WhatsApp (wa.me/...)" value={form.socials?.whatsapp || ''} onChange={e => setForm(f => ({ ...f, socials: { ...f.socials, whatsapp: e.target.value } }))} />
                      <input className="form-input" placeholder="Facebook Profile" value={form.socials?.facebook || ''} onChange={e => setForm(f => ({ ...f, socials: { ...f.socials, facebook: e.target.value } }))} />
                      <input className="form-input" placeholder="LinkedIn Profile" value={form.socials?.linkedin || ''} onChange={e => setForm(f => ({ ...f, socials: { ...f.socials, linkedin: e.target.value } }))} />
                      <input className="form-input" placeholder="Twitter / X" value={form.socials?.twitter || ''} onChange={e => setForm(f => ({ ...f, socials: { ...f.socials, twitter: e.target.value } }))} />
                      <input className="form-input" placeholder="GitHub Profile" value={form.socials?.github || ''} onChange={e => setForm(f => ({ ...f, socials: { ...f.socials, github: e.target.value } }))} />
                    </div>
                  </div>
                </div>
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

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn--green btn--sm" onClick={handleSaveProfile}>Save</button>
                <button className="btn btn--outline btn--sm" onClick={() => {
                  setForm({
                    username: profile.username || '',
                    email: profile.email || '',
                    bio: profile.bio || '',
                    skills: profile.skills || [],
                    socials: profile.socials || { whatsapp: '', facebook: '', linkedin: '', twitter: '', github: '' },
                  });
                }}>Reset</button>
                <button className="btn btn--outline btn--sm" onClick={() => window.location.href = '/app/profile/2fa'} style={{ border: '1px solid var(--border)' }}>
                  <i className="fa-solid fa-shield-halved" style={{ marginRight: 6 }} /> 2FA Settings
                </button>
              </div>
            </div>
          </div>

          {/* AI Credits Card */}
          {aiUsage && (() => {
            const used = aiUsage.used || 0;
            const limit = aiUsage.limit;
            const plan = aiUsage.plan || 'free';
            const isUnlimited = limit === Infinity || limit === null;
            const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
            const resetsAt = aiUsage.resetsAt ? new Date(aiUsage.resetsAt) : null;
            const daysLeftVal = resetsAt ? Math.ceil((resetsAt - new Date()) / (1000 * 60 * 60 * 24)) : 0;
            const isWarning = pct > 80;

            return (
              <div className="card" style={{ overflow: 'hidden' }}>
                {/* Header gradient bar */}
                <div style={{
                  background: isWarning
                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                    : 'linear-gradient(135deg, #16a34a 0%, #0d9488 100%)',
                  margin: '-24px -24px 20px -24px',
                  padding: '20px 24px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fa-solid fa-robot" style={{ color: '#fff', fontSize: '1rem' }} />
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>AI Credits</div>
                      <div style={{ color: 'rgba(255,255,255,.75)', fontSize: '.72rem' }}>{plan.charAt(0).toUpperCase() + plan.slice(1)} Plan</div>
                    </div>
                  </div>
                  {plan === 'free' && (
                    <button className="btn" style={{ background: '#fff', color: '#16a34a', fontWeight: 700, fontSize: '.75rem', padding: '6px 14px', borderRadius: 20, border: 'none' }}>
                      <i className="fa-solid fa-arrow-up" style={{ marginRight: 4 }} />Upgrade
                    </button>
                  )}
                </div>

                {/* Usage stats */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <span style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{used}</span>
                  <span style={{ fontSize: '.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    / {isUnlimited ? '∞' : limit} credits used
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{
                    height: '100%',
                    width: `${isUnlimited ? 0 : pct}%`,
                    background: isWarning
                      ? 'linear-gradient(to right, #ef4444, #dc2626)'
                      : 'linear-gradient(to right, #16a34a, #0d9488)',
                    borderRadius: 99,
                    transition: 'width 0.4s ease'
                  }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', color: 'var(--text-muted)' }}>
                  <span>{isUnlimited ? 'Unlimited usage' : `${pct}% used`}</span>
                  <span>{!isUnlimited && resetsAt ? `Resets in ${daysLeftVal} day${daysLeftVal !== 1 ? 's' : ''}` : ''}</span>
                </div>
              </div>
            );
          })()}
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
