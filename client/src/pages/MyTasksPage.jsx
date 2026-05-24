import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import Topbar from '../components/layout/Topbar';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import TaskSidePanel from '../components/ui/TaskSidePanel';
import { useToast } from '../lib/toast';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalProject } from '../contexts/ProjectContext';

const PRIORITY_CONFIG = {
  High:   { color: '#ef4444', bg: 'rgba(239,68,68,.12)',   icon: '↑' },
  Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,.12)',  icon: '→' },
  Low:    { color: '#22c55e', bg: 'rgba(34,197,94,.12)',   icon: '↓' },
};

const STATUS_CONFIG = {
  'Todo':        { color: '#6b7280', label: 'To Do' },
  'In-Progress': { color: '#3b82f6', label: 'In Progress' },
  'Review':      { color: '#8b5cf6', label: 'Review' },
  'Done':        { color: '#22c55e', label: 'Done' },
  'Approved':    { color: '#14b8a6', label: 'Approved' },
};

function getTaskDateGroup(task) {
  if (!task.deadline) return 'later';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadline = new Date(task.deadline);
  deadline.setHours(0, 0, 0, 0);
  const diff = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 7) return 'upcoming';
  return 'later';
}

const GROUP_ORDER = ['today', 'upcoming', 'later', 'overdue'];
const GROUP_LABELS = {
  today: '📅 Today',
  upcoming: '📅 Upcoming',
  later: '📅 Later',
  overdue: '⏰ Overdue',
};

