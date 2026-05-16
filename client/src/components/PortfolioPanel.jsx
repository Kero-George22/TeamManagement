import { useEffect, useState } from 'react';
import API from '../lib/api';
import { useToast } from '../lib/toast';

export default function PortfolioPanel() {
  const toast = useToast();
  const [portfolio, setPortfolio] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, s] = await Promise.all([API.portfolio.me(), API.portfolio.stats()]);
        setPortfolio(p);
        setStats(s);
      } catch {
        toast.error('Failed to load portfolio');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function downloadMarkdown() {
    try {
      const md = await API.portfolio.exportMarkdown();
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'portfolio.md';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.message);
    }
  }

  if (loading) return <div className="skeleton" style={{ height: 100, borderRadius: 'var(--card-radius)' }} />;

  const projects = portfolio?.projects || [];

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h3 className="section-title" style={{ margin: 0 }}>Portfolio</h3>
        <button type="button" className="btn btn--outline btn--sm" onClick={downloadMarkdown}>
          <i className="fa-solid fa-download" /> Export Markdown
        </button>
      </div>

      {stats && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <span className="chip">Projects: {stats.totalProjects ?? 0}</span>
          <span className="chip">Avg score: {stats.averageScore ?? 0}%</span>
        </div>
      )}

      {projects.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>
          Complete and get submissions approved to build your portfolio.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {projects.map((p) => (
            <div key={p._id} style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700 }}>{p.taskTitle}</div>
              <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{p.projectTitle}</div>
              {p.score != null && <span className="chip" style={{ marginTop: 8 }}>Score: {p.score}%</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
