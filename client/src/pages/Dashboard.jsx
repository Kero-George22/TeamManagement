import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { SpinnerWrap } from '../components/Spinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/index.js';
import { timeAgo } from '../utils.js';

const QUICK_ACTIONS = [
  { label:'Browse Projects', icon:'🏗', to:'/projects' },
  { label:'Leaderboard',     icon:'🏆', to:'/leaderboard' },
  { label:'Skill Test',      icon:'🧠', to:'/assessment' },
  { label:'My Portfolio',    icon:'📋', to:'/portfolio' },
  { label:'Virtual Office',  icon:'🏢', to:'/office' },
  { label:'My Profile',      icon:'⚙',  to:'/profile' },
];

const SKILL_AREAS = ['Frontend','Backend','FullStack','DevOps','DataScience'];
const SKILL_ICONS = { Frontend:'⚡', Backend:'🔧', FullStack:'🌐', DevOps:'🚀', DataScience:'🧠' };
const SKILL_PCTS  = { Expert:100, Advanced:75, Intermediate:50, Beginner:25 };
const SKILL_COLS  = { Expert:'var(--gold)', Advanced:'var(--cyan)', Intermediate:'var(--purple)', Beginner:'var(--red)' };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats,    setStats]    = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks,    setTasks]    = useState([]);
  const [rank,     setRank]     = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/profile/me/stats').catch(() => null),
      api.get('/projects?limit=4').catch(() => ({ projects: [] })),
    ]).then(([statsData, projData]) => {
      setStats(statsData);
      setProjects(projData.projects || projData || []);
    }).finally(() => setLoading(false));

    if (user?._id) {
      api.get(`/profile/${user._id}/rank`).then(r => setRank(r.rank)).catch(() => {});
    }
  }, [user]);

  const xpInLevel  = (user?.totalXP || 0) % 1000;
  const xpPct      = Math.round(xpInLevel / 10);
  const skills     = user?.skills || {};

  return (
    <Layout>
      {/* Hero banner */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', padding:'32px 36px', marginBottom:24, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:24, top:'50%', transform:'translateY(-50%)', fontFamily:'var(--font-display)', fontSize:100, fontWeight:900, letterSpacing:20, color:'rgba(0,229,255,0.03)', pointerEvents:'none' }}>
          HERO
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:28, flexWrap:'wrap' }}>
          <div style={{ width:72, height:72, fontSize:40, display:'flex', alignItems:'center', justifyContent:'center' }}
               className="hex-avatar">
            {user?.avatar || '👤'}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(18px,3vw,28px)', fontWeight:900, letterSpacing:4, marginBottom:4 }}>
              {user?.username || 'HERO'}
            </div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-2)', marginBottom:14 }}>
              {user?.email}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, maxWidth:360 }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-2)', whiteSpace:'nowrap' }}>
                {xpInLevel} / 1000 XP
              </div>
              <div className="xp-track" style={{ flex:1 }}>
                <div className="xp-fill" style={{ '--w': xpPct + '%' }} />
              </div>
            </div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:56, fontWeight:900, color:'var(--cyan)', textShadow:'var(--cyan-glow)', lineHeight:1 }}>
              {user?.level || 1}
            </div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-2)', letterSpacing:3 }}>LEVEL</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-cards mb-6">
        <div className="stat-card">
          <span className="sc-icon">⚔️</span>
          <div className="sc-val">{user?.completedTasks || 0}</div>
          <div className="sc-lbl">Tasks Done</div>
        </div>
        <div className="stat-card gold">
          <span className="sc-icon">⭐</span>
          <div className="sc-val">{(user?.totalXP || 0).toLocaleString()}</div>
          <div className="sc-lbl">Total XP</div>
        </div>
        <div className="stat-card purple">
          <span className="sc-icon">🏆</span>
          <div className="sc-val">{rank ? '#' + rank : '—'}</div>
          <div className="sc-lbl">Global Rank</div>
        </div>
        <div className="stat-card green">
          <span className="sc-icon">🛡</span>
          <div className="sc-val">{user?.reliabilityScore || 0}%</div>
          <div className="sc-lbl">Reliability</div>
        </div>
      </div>

      {/* Quick actions + Skills */}
      <div className="grid-2 mb-6">
        <div className="card">
          <div className="card-header"><span className="card-title">QUICK ACTIONS</span></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {QUICK_ACTIONS.map(a => (
              <Link key={a.to} to={a.to} className="card" style={{ background:'var(--bg-card-hi)', border:'1px solid var(--border)', padding:'16px 14px', display:'flex', alignItems:'center', gap:10, transition:'border-color .2s, background .2s', textDecoration:'none', cursor:'pointer' }}>
                <span style={{ fontSize:20 }}>{a.icon}</span>
                <span style={{ fontFamily:'var(--font-display)', fontSize:10, letterSpacing:2 }}>{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">SKILL OVERVIEW</span>
            <Link to="/assessment" className="btn btn-sm btn-outline">Take Test</Link>
          </div>
          {SKILL_AREAS.map(area => {
            const s   = skills[area] || {};
            const pct = SKILL_PCTS[s.level] || 0;
            const col = SKILL_COLS[s.level] || 'var(--text-3)';
            return (
              <div key={area} style={{ marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:10, letterSpacing:2 }}>
                    {SKILL_ICONS[area]} {area}
                  </span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:col }}>{s.level || 'Not Assessed'}</span>
                </div>
                <div className="xp-track">
                  <div className="xp-fill" style={{ '--w': pct + '%', background: col }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active projects */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">ACTIVE PROJECTS</span>
          <Link to="/projects" className="btn btn-sm btn-cyan">View All →</Link>
        </div>
        {loading ? <SpinnerWrap /> : (
          projects.length === 0
            ? <div style={{ textAlign:'center', padding:40, color:'var(--text-3)', fontFamily:'var(--font-mono)', fontSize:12 }}>No projects yet. <Link to="/projects" style={{ color:'var(--cyan)' }}>Browse Projects →</Link></div>
            : <div className="proj-grid">
                {projects.slice(0,4).map(p => (
                  <div key={p._id} className="proj-card" onClick={() => navigate('/projects/' + p._id)}>
                    <div className="proj-card-name">{p.name}</div>
                    <div className="proj-card-desc">{(p.description || '').slice(0, 100)}{p.description?.length > 100 ? '…' : ''}</div>
                    <div className="proj-card-footer">
                      <StatusBadge status={p.status} />
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-2)' }}>
                        👥 {(p.members || []).length}/{p.maxMembers || '∞'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
        )}
      </div>
    </Layout>
  );
}
