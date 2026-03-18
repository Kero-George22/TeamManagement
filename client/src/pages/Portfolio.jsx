import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout.jsx';
import { SpinnerWrap } from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../api/index.js';
import { gradeFromScore, levelColor } from '../utils.js';

const GRADE_COLOR = { S:'var(--gold)', A:'var(--cyan)', B:'var(--green)', C:'#fff', D:'#f90', F:'#f44' };

export default function Portfolio() {
  const { user }   = useAuth();
  const toast      = useToast();

  const [portfolio, setPortfolio] = useState(null);
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [copying,   setCopying]   = useState(false);
  const [exporting, setExporting] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pData, sData] = await Promise.all([
        api.get('/portfolio/me'),
        api.get('/portfolio/me/stats').catch(() => null),
      ]);
      setPortfolio(pData.portfolio || pData);
      if (sData) setStats(sData.stats || sData);
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function exportFile(fmt) {
    setExporting(fmt);
    try {
      const blob = await api.download('/portfolio/export/' + fmt);
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), {
        href: url, download: `portfolio.${fmt}`
      });
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success(fmt.toUpperCase() + ' downloaded!');
    } catch (err) {
      toast.error(err.message);
    } finally { setExporting(''); }
  }

  async function copyPublicLink() {
    const link = `${window.location.origin}/profile/${user?._id}`;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Public link copied!');
    } catch {
      toast.info(link);
    } finally { setTimeout(() => setCopying(false), 1500); }
  }

  if (loading) return <Layout><SpinnerWrap /></Layout>;

  const p = portfolio || {};
  const projects = p.projects || [];
  const skills   = p.skills   || [];
  const badges   = p.badges   || [];

  return (
    <Layout>
      {/* Hero */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', padding:'32px', marginBottom:24, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,var(--gold),var(--cyan),var(--purple))' }} />
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:20 }}>

          {/* Avatar + info */}
          <div style={{ display:'flex', gap:20, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ fontSize:56, background:'var(--bg-3)', width:80, height:80, display:'flex', alignItems:'center', justifyContent:'center',
              clipPath:'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)', border:`2px solid ${levelColor(user?.level || 1)}` }}>
              {user?.avatar || '👤'}
            </div>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(14px,2.5vw,24px)', fontWeight:900, letterSpacing:4, marginBottom:4 }}>
                {user?.username}
              </div>
              {p.bio && <div style={{ color:'var(--text-2)', fontSize:13, marginBottom:10, maxWidth:480, lineHeight:1.7 }}>{p.bio}</div>}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:10, border:'1px solid var(--cyan)', color:'var(--cyan)', padding:'2px 10px' }}>
                  LVL {user?.level || 1}
                </span>
                {stats && (
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--gold)' }}>
                    ⚡ {(stats.totalXP || 0).toLocaleString()} XP
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Export actions */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:9, letterSpacing:3, color:'var(--text-3)', marginBottom:2 }}>EXPORT</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {['json','markdown','csv'].map(fmt => (
                <button key={fmt} className="btn btn-outline btn-sm" disabled={exporting === fmt} onClick={() => exportFile(fmt)}>
                  {exporting === fmt ? '…' : fmt.toUpperCase()}
                </button>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={copyPublicLink}>
                {copying ? '✅ Copied!' : '🔗 Share'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="stat-cards" style={{ marginBottom:28 }}>
          {[
            ['🗡️', stats.completedTasks  || 0,          'Tasks Done'],
            ['⭐', (stats.avgScore || 0).toFixed(1),    'Avg Score'],
            ['🏆', stats.projectsJoined  || 0,          'Projects'],
            ['📊', skills.length,                        'Skills'],
          ].map(([icon, val, lbl]) => (
            <div className="stat-card" key={lbl}>
              <span className="sc-icon">{icon}</span>
              <div className="sc-val">{val}</div>
              <div className="sc-lbl">{lbl}</div>
            </div>
          ))}
        </div>
      )}

      {/* Projects grid */}
      {projects.length > 0 && (
        <>
          <div style={{ fontFamily:'var(--font-display)', fontSize:12, letterSpacing:4, color:'var(--text-2)', marginBottom:14 }}>
            ⚔️ PROJECTS
          </div>
          <div className="grid-3" style={{ marginBottom:32 }}>
            {projects.map(proj => (
              <div key={proj._id || proj.name} className="project-card">
                <div className="project-card-name">{proj.name}</div>
                {proj.description && (
                  <div style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.7, marginBottom:10, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                    {proj.description}
                  </div>
                )}
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
                  {(proj.techStack || []).map(t => <span key={t} className="badge-chip cyan" style={{ fontSize:9 }}>{t}</span>)}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-3)' }}>
                  <span>⚡ {proj.tasksCompleted || 0} tasks</span>
                  {proj.role && <span className="badge-chip purple" style={{ fontSize:9 }}>{proj.role}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Skills section */}
      {skills.length > 0 && (
        <>
          <div style={{ fontFamily:'var(--font-display)', fontSize:12, letterSpacing:4, color:'var(--text-2)', marginBottom:14 }}>
            📊 SKILLS
          </div>
          <div className="grid-3" style={{ marginBottom:32 }}>
            {skills.map(s => {
              const g  = s.grade || (s.score !== undefined ? gradeFromScore(s.score) : null);
              const gc = g ? GRADE_COLOR[g] || '#fff' : 'var(--cyan)';
              return (
                <div key={s.area || s._id} className="card" style={{ padding:'18px 20px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:11, letterSpacing:2 }}>
                      {(s.area || 'General').toUpperCase()}
                    </div>
                    {g && <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:900, color: gc }}>{g}</div>}
                  </div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-2)', marginBottom:6 }}>
                    {s.level || 'Apprentice'} · {(s.xp || s.score || 0)} XP
                  </div>
                  <div className="xp-bar">
                    <div className="xp-fill" style={{ width: Math.min(100, (s.xp || s.score || 0) / 10) + '%', background: gc }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <>
          <div style={{ fontFamily:'var(--font-display)', fontSize:12, letterSpacing:4, color:'var(--text-2)', marginBottom:14 }}>
            🏅 BADGES
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:32 }}>
            {badges.map((b, i) => (
              <div key={b._id || i} style={{ background:'var(--bg-card)', border:'1px solid var(--gold)', padding:'10px 18px', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:20 }}>{b.icon || '🏅'}</span>
                <div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:10, letterSpacing:2, color:'var(--gold)' }}>{b.name || b.title || 'Badge'}</div>
                  {b.description && <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-3)' }}>{b.description}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {projects.length === 0 && skills.length === 0 && badges.length === 0 && (
        <EmptyState icon="📁" text="Portfolio is empty" sub="Complete projects and assessments to build your portfolio" />
      )}
    </Layout>
  );
}
