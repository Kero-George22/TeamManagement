import { useEffect, useState, useRef } from 'react';
import API from '../lib/api';
import { ProgressBar } from './ui/Primitives';
import { useToast } from '../lib/toast';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';

export default function ProjectAnalyticsTab({ projectId }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const dashboardRef = useRef(null);

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

  const handleExportPDF = () => {
    const element = dashboardRef.current;
    if (!element) return;

    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      toast.error('Please allow popups to export the report.');
      return;
    }

    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules || []).map((rule) => rule.cssText).join('\n');
        } catch {
          return '';
        }
      })
      .join('\n');

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Project Analytics ${projectId}</title>
          <style>
            ${styles}
            body { padding: 24px; background: #fff; color: #111; }
            @media print { button { display: none !important; } }
          </style>
        </head>
        <body>${element.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (loading) return <div className="skeleton" style={{ height: 400, borderRadius: 'var(--card-radius)' }} />;
  if (!data) return null;

  const { tasks, velocity, aiTrend, memberContributions, timeByUser, timeByTask } = data;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn--outline" onClick={handleExportPDF}>
          <i className="fa-solid fa-file-pdf" style={{ marginRight: 8 }}></i> Export PDF
        </button>
      </div>

      <div ref={dashboardRef} className="workspace-grid" style={{ padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: '12px' }}>
        {/* Header Stats */}
        <section className="card" style={{ gridColumn: '1 / -1', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h3 className="section-title">Task Completion</h3>
            <p style={{ margin: '12px 0', fontSize: '1.5rem', fontWeight: 700 }}>{tasks.completed ?? 0} / {tasks.total ?? 0}</p>
            <ProgressBar value={tasks.completionRate ?? 0} />
            <p style={{ marginTop: 8, fontSize: '.875rem' }}>{tasks.completionRate ?? 0}% completed</p>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h3 className="section-title">Story Points Completed</h3>
            <p style={{ margin: '12px 0', fontSize: '1.5rem', fontWeight: 700 }}>{tasks.completedPoints ?? 0} / {tasks.totalPoints ?? 0}</p>
            <ProgressBar value={(tasks.completedPoints / tasks.totalPoints * 100) || 0} />
            <p style={{ marginTop: 8, fontSize: '.875rem' }}>{Math.round((tasks.completedPoints / tasks.totalPoints * 100) || 0)}% of total points</p>
          </div>
        </section>

        {/* Velocity Chart */}
        <section className="card" style={{ gridColumn: 'span 1' }}>
          <h3 className="section-title">Team Velocity (Story Points / Week)</h3>
          <div style={{ width: '100%', height: 300, marginTop: 16 }}>
            {velocity && velocity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={velocity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="week" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                  <Legend />
                  <Bar dataKey="points" fill="var(--primary)" name="Story Points" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No velocity data yet</div>
            )}
          </div>
        </section>

        {/* AI Review Trend */}
        <section className="card" style={{ gridColumn: 'span 1' }}>
          <h3 className="section-title">AI Review Scores Trend</h3>
          <div style={{ width: '100%', height: 300, marginTop: 16 }}>
            {aiTrend && aiTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={aiTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" />
                  <YAxis domain={[0, 100]} stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                  <Legend />
                  <Area type="monotone" dataKey="score" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} name="Average AI Score" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No AI review data yet</div>
            )}
          </div>
        </section>

        {/* Member Contribution */}
        <section className="card" style={{ gridColumn: 'span 1' }}>
          <h3 className="section-title">Member Contribution (Story Points)</h3>
          <div style={{ width: '100%', height: 300, marginTop: 16 }}>
            {memberContributions && memberContributions.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberContributions} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--text-muted)" />
                  <YAxis dataKey="user.username" type="category" stroke="var(--text-muted)" width={100} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                  <Legend />
                  <Bar dataKey="completedPoints" fill="#82ca9d" name="Completed Points" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No member contribution data</div>
            )}
          </div>
        </section>

        {/* Time Tracking Reports */}
        <section className="card" style={{ gridColumn: 'span 1' }}>
          <h3 className="section-title">Time Tracking (Hours per Member)</h3>
          <div style={{ width: '100%', height: 300, marginTop: 16 }}>
            {timeByUser && timeByUser.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeByUser} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--text-muted)" />
                  <YAxis dataKey="user.username" type="category" stroke="var(--text-muted)" width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'var(--text)' }} 
                    formatter={(val) => [(val / 3600000).toFixed(1) + ' hrs', 'Time Tracked']}
                  />
                  <Legend />
                  <Bar dataKey="totalDuration" fill="#ffc658" name="Total Hours" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No time tracking data</div>
            )}
          </div>
        </section>

        {/* Top 10 tasks by Time */}
        <section className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 className="section-title">Most Time-Consuming Tasks</h3>
          <div style={{ marginTop: 16, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: 12 }}>Task</th>
                  <th style={{ padding: 12 }}>Total Time Tracked (Hours)</th>
                </tr>
              </thead>
              <tbody>
                {timeByTask && timeByTask.length > 0 ? (
                  timeByTask.map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: 12 }}>{t.taskTitle}</td>
                      <td style={{ padding: 12 }}>{(t.totalDuration / 3600000).toFixed(1)} hrs</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} style={{ padding: 16, color: 'var(--text-muted)' }}>No time tracked on any tasks yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
