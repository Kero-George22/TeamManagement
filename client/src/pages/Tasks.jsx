import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { SpinnerWrap } from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../api/index.js';
import { priorityColor, timeAgo } from '../utils.js';

const FILTERS = ['all', 'todo', 'in-progress', 'review', 'done'];

export default function Tasks() {
  const navigate = useNavigate();
  const toast = useToast();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [endpointMissing, setEndpointMissing] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setEndpointMissing(false);
    try {
      const data = await api.get('/tasks/my');
      setTasks(data.tasks || data || []);
    } catch (err) {
      if (err?.status === 404) {
        setEndpointMissing(true);
        setTasks([]);
      } else {
        toast.error(err.message || 'Failed to load tasks');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const stats = useMemo(() => {
    const count = { total: tasks.length, todo: 0, inProgress: 0, review: 0, done: 0 };
    for (const task of tasks) {
      const status = String(task.status || '').toLowerCase();
      if (status === 'todo') count.todo += 1;
      if (status === 'in-progress') count.inProgress += 1;
      if (status === 'review') count.review += 1;
      if (status === 'done') count.done += 1;
    }
    return count;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let list = tasks;

    if (filter !== 'all') {
      list = list.filter((task) => String(task.status || '').toLowerCase() === filter);
    }

    if (!normalizedQuery) return list;

    return list.filter((task) => {
      const projectTitle = typeof task.project === 'object' ? task.project?.title : '';
      const text = [task.title, task.description, task.assignedRole, projectTitle]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(normalizedQuery);
    });
  }, [tasks, filter, query]);

  if (loading) {
    return (
      <Layout>
        <SpinnerWrap />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header" style={{ marginBottom: 18 }}>
        <div>
          <div className="page-title">MY TASKS</div>
          <div className="page-sub">ROLE-FOCUSED WORK QUEUE</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={loadTasks}>↻ Refresh</button>
      </div>

      <div className="stat-cards mb-6">
        <div className="stat-card"><span className="sc-icon">📋</span><div className="sc-val">{stats.total}</div><div className="sc-lbl">Total</div></div>
        <div className="stat-card"><span className="sc-icon">🧩</span><div className="sc-val">{stats.todo}</div><div className="sc-lbl">Todo</div></div>
        <div className="stat-card gold"><span className="sc-icon">⚙️</span><div className="sc-val">{stats.inProgress}</div><div className="sc-lbl">In Progress</div></div>
        <div className="stat-card purple"><span className="sc-icon">🔍</span><div className="sc-val">{stats.review}</div><div className="sc-lbl">Review</div></div>
        <div className="stat-card green"><span className="sc-icon">✅</span><div className="sc-val">{stats.done}</div><div className="sc-lbl">Done</div></div>
      </div>

      <div className="search-bar" style={{ marginBottom: 14 }}>
        <span>🔎</span>
        <input
          placeholder="Search title, description, role, project..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {FILTERS.map((value) => (
          <button
            key={value}
            className={`btn btn-sm ${filter === value ? 'btn-cyan' : 'btn-ghost'}`}
            onClick={() => setFilter(value)}
          >
            {value === 'all' ? 'All' : value}
          </button>
        ))}
      </div>

      {endpointMissing ? (
        <EmptyState
          icon="⚠️"
          text="Tasks feed endpoint is not available"
          sub="Enable GET /tasks/my in the backend to power this page."
        />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon="📭"
          text="No matching tasks"
          sub={filter !== 'all' ? `No ${filter} tasks right now.` : 'Your personal queue is empty.'}
        />
      ) : (
        filteredTasks.map((task) => {
          const cardStatusClass = String(task.status || 'todo').toLowerCase().replace(/\s+/g, '-');
          const projectTitle = typeof task.project === 'object' ? task.project?.title : null;

          return (
            <div
              key={task._id}
              className={`task-card ${cardStatusClass}`}
              onClick={() => navigate('/tasks/' + task._id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div className="task-card-title">{task.title}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <StatusBadge status={task.status} />
                  {task.priority && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: priorityColor(task.priority) }}>
                      {task.priority}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>
                {task.description}
              </div>

              <div className="task-card-meta" style={{ justifyContent: 'space-between' }}>
                <span>⚡ {task.xpPoints || 0} XP</span>
                {projectTitle && <span>📦 {projectTitle}</span>}
                {task.assignedRole && <span>🎯 {task.assignedRole}</span>}
                <span>{timeAgo(task.createdAt)}</span>
              </div>
            </div>
          );
        })
      )}
    </Layout>
  );
}