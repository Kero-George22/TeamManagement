import { useEffect, useMemo, useRef, useState } from 'react';
import API from '../lib/api';
import { ProgressBar } from './ui/Primitives';
import { useToast } from '../lib/toast';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function pct(value) {
  return Math.max(0, Math.min(100, Math.round(value || 0)));
}

function hours(ms) {
  return ((ms || 0) / 3600000).toFixed(1);
}

function userName(row) {
  return row?.user?.username || row?.user?.email?.split('@')[0] || 'Member';
}

function tooltipStyle() {
  return {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    boxShadow: '0 10px 30px rgba(15,23,42,.14)',
  };
}

export default function ProjectAnalyticsTab({ projectId }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const dashboardRef = useRef(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
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

  const model = useMemo(() => {
    if (!data) return null;

    const tasks = data.tasks || {};
    const completionRate = pct(tasks.completionRate);
    const pointRate = pct((tasks.completedPoints / tasks.totalPoints) * 100 || 0);
    const openTasks = Math.max(0, (tasks.total || 0) - (tasks.completed || 0));
    const health = completionRate >= 75 ? 'On track' : completionRate >= 40 ? 'Needs attention' : 'At risk';
    const healthColor = completionRate >= 75 ? 'var(--green)' : completionRate >= 40 ? '#f59e0b' : '#ef4444';

    const workload = (data.memberContributions || []).map((row) => {
      const time = (data.timeByUser || []).find((entry) => String(entry.user?._id) === String(row.user?._id));
      return {
        name: userName(row),
        points: row.completedPoints || 0,
        tasks: row.completedTasks || 0,
        hours: Number(hours(time?.totalDuration || 0)),
      };
    });

    for (const timeRow of data.timeByUser || []) {
      if (!workload.some((row) => row.name === userName(timeRow))) {
        workload.push({
          name: userName(timeRow),
          points: 0,
          tasks: 0,
          hours: Number(hours(timeRow.totalDuration || 0)),
        });
      }
    }

    return {
      project: data.project || {},
      tasks,
      completionRate,
      pointRate,
      openTasks,
      health,
      healthColor,
      workload,
      velocity: data.velocity || [],
      aiTrend: data.aiTrend || [],
      timeByTask: data.timeByTask || [],
    };
  }, [data]);

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
  if (!model) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn--outline" onClick={handleExportPDF}>
          <i className="fa-solid fa-file-pdf" style={{ marginRight: 8 }} /> Export PDF
        </button>
      </div>

      <div ref={dashboardRef} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <section className="workspace-panel" style={{ margin: 0, overflow: 'hidden' }}>
          <div className="analytics-hero-grid" style={{ padding: 22 }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '.78rem', fontWeight: 700, textTransform: 'uppercase' }}>Project analytics</div>
              <h2 style={{ margin: '6px 0 10px', fontSize: '1.55rem', lineHeight: 1.2 }}>{model.project.title || 'Project'}</h2>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '.86rem' }}>
                <span><i className="fa-solid fa-circle" style={{ color: model.healthColor, marginRight: 6 }} />{model.health}</span>
                <span>{model.project.status}</span>
                <span>{model.project.members || 0} members</span>
                <span>{model.openTasks} open tasks</span>
              </div>
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontWeight: 800 }}>
                <span>Completion</span>
                <span>{model.completionRate}%</span>
              </div>
              <ProgressBar value={model.completionRate} />
              <div style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: '.82rem' }}>
                {model.tasks.completed || 0} of {model.tasks.total || 0} tasks closed
              </div>
            </div>
          </div>
        </section>

        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          <div className="stat-card" style={{ border: '1px solid var(--border)', boxShadow: 'none' }}>
            <div className="stat-card__label">Task Progress</div>
            <div className="stat-card__value">{model.completionRate}%</div>
            <div className="stat-card__sub">{model.tasks.completed || 0}/{model.tasks.total || 0} complete</div>
          </div>
          <div className="stat-card" style={{ border: '1px solid var(--border)', boxShadow: 'none' }}>
            <div className="stat-card__label">Story Points</div>
            <div className="stat-card__value">{model.pointRate}%</div>
            <div className="stat-card__sub">{model.tasks.completedPoints || 0}/{model.tasks.totalPoints || 0} points</div>
          </div>
          <div className="stat-card" style={{ border: '1px solid var(--border)', boxShadow: 'none' }}>
            <div className="stat-card__label">Velocity</div>
            <div className="stat-card__value">{model.velocity.at(-1)?.points || 0}</div>
            <div className="stat-card__sub">points last week</div>
          </div>
          <div className="stat-card" style={{ border: '1px solid var(--border)', boxShadow: 'none' }}>
            <div className="stat-card__label">AI Quality</div>
            <div className="stat-card__value">{model.aiTrend.at(-1)?.score || 0}</div>
            <div className="stat-card__sub">latest review score</div>
          </div>
        </div>

        <div className="workspace-grid" style={{ alignItems: 'stretch' }}>
          <section className="workspace-panel" style={{ margin: 0 }}>
            <div className="workspace-header">
              <div>
                <h3 className="section-title" style={{ marginBottom: 4 }}>Project Burnup</h3>
                <div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Completed work by week.</div>
              </div>
            </div>
            <div style={{ height: 310, padding: '0 12px 14px' }}>
              {model.velocity.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={model.velocity}>
                    <defs>
                      <linearGradient id="velocityFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="var(--blue)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="week" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" />
                    <Tooltip contentStyle={tooltipStyle()} />
                    <Area type="monotone" dataKey="points" stroke="var(--blue)" fill="url(#velocityFill)" strokeWidth={2} name="Story points" />
                    <Line type="monotone" dataKey="tasks" stroke="var(--green)" strokeWidth={2} name="Tasks" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ height: '100%' }}>
                  <i className="fa-solid fa-chart-line" />
                  <h4>No velocity yet</h4>
                </div>
              )}
            </div>
          </section>

          <aside className="dashboard-stack">
            <section className="workspace-panel" style={{ margin: 0 }}>
              <div className="workspace-header">
                <div>
                  <h3 className="section-title" style={{ marginBottom: 4 }}>Goal Health</h3>
                  <div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Tasks and points closed.</div>
                </div>
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontWeight: 700, fontSize: '.86rem' }}>
                    <span>Tasks</span><span>{model.completionRate}%</span>
                  </div>
                  <ProgressBar value={model.completionRate} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontWeight: 700, fontSize: '.86rem' }}>
                    <span>Points</span><span>{model.pointRate}%</span>
                  </div>
                  <ProgressBar value={model.pointRate} />
                </div>
              </div>
            </section>

            <section className="workspace-panel" style={{ margin: 0 }}>
              <div className="workspace-header">
                <div>
                  <h3 className="section-title" style={{ marginBottom: 4 }}>AI Review Trend</h3>
                  <div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Average score by review day.</div>
                </div>
              </div>
              <div style={{ height: 190, padding: '0 12px 14px' }}>
                {model.aiTrend.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={model.aiTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" stroke="var(--text-muted)" />
                      <YAxis domain={[0, 100]} stroke="var(--text-muted)" />
                      <Tooltip contentStyle={tooltipStyle()} />
                      <Line type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} name="Score" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state" style={{ height: '100%', padding: 0 }}>
                    <h4>No review scores</h4>
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>

        <div className="analytics-two-col">
          <section className="workspace-panel" style={{ margin: 0 }}>
            <div className="workspace-header">
              <div>
                <h3 className="section-title" style={{ marginBottom: 4 }}>Workload</h3>
                <div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Contribution and tracked hours by member.</div>
              </div>
            </div>
            <div style={{ height: 320, padding: '0 12px 14px' }}>
              {model.workload.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={model.workload} layout="vertical" margin={{ left: 18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--text-muted)" />
                    <YAxis dataKey="name" type="category" stroke="var(--text-muted)" width={110} />
                    <Tooltip contentStyle={tooltipStyle()} />
                    <Bar dataKey="points" fill="var(--blue)" name="Completed points" radius={[0, 6, 6, 0]} />
                    <Bar dataKey="hours" fill="var(--green)" name="Tracked hours" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ height: '100%' }}>
                  <i className="fa-solid fa-users" />
                  <h4>No workload data</h4>
                </div>
              )}
            </div>
          </section>

          <section className="workspace-panel" style={{ margin: 0 }}>
            <div className="workspace-header">
              <div>
                <h3 className="section-title" style={{ marginBottom: 4 }}>Time Hotspots</h3>
                <div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Tasks with the most tracked time.</div>
              </div>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {model.timeByTask.length ? model.timeByTask.map((task, index) => {
                const max = Math.max(...model.timeByTask.map((row) => row.totalDuration || 0), 1);
                const width = pct(((task.totalDuration || 0) / max) * 100);
                return (
                  <div key={task._id || index} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: '.84rem' }}>
                      <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.taskTitle}</span>
                      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{hours(task.totalDuration)} hrs</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: 'var(--surface-hover)', overflow: 'hidden' }}>
                      <div style={{ width: `${width}%`, height: '100%', background: 'var(--blue)' }} />
                    </div>
                  </div>
                );
              }) : (
                <div className="empty-state" style={{ padding: '30px 0' }}>
                  <i className="fa-regular fa-clock" />
                  <h4>No time tracked</h4>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
