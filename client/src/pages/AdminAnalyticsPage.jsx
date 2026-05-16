import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../lib/api';
import Topbar from '../components/layout/Topbar';
import { useToast } from '../lib/toast';

export default function AdminAnalyticsPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await API.analytics.platform();
        setData(res);
      } catch (e) {
        toast.error(e.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <>
        <Topbar title="Platform Analytics" />
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--card-radius)' }} />
      </>
    );
  }

  const platform = data?.platform || {};
  const subs = data?.submissions || {};

  return (
    <>
      <Topbar title="Platform Analytics" />
      <div style={{ marginBottom: 16 }}>
        <Link to="/app/admin/reviews" className="btn btn--outline btn--sm">
          <i className="fa-solid fa-clipboard-check" /> Review Submissions
        </Link>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 24 }}>
        {[
          ['Total Users', platform.totalUsers],
          ['Active Users', platform.activeUsers],
          ['Projects', platform.totalProjects],
          ['Tasks', platform.totalTasks],
          ['Submissions', platform.totalSubmissions],
        ].map(([label, value]) => (
          <div key={label} className="stat-card">
            <div className="stat-card__label">{label}</div>
            <div className="stat-card__value">{value ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="workspace-grid">
        <section className="card">
          <h3 className="section-title">Submissions</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
            <span className="chip">Accepted: {subs.accepted ?? 0}</span>
            <span className="chip">Pending: {subs.pending ?? 0}</span>
            <span className="chip">Rejected: {subs.rejected ?? 0}</span>
            <span className="chip" style={{ color: 'var(--green)' }}>
              Rate: {subs.acceptanceRate ?? 0}%
            </span>
          </div>
          <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: '.875rem' }}>
            Avg completed tasks per user: <strong>{data?.averages?.avgCompletedTasks ?? 0}</strong>
          </p>
        </section>

        <section className="card">
          <h3 className="section-title">Top Contributors</h3>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(data?.topUsers || []).length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>No data yet.</p>
            ) : (
              data.topUsers.map((u) => (
                <div key={u._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>{u.username || u.email}</span>
                  <strong>{u.completedTasks} tasks</strong>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 20 }}>
        <h3 className="section-title">Recent Submissions</h3>
        <div style={{ marginTop: 12, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: 8 }}>User</th>
                <th style={{ padding: 8 }}>Task</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentSubmissions || []).map((s) => (
                <tr key={s._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 8 }}>{s.user?.username || s.user?.email || '—'}</td>
                  <td style={{ padding: 8 }}>{s.task?.title || '—'}</td>
                  <td style={{ padding: 8 }}>{s.status}</td>
                  <td style={{ padding: 8 }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
