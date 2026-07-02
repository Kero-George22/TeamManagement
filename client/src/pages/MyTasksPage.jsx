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
  if (diff > 0 && diff <= 7) return 'this_week';
  if (diff > 7 && diff <= 14) return 'next_week';
  return 'later';
}

const TIME_GROUP_ORDER = ['overdue', 'today', 'this_week', 'next_week', 'later'];
const TIME_GROUP_LABELS = {
  overdue: '⏰ Overdue',
  today: '📅 Do Today',
  this_week: '📅 Do This Week',
  next_week: '📅 Do Next Week',
  later: '📅 Do Later',
};

const STATUS_GROUP_ORDER = ['Todo', 'In-Progress', 'Review', 'Done', 'Approved'];

export default function MyTasksPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects } = useGlobalProject();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for grouping and filtering
  const [groupBy, setGroupBy] = useState('time'); // 'time', 'project', 'status'
  const [filter, setFilter] = useState({
    search: '',
    project: '',
    priority: '',
    status: '',
    dueDate: '', // 'today', 'this_week', 'next_week', 'later', 'overdue'
    assignee: '', // 'me', 'unassigned'
  });
  
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
      // 1. Search
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const matchesTitle = t.title?.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc) return false;
      }
      // 2. Project
      if (filter.project && String(t.projectRef?._id || t.project) !== filter.project) return false;
      // 3. Priority
      if (filter.priority && t.priority !== filter.priority) return false;
      // 4. Status
      if (filter.status && t.status !== filter.status) return false;
      // 5. Due Date
      if (filter.dueDate) {
        const dateGroup = getTaskDateGroup(t);
        if (dateGroup !== filter.dueDate) return false;
      }
      // 6. Assignee
      if (filter.assignee) {
        const isAssignedToMe = t.assignedTo?.some(u => String(u._id || u) === String(user?._id));
        const isUnassigned = !t.assignedTo || t.assignedTo.length === 0;
        if (filter.assignee === 'me' && !isAssignedToMe) return false;
        if (filter.assignee === 'unassigned' && !isUnassigned) return false;
      }
      
      return true;
    });
  }, [tasks, filter, user]);

  const groupedTasks = useMemo(() => {
    const groups = {};
    
    if (groupBy === 'time') {
      TIME_GROUP_ORDER.forEach(k => groups[k] = { label: TIME_GROUP_LABELS[k], tasks: [] });
      filteredTasks.forEach(t => groups[getTaskDateGroup(t)]?.tasks.push(t));
    } 
    else if (groupBy === 'status') {
      STATUS_GROUP_ORDER.forEach(k => groups[k] = { label: STATUS_CONFIG[k].label, tasks: [] });
      filteredTasks.forEach(t => {
        if (groups[t.status]) groups[t.status].tasks.push(t);
        else {
          if (!groups['Other']) groups['Other'] = { label: 'Other', tasks: [] };
          groups['Other'].tasks.push(t);
        }
      });
    }
    else if (groupBy === 'project') {
      filteredTasks.forEach(t => {
        const pId = String(t.projectRef?._id || t.project || 'unknown');
        const pName = t.projectRef?.title || 'Unknown Project';
        if (!groups[pId]) groups[pId] = { label: pName, tasks: [] };
        groups[pId].tasks.push(t);
      });
    }

    // Sort tasks within each group
    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    Object.values(groups).forEach(g => {
      g.tasks.sort((a, b) => {
        const pDiff = (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
        if (pDiff !== 0) return pDiff;
        if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
        return 0;
      });
    });
    
    return groups;
  }, [filteredTasks, groupBy]);

  async function updateTaskStatus(taskId, newStatus) {
    try {
      await API.tasks.status(taskId, newStatus);
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
      toast.success(`Status → "${newStatus}"`);
    } catch (e) {
      toast.error(e.message || 'Failed to update status');
    }
  }
  
  const hasActiveFilters = filter.search || filter.project || filter.priority || filter.status || filter.dueDate || filter.assignee;

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

      {/* Control Bar: Filters & Grouping */}
      <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          
          <div style={{ flex: '1 1 200px', position: 'relative' }}>
            <i className="fa-solid fa-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search tasks..." 
              style={{ paddingLeft: 38, width: '100%' }}
              value={filter.search}
              onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            />
          </div>

          <select className="form-input" value={filter.project} onChange={e => setFilter(f => ({ ...f, project: e.target.value }))} style={{ flex: '0 1 160px' }}>
            <option value="">📁 All Projects</option>
            {projects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
          </select>
          
          <select className="form-input" value={filter.dueDate} onChange={e => setFilter(f => ({ ...f, dueDate: e.target.value }))} style={{ flex: '0 1 150px' }}>
            <option value="">📅 Any Date</option>
            <option value="overdue">Overdue</option>
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="next_week">Next Week</option>
            <option value="later">Later</option>
          </select>

          <select className="form-input" value={filter.assignee} onChange={e => setFilter(f => ({ ...f, assignee: e.target.value }))} style={{ flex: '0 1 150px' }}>
            <option value="">👤 All Assignees</option>
            <option value="me">Assigned to Me</option>
            <option value="unassigned">Unassigned</option>
          </select>

          <select className="form-input" value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))} style={{ flex: '0 1 140px' }}>
            <option value="">🔴 Any Priority</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select className="form-input" value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))} style={{ flex: '0 1 140px' }}>
            <option value="">📊 Any Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
          </select>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
            <span style={{ fontSize: '.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Group By:</span>
            <select className="form-input" value={groupBy} onChange={e => setGroupBy(e.target.value)} style={{ flex: '0 1 120px', background: 'var(--bg)' }}>
              <option value="time">Time</option>
              <option value="project">Project</option>
              <option value="status">Status</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button className="btn btn--ghost btn--sm" onClick={() => setFilter({ search: '', project: '', priority: '', status: '', dueDate: '', assignee: '' })}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Task Groups */}
      {Object.entries(groupedTasks).map(([groupKey, group]) => {
        if (group.tasks.length === 0) return null;

        return (
          <div key={groupKey} style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              {group.label}
              <Badge variant="gray">{group.tasks.length}</Badge>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {group.tasks.map(task => (
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
          <p>{tasks.length === 0 ? 'You have no tasks yet. Join a project to get started!' : 'No tasks match your current filters.'}</p>
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
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'Done' && task.status !== 'Approved';

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 20px',
        cursor: 'pointer',
        borderLeft: `4px solid ${pCfg.color}`,
        transition: 'all .15s',
      }}
      onClick={onOpen}
    >
      <div style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <select
          value={task.status}
          onChange={e => onStatusChange(task._id, e.target.value)}
          style={{ 
            fontSize: '.75rem', 
            padding: '4px 8px', 
            borderRadius: 6, 
            background: task.status === 'Done' || task.status === 'Approved' ? 'var(--green-bg)' : 'var(--bg)', 
            color: task.status === 'Done' || task.status === 'Approved' ? 'var(--green)' : 'inherit', 
            border: '1px solid var(--border)',
            fontWeight: 600
          }}
        >
          {Object.entries(STATUS_CONFIG).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '.95rem', marginBottom: 6, textDecoration: (task.status === 'Done' || task.status === 'Approved') ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {task.title}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', fontSize: '.75rem', color: 'var(--text-muted)' }}>
          <span style={{ color: project.title ? 'var(--text-secondary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="fa-solid fa-folder" style={{ color: 'var(--blue)' }} /> {project.title || 'Unknown project'}
          </span>
          {task.deadline && (
            <span style={{ color: isOverdue ? '#ef4444' : 'inherit', display: 'flex', alignItems: 'center', gap: 4, fontWeight: isOverdue ? 600 : 400 }}>
              <i className="fa-regular fa-calendar" />
              {new Date(task.deadline).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.75rem', fontWeight: 600, color: pCfg.color, background: pCfg.bg, padding: '4px 8px', borderRadius: 6 }}>
          {pCfg.icon} {task.priority}
        </span>
        
        {Array.isArray(task.assignedTo) && task.assignedTo.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {task.assignedTo.map((u, i) => (
              <div key={u._id || i} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i, border: '2px solid var(--white)', borderRadius: '50%' }}>
                <Avatar user={u} size="sm" />
              </div>
            ))}
          </div>
        ) : (
          <Badge variant="gray">Unassigned</Badge>
        )}
      </div>
    </div>
  );
}
