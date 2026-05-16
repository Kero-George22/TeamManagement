import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';

export default function DashboardGoalsWidget() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState(null);

  useEffect(() => {
    API.goals
      .list()
      .then((list) => setGoals((list || []).filter((g) => !g.completed).slice(0, 3)))
      .catch(() => setGoals([]));
  }, []);

  if (goals === null) {
    return <div className="skeleton" style={{ height: 80, borderRadius: 18 }} />;
  }

  return (
    <section className="dashboard-widget">
      <div className="dashboard-widget__header">
        <div>
          <h3 className="section-title" style={{ marginBottom: 4 }}>Active Goals</h3>
          <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Personal milestones.</div>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate('/app/goals')}>
          View all
        </button>
      </div>
      {goals.length === 0 ? (
        <p style={{ fontSize: '.875rem', color: 'var(--text-muted)' }}>No active goals.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {goals.map((goal) => (
            <div
              key={goal._id}
              onClick={() => navigate('/app/goals')}
              style={{
                padding: '12px 14px',
                borderRadius: 14,
                border: '1px solid var(--border)',
                cursor: 'pointer',
                borderLeft: `4px solid var(--${goal.color || 'blue'})`,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{goal.title}</div>
              <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>{goal.progress ?? 0}%</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
