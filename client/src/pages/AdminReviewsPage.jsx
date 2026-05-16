import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../lib/api';
import Topbar from '../components/layout/Topbar';
import Badge from '../components/ui/Badge';
import { useToast } from '../lib/toast';

const STATUS_VARIANT = {
  pending: 'yellow',
  under_review: 'blue',
  accepted: 'green',
  rejected: 'pink',
};

export default function AdminReviewsPage() {
  const toast = useToast();
  const [queue, setQueue] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const items = await API.submissions.adminQueue(filter);
      setQueue(items);
    } catch (e) {
      toast.error(e.message || 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function runAction(id, action, extra) {
    setBusyId(id);
    try {
      if (action === 'ai') await API.submissions.aiReview(id);
      if (action === 'approve') await API.submissions.approve(id);
      if (action === 'reject') await API.submissions.reject(id, extra);
      toast.success('Updated');
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Topbar title="Submission Reviews" />
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <Link to="/app/admin/analytics" className="btn btn--ghost btn--sm">
          <i className="fa-solid fa-chart-line" /> Analytics
        </Link>
        <select
          className="form-input"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ maxWidth: 180 }}
        >
          <option value="pending">Pending</option>
          <option value="under_review">Under review</option>
          <option value="all">All</option>
        </select>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 120, borderRadius: 'var(--card-radius)' }} />
      ) : queue.length === 0 ? (
        <div className="card empty-state">
          <h4>No submissions in this queue</h4>
          <p>When members submit work, it will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {queue.map((s) => (
            <article key={s._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontWeight: 700, marginBottom: 4 }}>{s.task?.title || 'Task'}</h3>
                  <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)' }}>
                    {s.project?.title} · {s.user?.username || s.user?.email}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[s.status] || 'gray'}>{s.status}</Badge>
              </div>

              {s.score != null && (
                <p style={{ fontSize: '.875rem', marginBottom: 8 }}>
                  AI Score: <strong>{s.score}/100</strong>
                </p>
              )}
              {s.aiFeedback && (
                <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                  {s.aiFeedback}
                </p>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn btn--outline btn--sm"
                  disabled={busyId === s._id}
                  onClick={() => runAction(s._id, 'ai')}
                >
                  AI Review
                </button>
                <button
                  className="btn btn--green btn--sm"
                  disabled={busyId === s._id}
                  onClick={() => runAction(s._id, 'approve')}
                >
                  Approve
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  disabled={busyId === s._id}
                  onClick={() => {
                    const feedback = window.prompt('Rejection feedback (optional):');
                    if (feedback !== null) runAction(s._id, 'reject', feedback);
                  }}
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