export default function MyTasksPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects } = useGlobalProject();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ project: '', priority: '', status: '' });
  const [selectedTask, setSelectedTask] = useState(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await API.tasks.dashboardOverview();
      setTasks(response?.tasks || []);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filter.project && String(t.projectRef?._id || t.project) !== filter.project) return false;
      if (filter.priority && t.priority !== filter.priority) return false;
      if (filter.status && t.status !== filter.status) return false;
      return true;
    });
  }, [tasks, filter]);

  const groupedTasks = useMemo(() => {
    const groups = { today: [], upcoming: [], later: [], overdue: [] };
    filteredTasks.forEach(task => {
      const group = getTaskDateGroup(task);
      groups[group].push(task);
    });
    // Sort each group by priority then deadline
    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    Object.values(groups).forEach(arr => {
      arr.sort((a, b) => {
        const pDiff = (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
        if (pDiff !== 0) return pDiff;
        if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
        return 0;
      });
    });
    return groups;
  }, [filteredTasks]);

  const stats = useMemo(() => {
    const today = groupedTasks.today.length;
    const overdue = groupedTasks.overdue.length;
    const inProgress = tasks.filter(t => t.status === 'In-Progress').length;
    const done = tasks.filter(t => t.status === 'Done' || t.status === 'Approved').length;
    return { today, overdue, inProgress, done };
  }, [groupedTasks, tasks]);

  async function updateTaskStatus(taskId, newStatus) {
    try {
      await API.tasks.status(taskId, newStatus);
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
      toast.success(`Status → "${newStatus}"`);
    } catch (e) {
      toast.error(e.message || 'Failed to update status');
    }
  }

  if (loading) {
    return (
      <>
        <Topbar title="My Tasks" />
        <div className="skeleton" style={{ height: 300, borderRadius: 'var(--card-radius)' }} />
      </>
    );
  }

  return (
    <>
      <Topbar title="My Tasks" />

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-card__label">Due Today</div>
          <div className="stat-card__value" style={{ color: stats.today > 0 ? 'var(--green)' : 'inherit' }}>{stats.today}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Overdue</div>
          <div className="stat-card__value" style={{ color: stats.overdue > 0 ? '#ef4444' : 'inherit' }}>{stats.overdue}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">In Progress</div>
          <div className="stat-card__value">{stats.inProgress}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Completed</div>
          <div className="stat-card__value">{stats.done}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <select
            className="form-input"
            value={filter.project}
            onChange={e => setFilter(f => ({ ...f, project: e.target.value }))}
            style={{ flex: '1 1 150px', minWidth: 120 }}
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p._id} value={p._id}>{p.title}</option>
            ))}
          </select>
          <select
            className="form-input"
            value={filter.priority}
            onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}
            style={{ flex: '0 1 120px' }}
          >
            <option value="">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select
            className="form-input"
            value={filter.status}
            onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
            style={{ flex: '0 1 140px' }}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          {(filter.project || filter.priority || filter.status) && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setFilter({ project: '', priority: '', status: '' })}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Task Groups */}
      {GROUP_ORDER.map(groupKey => {
        const groupTasks = groupedTasks[groupKey];
        if (groupTasks.length === 0) return null;

        return (
          <div key={groupKey} style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              {GROUP_LABELS[groupKey]}
              <Badge variant="gray">{groupTasks.length}</Badge>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {groupTasks.map(task => (
                <TaskRow
                  key={task._id}
                  task={task}
                  projects={projects}
                  onStatusChange={updateTaskStatus}
                  onOpen={() => setSelectedTask(task)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {filteredTasks.length === 0 && (
        <div className="empty-state card">
          <i className="fa-solid fa-clipboard-check" />
          <h4>No tasks found</h4>
          <p>{tasks.length === 0 ? 'You have no tasks yet. Join a project to get started!' : 'Try adjusting your filters.'}</p>
        </div>
      )}

      {selectedTask && (
        <TaskSidePanel
          task={selectedTask}
          onClose={() => { setSelectedTask(null); loadTasks(); }}
          isOwner={projects.find(p => p._id === (selectedTask.projectRef?._id || selectedTask.project))?.owner === user?._id}
          isMember={true}
          userId={user?._id}
          projectId={selectedTask.projectRef?._id || selectedTask.project}
          onTaskUpdate={t => setTasks(curr => curr.map(task => task._id === t._id ? { ...task, ...t } : task))}
        />
      )}
    </>
  );
}

function TaskRow({ task, projects, onStatusChange, onOpen }) {
  const project = task.projectRef || projects.find(p => p._id === task.project) || {};
  const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Medium;
  const sCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG['Todo'];
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'Done' && task.status !== 'Approved';

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 16px',
        cursor: 'pointer',
        borderLeft: `3px solid ${pCfg.color}`,
        transition: 'all .15s',
      }}
      onClick={onOpen}
    >
      {/* Checkbox / Status dropdown replacing just the checkmark to match Board exact options */}
      <div style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <select
          value={task.status}
          onChange={e => onStatusChange(task._id, e.target.value)}
          style={{ fontSize: '.7rem', padding: '2px 4px', borderRadius: 4, background: task.status === 'Done' || task.status === 'Approved' ? 'var(--green-bg)' : 'transparent', color: task.status === 'Done' || task.status === 'Approved' ? 'var(--green)' : 'inherit', border: '1px solid var(--border)' }}
        >
          {Object.entries(STATUS_CONFIG).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: 4, textDecoration: (task.status === 'Done' || task.status === 'Approved') ? 'line-through' : 'none' }}>
          {task.title}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontSize: '.75rem', color: 'var(--text-muted)' }}>
          <span style={{ color: project.title ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
            {project.title || 'Unknown project'}
          </span>
          {task.deadline && (
            <span style={{ color: isOverdue ? '#ef4444' : 'inherit' }}>
              <i className="fa-regular fa-calendar" style={{ marginRight: 4 }} />
              {new Date(task.deadline).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.7rem', fontWeight: 600, color: pCfg.color }}>
          {pCfg.icon} {task.priority}
        </span>
        {Array.isArray(task.assignedTo) && task.assignedTo.length > 0 && task.assignedTo[0]._id && (
          <div style={{ display: 'flex' }}>
            {task.assignedTo.map((u, i) => (
              <div key={u._id || i} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i, border: '2px solid var(--bg-card)', borderRadius: '50%' }}>
                <Avatar user={u} size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
