import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { SpinnerWrap } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../api/index.js';

function StatCard({ label, value, sub, color = 'cyan', icon }) {
  return (
    <div className={`stat-card ${color !== 'cyan' ? color : ''}`} style={{ minWidth: 0 }}>
      <div className="sc-icon">{icon}</div>
      <div className="sc-val">{value}</div>
      <div className="sc-lbl">{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function RingChart({ pct, color = 'var(--cyan)', size = 100, label }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x="50" y="50" textAnchor="middle" dy="0.35em"
          fill={color} fontSize="18" fontWeight="900"
          fontFamily="var(--font-display)">
          {pct}%
        </text>
      </svg>
      {label && <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-body)', textAlign: 'center' }}>{label}</span>}
    </div>
  );
}

function BarChart({ data, colorVar = '--cyan' }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{d.label}</span>
            <span style={{ fontSize: 12, color: `var(${colorVar})`, fontFamily: 'var(--font-mono)' }}>{d.value.toLocaleString()}</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(d.value / max) * 100}%`,
              background: `var(${colorVar})`,
              borderRadius: 3,
              transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: `0 0 8px var(${colorVar})`,
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const toast    = useToast();
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('overview');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/platform');
      setData(res.data || res);
    } catch (err) {
      toast.error(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.isAdmin) { navigate('/dashboard', { replace: true }); return; }
    load();
  }, [user, load]);

  if (!user?.isAdmin) return null;
  if (loading) return <Layout><SpinnerWrap /></Layout>;

  const p  = data?.platform  || {};
  const s  = data?.submissions || {};
  const av = data?.averages   || {};
  const topUsers   = data?.topUsers          || [];
  const recentSubs = data?.recentSubmissions || [];

  const subChartData = [
    { label: 'Accepted', value: s.accepted || 0 },
    { label: 'Rejected', value: s.rejected || 0 },
    { label: 'Pending',  value: s.pending  || 0 },
  ];

  return (
    <Layout>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">⚡ ADMIN PANEL</div>
          <div className="page-sub">Platform insights &amp; management</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} title="Refresh">↻ Refresh</button>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 28 }}>
        {['overview', 'submissions', 'users'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <>
          {/* Primary stat cards */}
          <div className="stat-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))' }}>
            <StatCard icon="👥" label="TOTAL USERS"    value={(p.totalUsers    || 0).toLocaleString()} sub={`${p.activeUsers || 0} active`} color="cyan"   />
            <StatCard icon="📁" label="ACTIVE PROJECTS" value={(p.totalProjects || 0).toLocaleString()} color="purple" />
            <StatCard icon="✅" label="TOTAL TASKS"     value={(p.totalTasks    || 0).toLocaleString()} color="gold"   />
            <StatCard icon="📤" label="SUBMISSIONS"     value={(p.totalSubmissions || 0).toLocaleString()} sub={`${s.acceptanceRate || 0}% accepted`} color="green" />
          </div>

          {/* 2-col: ring charts + averages */}
          <div className="grid-2" style={{ marginBottom: 24 }}>

            {/* Submission rings */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">SUBMISSION BREAKDOWN</span>
              </div>
              <div style={{ display: 'flex', gap: 24, justifyContent: 'space-around', flexWrap: 'wrap', padding: '12px 0' }}>
                <RingChart pct={s.acceptanceRate || 0} color="var(--green)"  label="Acceptance Rate" />
                <RingChart
                  pct={p.totalUsers ? Math.round((p.activeUsers / p.totalUsers) * 100) : 0}
                  color="var(--cyan)" label="Active Users" />
                <RingChart
                  pct={p.totalTasks ? Math.round(((p.totalTasks - (s.pending || 0)) / p.totalTasks) * 100) : 0}
                  color="var(--purple)" label="Task Completion" />
              </div>
            </div>

            {/* Averages */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">PLATFORM AVERAGES</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '8px 0' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Average XP per User</span>
                    <span style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: 16, fontWeight: 900 }}>{(av.avgUserXP || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${Math.min((av.avgUserXP || 0) / 50, 100)}%`, background: 'var(--gold)', borderRadius: 3, boxShadow: '0 0 8px var(--gold)' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Average Level</span>
                    <span style={{ fontFamily: 'var(--font-display)', color: 'var(--purple)', fontSize: 16, fontWeight: 900 }}>Lv {av.avgUserLevel || '0.00'}</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${Math.min((parseFloat(av.avgUserLevel) || 0) * 5, 100)}%`, background: 'var(--purple)', borderRadius: 3, boxShadow: '0 0 8px var(--purple)' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                  {[
                    { l: 'Total Accepted', v: s.accepted || 0, c: 'var(--green)' },
                    { l: 'Total Rejected', v: s.rejected || 0, c: 'var(--red)'   },
                    { l: 'Total Pending',  v: s.pending  || 0, c: 'var(--gold)'  },
                    { l: 'Acceptance %',   v: `${s.acceptanceRate || 0}%`, c: 'var(--cyan)' },
                  ].map(({ l, v, c }) => (
                    <div key={l} style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 'var(--radius)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>{l}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 900, color: c }}>{typeof v === 'number' ? v.toLocaleString() : v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Submission bar chart */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">SUBMISSION VOLUME</span>
            </div>
            <BarChart data={subChartData} colorVar="--cyan" />
          </div>
        </>
      )}

      {/* ── SUBMISSIONS TAB ── */}
      {tab === 'submissions' && (
        <>
          <div className="stat-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', marginBottom: 24 }}>
            <StatCard icon="✅" label="ACCEPTED" value={(s.accepted || 0).toLocaleString()} color="green" />
            <StatCard icon="❌" label="REJECTED" value={(s.rejected || 0).toLocaleString()} color="" />
            <StatCard icon="⏳" label="PENDING"  value={(s.pending  || 0).toLocaleString()} color="gold" />
            <StatCard icon="📊" label="RATE"     value={`${s.acceptanceRate || 0}%`}        color="cyan" />
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">RECENT SUBMISSIONS</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Last 10</span>
            </div>
            {recentSubs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>No submissions yet</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>USER</th>
                      <th>TASK</th>
                      <th>STATUS</th>
                      <th>SCORE</th>
                      <th>DATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSubs.map(sub => (
                      <tr key={sub._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 18 }}>{sub.user?.avatar || '👤'}</span>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{sub.user?.username || 'Unknown'}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{sub.user?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ maxWidth: 200 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                            {sub.task?.title || '—'}
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge status-${sub.status}`}>{sub.status}</span>
                        </td>
                        <td>
                          {sub.score != null
                            ? <span style={{ fontFamily: 'var(--font-display)', color: sub.score >= 70 ? 'var(--green)' : sub.score >= 40 ? 'var(--gold)' : 'var(--red)', fontWeight: 900 }}>{sub.score}</span>
                            : <span style={{ color: 'var(--text-3)' }}>—</span>}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <>
          <div className="stat-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', marginBottom: 24 }}>
            <StatCard icon="👥" label="TOTAL USERS"  value={(p.totalUsers  || 0).toLocaleString()} color="cyan"   />
            <StatCard icon="⚡" label="ACTIVE USERS" value={(p.activeUsers || 0).toLocaleString()} color="green"  />
            <StatCard icon="🏆" label="AVG XP"        value={(av.avgUserXP || 0).toLocaleString()} color="gold"   />
            <StatCard icon="⭐" label="AVG LEVEL"     value={`Lv ${av.avgUserLevel || '0'}`}        color="purple" />
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">🏆 TOP PLAYERS</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>By Total XP</span>
            </div>
            {topUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>No users yet</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>USER</th>
                      <th>LEVEL</th>
                      <th>TOTAL XP</th>
                      <th>TASKS DONE</th>
                      <th>XP BAR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsers.map((u, i) => {
                      const xpPct = Math.round(((u.totalXP || 0) % 1000) / 10);
                      const rankColors = ['var(--gold)', 'var(--text-1)', '#cd7f32'];
                      const medal = ['🥇','🥈','🥉'][i] || `#${i+1}`;
                      return (
                        <tr key={u._id}>
                          <td>
                            <span style={{ fontSize: i < 3 ? 20 : 14, fontFamily: 'var(--font-display)', color: rankColors[i] || 'var(--text-2)', fontWeight: 900 }}>
                              {medal}
                            </span>
                          </td>
                          <td>
                            <Link to={`/profile/${u._id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                              <span style={{ fontSize: 22 }}>{u.avatar || '👤'}</span>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>{u.username || 'No name'}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{u.email}</div>
                              </div>
                            </Link>
                          </td>
                          <td>
                            <span className="badge-chip cyan">Lv {u.level || 1}</span>
                          </td>
                          <td>
                            <span style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontWeight: 900, fontSize: 16 }}>
                              {(u.totalXP || 0).toLocaleString()}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-2)', fontSize: 14 }}>
                            {u.completedTasks || 0}
                          </td>
                          <td style={{ width: 140 }}>
                            <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${xpPct}%`, background: 'linear-gradient(90deg, var(--cyan), var(--purple))', borderRadius: 3 }} />
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>{xpPct}%</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}
