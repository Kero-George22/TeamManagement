import { useEffect, useState } from 'react';
import API from '../lib/api';
import { ProgressBar } from './ui/Primitives';
import { useToast } from '../lib/toast';

export default function ProjectAnalyticsTab({ projectId }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const res = await API.analytics.project(projectId);
        setData(res);
      } catch (e) {
        toast.error(e.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  if (loading) return <div className="skeleton" style={{ height: 160, borderRadius: 'var(--card-radius)' }} />;
  if (!data) return null;

  const tasks = data.tasks || {};
  const subs = data.submissions || {};

  return (
    <div className="workspace-grid">
      <section className="card">
        <h3 className="section-title">Task Progress</h3>
        <p style={{ margin: '12px 0', fontSize: '.875rem', color: 'var(--text-secondary)' }}>
          {tasks.completed ?? 0} of {tasks.total ?? 0} tasks completed
        </p>
        <ProgressBar value={tasks.completionRate ?? 0} />
        <p style={{ marginTop: 8, fontWeight: 700 }}>{tasks.completionRate ?? 0}%</p>
      </section>

      <section className="card">
        <h3 className="section-title">Submissions</h3>
        <p style={{ marginTop: 12, fontSize: '.875rem' }}>
          Total: <strong>{subs.total ?? 0}</strong> · Accepted: <strong>{subs.accepted ?? 0}</strong>
        </p>
        <p style={{ marginTop: 8, color: 'var(--green)', fontWeight: 600 }}>
          Acceptance rate: {subs.acceptanceRate ?? 0}%
        </p>
      </section>

      <section className="card" style={{ gridColumn: '1 / -1' }}>
        <h3 className="section-title">Member Performance</h3>
        <div style={{ marginTop: 12, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: 8 }}>Member</th>
                <th style={{ padding: 8 }}>Submissions</th>
                <th style={{ padding: 8 }}>Accepted</th>
                <th style={{ padding: 8 }}>Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {(data.memberPerformance || []).length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 16, color: 'var(--text-muted)' }}>No submission data yet.</td>
                </tr>
              ) : (
                data.memberPerformance.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 8 }}>{row.user?.username || row.user?.email || '—'}</td>
                    <td style={{ padding: 8 }}>{row.submissions}</td>
                    <td style={{ padding: 8 }}>{row.accepted}</td>
                    <td style={{ padding: 8 }}>{row.avgScore ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
