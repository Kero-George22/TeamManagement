import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { SpinnerWrap } from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../api/index.js';
import { levelColor, levelPct } from '../utils.js';

const SKILL_AREAS = ['frontend','backend','devops','mobile','machine-learning'];
const AVATARS = ['👨‍💻','👩‍💻','🧙‍♂️','🧙‍♀️','🕵️','🚀','⚔️','🐉','🦊','🤖','🎮','🌟','💎','🔥','⚡'];

function isImageUrl(str) {
  return str && (str.startsWith('data:') || str.startsWith('http') || str.startsWith('/'));
}

function AvatarImg({ src, size = 80, style = {} }) {
  if (isImageUrl(src)) {
    return (
      <img
        src={src}
        alt="avatar"
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: 'inherit', display: 'block', ...style }}
      />
    );
  }
  return <span style={{ fontSize: size * 0.52, lineHeight: 1 }}>{src || '👤'}</span>;
}

async function resizeToBase64(file, maxPx = 220) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const w = Math.round(img.width  * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Invalid image')); };
    img.src = url;
  });
}

export default function Profile() {
  const { userId }  = useParams();
  const navigate    = useNavigate();
  const { user, updateUser } = useAuth();
  const toast       = useToast();
  const currentUserId = user?._id || user?.id;

  const isOwn       = !userId || userId === currentUserId;
  const targetId    = userId || currentUserId;

  const [profile,   setProfile]   = useState(null);
  const [stats,     setStats]     = useState(null);
  const [rank,      setRank]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState(false);
  const [form,      setForm]      = useState({ username:'', bio:'' });
  const [pwForm,    setPwForm]    = useState({ current:'', next:'', confirm:'' });
  const [showPw,    setShowPw]    = useState(false);
  const [showAvatar,setShowAvatar]= useState(false);
  const [submitting,setSubmitting]= useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const uploadRef  = useRef(null);

  const load = useCallback(async () => {
    if (!isOwn && !targetId) return;
    if (isOwn && !currentUserId) return;

    setLoading(true);
    try {
      const rankTargetId = isOwn ? currentUserId : targetId;
      const [prof, statsData, rankData] = await Promise.all([
        isOwn ? api.get('/profile/me') : api.get('/profile/' + targetId),
        isOwn ? api.get('/profile/me/stats') : null,
        rankTargetId ? api.get('/profile/' + rankTargetId + '/rank').catch(() => null) : null,
      ]);
      const p = prof.user || prof;
      setProfile(p);
      if (statsData) setStats(statsData.stats || statsData);
      if (rankData)  setRank(rankData.rank !== undefined ? rankData.rank : rankData);
      if (isOwn) setForm({ username: p.username || '', bio: p.bio || '' });
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  }, [targetId, isOwn, currentUserId]);

  useEffect(() => { load(); }, [load]);

  async function saveProfile() {
    setSubmitting(true);
    try {
      const data = await api.put('/profile/me', form);
      updateUser(data.user || data);
      toast.success('Profile updated!');
      setEditing(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally { setSubmitting(false); }
  }

  async function changeAvatar(emoji) {
    try {
      const data = await api.put('/profile/me', { avatar: emoji });
      updateUser(data.user || data);
      setShowAvatar(false);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function uploadPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file');
    if (file.size > 8 * 1024 * 1024) return toast.error('Image must be under 8 MB');
    try {
      const b64 = await resizeToBase64(file);
      const data = await api.put('/profile/me', { avatar: b64 });
      updateUser(data.user || data);
      setShowAvatar(false);
      toast.success('Photo updated!');
      load();
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      e.target.value = '';
    }
  }

  async function changePassword() {
    if (pwForm.next !== pwForm.confirm) return toast.error('Passwords do not match');
    if (pwForm.next.length < 8) return toast.error('Password too short (min 8)');
    setSubmitting(true);
    try {
      await api.post('/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      toast.success('Password changed!');
      setPwForm({ current:'', next:'', confirm:'' });
      setShowPw(false);
    } catch (err) {
      toast.error(err.message);
    } finally { setSubmitting(false); }
  }

  if (loading) return <Layout><SpinnerWrap /></Layout>;
  if (!profile) return <Layout><EmptyState icon="🔍" text="Profile not found" /></Layout>;

  const p        = profile;
  const level    = p.level || 1;
  const xp       = p.totalXP || p.xp || 0;
  const pct      = levelPct(level, xp);
  const lvlClr   = levelColor(level);
  const skills   = p.skills || [];

  return (
    <Layout>
      {/* Hero section */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', padding:'32px', marginBottom:24, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,var(--cyan),var(--purple),var(--gold))' }} />
        <div style={{ display:'flex', alignItems:'flex-start', gap:24, flexWrap:'wrap' }}>

          {/* Avatar */}
          <div style={{ position:'relative', cursor: isOwn ? 'pointer' : 'default' }}
            onClick={() => isOwn && setShowAvatar(s => !s)}>
            <div className="hex-avatar" style={{ fontSize:42, width:80, height:80, border:`2px solid ${lvlClr}`, background:'var(--bg-3)', display:'flex', alignItems:'center', justifyContent:'center', clipPath:'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)', overflow:'hidden' }}>
              <AvatarImg src={p.avatar} size={80} />
            </div>
            {isOwn && (
              <div style={{ position:'absolute', bottom:0, right:0, background:'var(--cyan)', color:'#000', fontSize:10, padding:'2px 4px', fontFamily:'var(--font-mono)' }}>EDIT</div>
            )}
            {/* Avatar picker */}
            {showAvatar && (
              <div style={{ position:'absolute', top:'100%', left:0, background:'var(--bg-card)', border:'1px solid var(--border-hi)', padding:12, zIndex:100, width:240, boxShadow:'0 8px 32px rgba(0,0,0,0.6)' }}
                onClick={e => e.stopPropagation()}>
                {/* Upload from computer */}
                <button
                  className="btn btn-cyan btn-sm btn-full"
                  style={{ marginBottom:10 }}
                  onClick={() => uploadRef.current?.click()}>
                  📷 Upload Photo
                </button>
                <input
                  ref={uploadRef}
                  type="file"
                  accept="image/*"
                  style={{ display:'none' }}
                  onChange={uploadPhoto}
                />
                <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:'var(--font-mono)', marginBottom:6, letterSpacing:1 }}>— OR PICK EMOJI —</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {AVATARS.map(a => (
                    <span key={a} style={{ fontSize:22, cursor:'pointer', padding:4, borderRadius:4, transition:'background .15s' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--cyan-dim)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}
                      onClick={() => changeAvatar(a)}>{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ flex:1 }}>
            {editing ? (
              <div style={{ display:'flex', flexDirection:'column', gap:12, maxWidth:400 }}>
                <input className="form-input" value={form.username} placeholder="Username"
                  onChange={e => setForm(f => ({...f, username: e.target.value}))} />
                <textarea className="form-textarea" value={form.bio} placeholder="Bio"
                  onChange={e => setForm(f => ({...f, bio: e.target.value}))} rows={2} />
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-cyan btn-sm" disabled={submitting} onClick={saveProfile}>
                    {submitting ? 'Saving…' : 'Save'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6, flexWrap:'wrap' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(14px,2.5vw,22px)', fontWeight:900, letterSpacing:3 }}>{p.username}</div>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:10, padding:'2px 8px', border:`1px solid ${lvlClr}`, color:lvlClr }}>LVL {level}</span>
                  {rank !== null && <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--gold)' }}>#{rank}</span>}
                  {p.isAdmin && <span className="badge-chip gold">ADMIN</span>}
                </div>
                {p.bio && <div style={{ color:'var(--text-2)', fontSize:13, marginBottom:10, lineHeight:1.7 }}>{p.bio}</div>}
                <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-3)', marginBottom:12 }}>{p.email}</div>

                {/* XP bar */}
                <div style={{ maxWidth:280 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-2)', marginBottom:4 }}>
                    <span>XP: {xp.toLocaleString()}</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="xp-bar"><div className="xp-fill" style={{ width: pct + '%', background: lvlClr }} /></div>
                </div>

                {isOwn && (
                  <div style={{ marginTop:14, display:'flex', gap:8 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>✏️ Edit Profile</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowPw(s => !s)}>🔒 Change Password</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Change password panel */}
        {showPw && isOwn && (
          <div style={{ marginTop:24, borderTop:'1px solid var(--border)', paddingTop:20, maxWidth:340 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:10, letterSpacing:3, color:'var(--cyan)', marginBottom:14 }}>CHANGE PASSWORD</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[['current','Current Password'],['next','New Password'],['confirm','Confirm Password']].map(([k,lbl]) => (
                <input key={k} type="password" className="form-input" placeholder={lbl}
                  value={pwForm[k]} onChange={e => setPwForm(f => ({...f, [k]: e.target.value}))} />
              ))}
              <button className="btn btn-cyan btn-sm" disabled={submitting} onClick={changePassword}>
                {submitting ? 'Saving…' : 'Update Password'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom:20 }}>
        {['overview','skills','stats'].map(t => (
          <button key={t} className={`tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && stats && (
        <div className="stat-cards">
          {[
            ['🗡️', stats.completedTasks  || 0, 'Tasks Done'],
            ['⚡', (stats.totalXP || xp).toLocaleString(), 'Total XP'],
            ['🏆', stats.projectsJoined  || 0, 'Projects'],
            ['📊', stats.avgScore        !== undefined ? (stats.avgScore).toFixed(1) : '—', 'Avg Score'],
          ].map(([icon, val, lbl]) => (
            <div className="stat-card" key={lbl}>
              <span className="sc-icon">{icon}</span>
              <div className="sc-val">{val}</div>
              <div className="sc-lbl">{lbl}</div>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {activeTab === 'skills' && (
        <div className="card">
          {skills.length === 0
            ? <EmptyState icon="📊" text="No skills recorded yet" sub="Complete assessments to build skill profile" />
            : (
              <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
                {skills.map(s => {
                  const pct2 = Math.min(100, Math.round((s.xp || s.score || 0) / 10));
                  return (
                    <div key={s.area || s.skillArea || s._id}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <div style={{ fontFamily:'var(--font-display)', fontSize:11, letterSpacing:2 }}>{(s.area || s.skillArea || 'General').toUpperCase()}</div>
                        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-2)' }}>{s.level || 'Apprentice'} · {s.xp || s.score || 0} XP</div>
                      </div>
                      <div className="xp-bar">
                        <div className="xp-fill" style={{ width: pct2 + '%', background:'var(--cyan)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      )}

      {/* Stats detail */}
      {activeTab === 'stats' && stats && (
        <div className="card">
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {Object.entries(stats).filter(([k]) => !['_id','userId'].includes(k)).map(([key, val]) => (
              <div key={key} style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px solid var(--border)', paddingBottom:10 }}>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-2)', textTransform:'capitalize' }}>
                  {key.replace(/([A-Z])/g, ' $1')}
                </span>
                <span style={{ fontFamily:'var(--font-display)', fontSize:12, color:'var(--text-1)' }}>
                  {typeof val === 'number' ? val.toLocaleString() : String(val ?? '—')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
