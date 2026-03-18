import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { SpinnerWrap } from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../api/index.js';
import { levelColor } from '../utils.js';

const PAGE_SIZE = 20;

const MEDAL = { 0:'🥇', 1:'🥈', 2:'🥉' };
const RANK_STYLE = {
  0: { background:'rgba(255,215,0,0.08)', borderColor:'var(--gold)', color:'var(--gold)' },
  1: { background:'rgba(192,192,192,0.06)', borderColor:'#c0c0c0', color:'#c0c0c0' },
  2: { background:'rgba(205,127,50,0.06)', borderColor:'#cd7f32', color:'#cd7f32' },
};

function isImageAvatar(v) {
  return typeof v === 'string' && (v.startsWith('data:') || v.startsWith('http') || v.startsWith('/'));
}

export default function Leaderboard() {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const toast       = useToast();

  const [rows,      setRows]      = useState([]);
  const [myRank,    setMyRank]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);
  const [search,    setSearch]    = useState('');

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const [lb, rankData] = await Promise.all([
        api.get(`/profile/leaderboard?page=${pg}&limit=${PAGE_SIZE}`),
        user?._id ? api.get('/profile/' + user._id + '/rank').catch(() => null) : null,
      ]);
      const rawRows = lb.users || lb.leaderboard || lb || [];
      const normalized = rawRows.map((r) => ({ ...r, _id: r._id || r.id }));
      setRows(normalized);
      setTotal(lb.total || 0);
      if (rankData) setMyRank(rankData.rank !== undefined ? rankData.rank : rankData);
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  }, [user?._id]);

  useEffect(() => { load(page); }, [page, load]);

  const filtered = search.trim()
    ? rows.filter(r => (r.username || '').toLowerCase().includes(search.toLowerCase()))
    : rows;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <Layout>
      <div className="page-header" style={{ marginBottom:24 }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(14px,2.5vw,22px)', fontWeight:900, letterSpacing:4 }}>
          🏆 LEADERBOARD
        </div>
      </div>

      {/* Your rank banner */}
      {myRank !== null && (
        <div style={{ background:'rgba(255,215,0,0.06)', border:'1px solid var(--gold)', padding:'16px 24px', marginBottom:24, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          <span style={{ fontSize:28 }}>{MEDAL[myRank - 1] || '🎖️'}</span>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:11, letterSpacing:3, color:'var(--gold)' }}>YOUR RANK</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:900, color:'var(--gold)' }}>#{myRank}</div>
          </div>
          <div style={{ marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-2)' }}>
            {user?.username}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="search-bar" style={{ marginBottom:20 }}>
        <span className="search-icon">🔍</span>
        <input className="search-input" placeholder="Search heroes…" value={search}
          onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      {loading
        ? <SpinnerWrap />
        : filtered.length === 0
          ? <EmptyState icon="🏆" text="No heroes found" />
          : (
            <div className="card" style={{ padding:0, overflow:'auto' }}>
              <table className="table" style={{ minWidth:500 }}>
                <thead>
                  <tr>
                    <th style={{ width:60 }}>RANK</th>
                    <th>HERO</th>
                    <th>LEVEL</th>
                    <th>TOTAL XP</th>
                    <th>TASKS</th>
                    <th>AVG SCORE</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => {
                    const absRank = (page - 1) * PAGE_SIZE + i;
                    const isMe    = r._id === user?._id;
                    const style   = RANK_STYLE[absRank] || {};
                    const lvlClr  = levelColor(r.level || 1);
                    return (
                      <tr key={r._id}
                        style={{ cursor:'pointer', ...(isMe ? { background:'rgba(0,229,255,0.04)' } : {}), ...(style.background ? { background: style.background } : {}) }}
                        onClick={() => navigate('/profile/' + r._id)}>
                        <td style={{ textAlign:'center' }}>
                          {MEDAL[absRank]
                            ? <span style={{ fontSize:20 }}>{MEDAL[absRank]}</span>
                            : <span style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color: style.color || 'var(--text-2)' }}>#{absRank + 1}</span>
                          }
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            {isImageAvatar(r.avatar)
                              ? <img src={r.avatar} alt="avatar" style={{ width:28, height:28, objectFit:'cover', borderRadius:'50%', border:'1px solid var(--border)' }} />
                              : <span style={{ fontSize:20 }}>{r.avatar || '👤'}</span>}
                            <div>
                              <div style={{ fontFamily:'var(--font-display)', fontSize:12, letterSpacing:2 }}>
                                {r.username} {isMe && <span style={{ color:'var(--cyan)', fontSize:9 }}>← YOU</span>}
                              </div>
                              {r.bio && <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-3)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.bio}</div>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color: lvlClr, border:`1px solid ${lvlClr}`, padding:'2px 8px' }}>
                            LVL {r.level || 1}
                          </span>
                        </td>
                        <td style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:'var(--gold)' }}>
                          {(r.totalXP || r.xp || 0).toLocaleString()}
                        </td>
                        <td style={{ fontFamily:'var(--font-display)', fontSize:14 }}>{r.completedTasks || 0}</td>
                        <td style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-2)' }}>
                          {r.avgScore !== undefined && r.avgScore !== null ? Number(r.avgScore).toFixed(1) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
      }

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination" style={{ marginTop:20 }}>
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pg = page <= 3 ? i + 1 : page - 2 + i;
            if (pg < 1 || pg > totalPages) return null;
            return (
              <button key={pg} className={`btn btn-sm ${page === pg ? 'btn-cyan' : 'btn-ghost'}`} onClick={() => setPage(pg)}>{pg}</button>
            );
          })}
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </Layout>
  );
}
