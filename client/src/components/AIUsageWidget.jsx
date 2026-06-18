import { useState, useEffect } from 'react';
import API from '../lib/api';

export default function AIUsageWidget() {
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    API.ai.usage()
      .then(res => setUsage(res))
      .catch(() => {});
  }, []);

  if (!usage) return null;

  const used = usage.used || 0;
  const limit = usage.limit || 10;
  const plan = usage.plan || 'free';
  const pct = Math.min(100, Math.round((used / limit) * 100));
  
  const resetsAt = usage.resetsAt ? new Date(usage.resetsAt) : null;
  const daysLeft = resetsAt ? Math.ceil((resetsAt - new Date()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="card p-4" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ fontSize: '.9rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="fa-solid fa-robot" style={{ color: 'var(--primary)' }} /> AI Credits
        </h4>
        <span style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>
          {plan} Plan
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: 6, fontWeight: 600 }}>
        <span>{used} / {limit === Infinity ? '∞' : limit} used</span>
        <span style={{ color: pct > 80 ? 'var(--red)' : 'var(--text-secondary)' }}>{limit === Infinity ? 0 : pct}%</span>
      </div>

      <div className="progress" style={{ background: 'rgba(0,0,0,.05)', marginBottom: 12, height: 6 }}>
        <div className="progress__fill" style={{ width: `${limit === Infinity ? 0 : pct}%`, background: pct > 80 ? 'var(--red)' : 'var(--primary)' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
          {limit !== Infinity ? `Resets in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : 'Unlimited usage'}
        </span>
        {plan === 'free' && (
          <button className="icon-btn" style={{ fontSize: '.7rem', padding: '4px 8px', borderRadius: 4, background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 600 }}>
            Upgrade
          </button>
        )}
      </div>
    </div>
  );
}
