import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalProject } from '../contexts/ProjectContext';
import { useToast } from '../lib/toast';
import API from '../lib/api';
import Topbar from '../components/layout/Topbar';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import TaskSidePanel from '../components/ui/TaskSidePanel';
import { fmtDate } from '../lib/utils';

const CARD_COLORS = ['yellow', 'blue', 'pink', 'green', 'purple', 'orange', 'teal', 'indigo', 'cyan', 'red'];
function getProjectColor(projectId) {
  if (!projectId) return 'gray';
  const sum = String(projectId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CARD_COLORS[sum % CARD_COLORS.length];
}

const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CAL_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PRIORITY_CONFIG = {
  High:   { color: '#ef4444', bg: 'rgba(239,68,68,.12)',   label: 'High',   icon: '↑' },
  Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,.12)',  label: 'Medium', icon: '→' },
  Low:    { color: '#22c55e', bg: 'rgba(34,197,94,.12)',   label: 'Low',    icon: '↓' },
};

const STATUS_CONFIG = {
  'Todo':        { color: '#6b7280', bg: '#f3f4f6',              label: 'To Do' },
  'In-Progress': { color: '#3b82f6', bg: 'rgba(59,130,246,.12)', label: 'In Progress' },
  'Review':      { color: '#8b5cf6', bg: 'rgba(139,92,246,.12)', label: 'Review' },
  'Done':        { color: '#22c55e', bg: 'rgba(34,197,94,.12)',  label: 'Done' },
  'Approved':    { color: '#14b8a6', bg: 'rgba(20,184,166,.12)', label: 'Approved' },
};

/* ─── Date Picker Popover ────────────────────────────────── */
// Uses position:fixed to escape parent overflow:hidden clipping.
function DatePickerPopover({ value, onChange, onClose, anchorPos }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selected = value ? new Date(value + 'T00:00:00') : null;

  const [viewDate, setViewDate] = useState(() => {
    const d = selected ? new Date(selected) : new Date();
    d.setDate(1); d.setHours(0, 0, 0, 0);
    return d;
  });

  const popoverRef = useRef(null);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayIdx = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();

  const cells = [];
  for (let x = firstDayIdx; x > 0; x--)
    cells.push({ day: daysInPrev - x + 1, cur: false, date: new Date(year, month - 1, daysInPrev - x + 1) });
  for (let i = 1; i <= daysInMonth; i++)
    cells.push({ day: i, cur: true, date: new Date(year, month, i) });
  const rem = 42 - cells.length;
  for (let i = 1; i <= rem; i++)
    cells.push({ day: i, cur: false, date: new Date(year, month + 1, i) });

  function toYMD(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Close on outside click — use a ref for the handler so it doesn't re-register every render
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) onCloseRef.current();
    };
    // Small delay prevents the same click that opened the picker from immediately closing it
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, []); // intentionally empty — handler always calls the latest onClose via ref

  const POPOVER_W = 288;
  const safeLeft = anchorPos
    ? Math.min(anchorPos.left, window.innerWidth - POPOVER_W - 8)
    : 0;
  // anchorPos.top already includes the offset below the button
  const safeTop = anchorPos ? anchorPos.top : 0;

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: safeTop,
        left: safeLeft,
        zIndex: 99999,
        background: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 16,
        width: POPOVER_W,
        boxShadow: '0 12px 40px rgba(0,0,0,.22)',
        animation: 'fadeInDown .15s ease',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          style={{ background: 'none', border: 'none', fontSize: '1.1rem', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 10px', borderRadius: 8, lineHeight: 1 }}
        >‹</button>
        <span style={{ fontWeight: 700, fontSize: '.875rem', color: 'var(--text-primary)' }}>
          {MONTHS[month]} {year}
        </span>
        <button
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          style={{ background: 'none', border: 'none', fontSize: '1.1rem', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 10px', borderRadius: 8, lineHeight: 1 }}
        >›</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAYS_SHORT.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '.65rem', fontWeight: 700, color: 'var(--text-muted)', padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      {/* Days */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((c, i) => {
          const isToday    = c.cur && c.date.getTime() === today.getTime();
          const isSelected = selected && toYMD(c.date) === toYMD(selected);
          return (
            <button
              key={i}
              onClick={() => { if (c.cur) { onChange(toYMD(c.date)); onClose(); } }}
              style={{
                width: '100%', aspectRatio: '1', border: 'none',
                cursor: c.cur ? 'pointer' : 'default',
                borderRadius: 8, fontSize: '.75rem',
                fontWeight: isSelected || isToday ? 700 : 500,
                background: isSelected ? 'var(--green)' : isToday ? 'var(--green-bg)' : 'transparent',
                color: isSelected ? '#fff' : isToday ? '#16a34a' : c.cur ? 'var(--text-primary)' : 'var(--text-muted)',
                opacity: c.cur ? 1 : 0.4,
                transition: 'background .12s',
              }}
              onMouseEnter={e => { if (c.cur && !isSelected) e.currentTarget.style.background = 'rgba(0,0,0,.06)'; }}
              onMouseLeave={e => { if (c.cur && !isSelected) e.currentTarget.style.background = 'transparent'; }}
            >{c.day}</button>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 12, display: 'flex', gap: 6, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        {value && (
          <button
            onClick={() => { onChange(''); onClose(); }}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 99, padding: '4px 12px', fontSize: '.75rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >Clear</button>
        )}
        <button
          onClick={() => { onChange(toYMD(today)); onClose(); }}
          style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 99, padding: '4px 12px', fontSize: '.75rem', cursor: 'pointer', fontWeight: 600 }}
        >Today</button>
      </div>
    </div>
  );
}

/* ─── Pill Dropdown ──────────────────────────────────────── */
// Uses position:fixed to escape parent overflow:hidden clipping.
function PillDropdown({ label, icon, options, value, onChange, accentColor, accentBg }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const dropRef    = useRef(null);

  function openDropdown() {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const DROP_W = 180;
      const DROP_H = options.length * 40 + 16; // approximate
      const safeLeft = Math.min(r.left, window.innerWidth - DROP_W - 8);
      const spaceBelow = window.innerHeight - r.bottom;
      const top = spaceBelow >= DROP_H
        ? r.bottom + 5
        : Math.max(8, r.top - DROP_H - 5);
      setPos({ top, left: safeLeft });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) setOpen(false);
    };
    // Delay so the click that opened this dropdown doesn't immediately close it
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [open]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={triggerRef}
        onClick={open ? () => setOpen(false) : openDropdown}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          border: `1.5px dashed ${accentColor || 'var(--border)'}`,
          borderRadius: 99, padding: '4px 10px', fontSize: '.75rem', fontWeight: 600,
          cursor: 'pointer', background: accentBg || 'transparent',
          color: accentColor || 'var(--text-secondary)',
          transition: 'all .15s',
        }}
      >
        {icon && <span style={{ fontSize: '.8rem' }}>{icon}</span>}
        {label}
        <span style={{ fontSize: '.6rem', opacity: .7 }}>▾</span>
      </button>
      {open && (
        <div
          ref={dropRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 99999,
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 8px 30px rgba(0,0,0,.18)',
            minWidth: 160,
            overflow: 'hidden',
            animation: 'fadeInDown .12s ease',
          }}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '9px 14px', border: 'none',
                background: value === opt.value ? 'var(--bg)' : 'transparent',
                fontSize: '.8rem', cursor: 'pointer', textAlign: 'left',
                color: opt.color || 'var(--text-primary)',
                fontWeight: value === opt.value ? 700 : 500,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={e => e.currentTarget.style.background = value === opt.value ? 'var(--bg)' : 'transparent'}
            >
              {opt.dot && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color, flexShrink: 0, display: 'inline-block' }} />
              )}
              {opt.icon && <span>{opt.icon}</span>}
              {opt.label}
              {value === opt.value && <span style={{ marginLeft: 'auto', fontSize: '.65rem', opacity: .5 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Inline Task Composer ─────────────────────────────── */
function InlineTaskComposer({ sectionId, initialPriority = 'Medium', initialStatus, newTaskInput, setNewTaskInput, onSubmit, onCancel, projectMembers, user }) {
  const dateBtnRef = useRef(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [datePos, setDatePos] = useState({ top: 0, left: 0 });

  function openDatePicker() {
    if (dateBtnRef.current) {
      const r = dateBtnRef.current.getBoundingClientRect();
      const PICKER_W = 288;
      const PICKER_H = 340; // approximate height of the date picker
      const safeLeft = Math.min(r.left, window.innerWidth - PICKER_W - 8);
      const spaceBelow = window.innerHeight - r.bottom;
      // Flip above the button if not enough space below
      const top = spaceBelow >= PICKER_H
        ? r.bottom + 6
        : Math.max(8, r.top - PICKER_H - 6);
      setDatePos({ top, left: safeLeft });
    }
    setDateOpen(true);
  }

  const priorityOpts = [
    { value: 'High',   label: 'High',   color: '#ef4444', dot: true },
    { value: 'Medium', label: 'Medium', color: '#f59e0b', dot: true },
    { value: 'Low',    label: 'Low',    color: '#22c55e', dot: true },
  ];

  const statusOpts = Object.entries(STATUS_CONFIG).map(([k, v]) => ({
    value: k, label: v.label, color: v.color, dot: true,
  }));

  const assigneeOpts = [
    { value: 'me',         label: 'Assign to me',  icon: '👤' },
    { value: 'unassigned', label: 'Unassigned',     icon: '—' },
    ...projectMembers.map(m => {
      const id   = m.user?._id || m.userId?._id || m.userId;
      const name = m.user?.username || m.user?.email?.split('@')[0] || 'Member';
      return id ? { value: id, label: name, icon: '👤' } : null;
    }).filter(Boolean),
  ];

  const pCfg = PRIORITY_CONFIG[newTaskInput.priority] || PRIORITY_CONFIG.Medium;
  const sCfg = STATUS_CONFIG[newTaskInput.status] || STATUS_CONFIG['Todo'];

  const dateLabel = newTaskInput.deadline
    ? (() => {
        const [y, m, d] = newTaskInput.deadline.split('-');
        return `${MONTHS[parseInt(m, 10) - 1].slice(0, 3)} ${parseInt(d, 10)}`;
      })()
    : null;

  function handleKeyDown(e) {
    if (e.key === 'Escape') { onCancel(); return; }
    if (e.key === 'Enter' && !e.shiftKey && e.target?.name !== 'requirements') {
      e.preventDefault(); onSubmit(sectionId);
    }
  }

  return (
    <div style={{
      border: '1.5px solid var(--green)', borderRadius: 14, padding: '14px 16px',
      background: 'var(--white)', display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: '0 4px 20px rgba(34,197,94,.1)',
    }}>
      {/* ── Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <i className="fa-regular fa-circle-check" style={{ color: 'var(--text-muted)', fontSize: '1rem', flexShrink: 0 }} />
        <input
          autoFocus
          type="text"
          value={newTaskInput.title}
          onChange={e => setNewTaskInput(prev => ({ ...prev, section: sectionId, title: e.target.value }))}
          onKeyDown={handleKeyDown}
          placeholder="Write a task name"
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: '.975rem', fontWeight: 600, color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* ── Property Pill Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 26 }}>
        {/* Priority */}
        <PillDropdown
          label={pCfg.label}
          icon={pCfg.icon}
          value={newTaskInput.priority}
          onChange={v => setNewTaskInput(prev => ({ ...prev, priority: v }))}
          options={priorityOpts}
          accentColor={pCfg.color}
          accentBg={pCfg.bg}
        />

        {/* Status */}
        <PillDropdown
          label={sCfg.label}
          value={newTaskInput.status}
          onChange={v => setNewTaskInput(prev => ({ ...prev, status: v }))}
          options={statusOpts}
          accentColor={sCfg.color}
          accentBg={sCfg.bg}
        />

        {/* Assignee */}
        <PillDropdown
          label={newTaskInput.assignee === 'me' ? 'Me' : newTaskInput.assignee === 'unassigned' ? 'Unassigned' : (assigneeOpts.find(o => o.value === newTaskInput.assignee)?.label || 'Assignee')}
          icon="👤"
          value={newTaskInput.assignee}
          onChange={v => setNewTaskInput(prev => ({ ...prev, assignee: v }))}
          options={assigneeOpts}
        />

        {/* Date picker */}
        <button
          ref={dateBtnRef}
          onClick={dateOpen ? () => setDateOpen(false) : openDatePicker}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            border: `1.5px dashed ${dateLabel ? '#3b82f6' : 'var(--border)'}`,
            borderRadius: 99, padding: '4px 10px', fontSize: '.75rem', fontWeight: 600,
            cursor: 'pointer', background: dateLabel ? 'rgba(59,130,246,.1)' : 'transparent',
            color: dateLabel ? '#3b82f6' : 'var(--text-secondary)', transition: 'all .15s',
          }}
        >
          <i className="fa-regular fa-calendar" style={{ fontSize: '.75rem' }} />
          {dateLabel || 'Due date'}
        </button>
        {dateOpen && (
          <DatePickerPopover
            value={newTaskInput.deadline}
            onChange={v => setNewTaskInput(prev => ({ ...prev, deadline: v }))}
            onClose={() => setDateOpen(false)}
            anchorPos={datePos}
          />
        )}
      </div>

      {/* ── Actions */}
      <div style={{ display: 'flex', gap: 8, paddingLeft: 26 }}>
        <button
          type="button"
          className="btn btn--green btn--sm"
          onClick={() => onSubmit(sectionId)}
          style={{ borderRadius: 99 }}
        >
          <i className="fa-solid fa-plus" style={{ fontSize: '.75rem' }} /> Create task
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onCancel}
          style={{ borderRadius: 99 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECTION PAGE
   ═══════════════════════════════════════════════════════════ */
export default function SectionPage({ embedded = false, forcedProjectId = null, forcedProjectMembers = [] }) {
  const { user } = useAuth();
  const { projects, selectedProject } = useGlobalProject();
  const toast = useToast();
  const navigate = useNavigate();

  const activeProject = useMemo(() => {
    if (forcedProjectId) {
      return projects.find(p => p._id === forcedProjectId) || { _id: forcedProjectId, title: 'Project' };
    }
    return selectedProject;
  }, [forcedProjectId, projects, selectedProject]);

  const [tasks, setTasks] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  // Toolbar State
  const [view, setView] = useState('list');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ field: 'date', dir: 'asc' });
  const [group, setGroup] = useState('date');
  const [filter, setFilter] = useState({ status: '', project: '', assignee: '' });
  const [columns, setColumns] = useState({ collaborators: true, projects: true, priority: true, status: true });
  const [showMineOnly, setShowMineOnly] = useState(false);

  const [collapsed, setCollapsed] = useState({});
  const emptyComposer = {
    section: null, title: '', requirements: '',
    priority: 'Medium', status: 'Todo', deadline: '', assignee: 'me'
  };
  const [newTaskInput, setNewTaskInput] = useState(emptyComposer);
  const [taskModal, setTaskModal] = useState(false);
  const [projectMembers, setProjectMembers] = useState([]);

  // Custom Status
  const [customStatuses, setCustomStatuses] = useState(() => {
    const saved = localStorage.getItem('custom_task_statuses');
    return saved ? JSON.parse(saved) : [];
  });
  const [addingCustomStatus, setAddingCustomStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');

  // Inline editing
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // Deletion
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Drag
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  // Calendar view state
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d;
  });

  useEffect(() => { loadTasks(); }, [projects, selectedProject, forcedProjectId]);

  useEffect(() => {
    if (forcedProjectMembers?.length) { setProjectMembers(forcedProjectMembers); return; }
    if (!activeProject?._id) { setProjectMembers([]); return; }
    (async () => {
      try {
        const members = await API.projects.members(activeProject._id);
        setProjectMembers(members || []);
      } catch { setProjectMembers([]); }
    })();
  }, [activeProject?._id, forcedProjectMembers]);

  function openInlineComposer(sectionId) {
    // Pre-fill status if grouping by status
    const activeGroup = view === 'board' ? 'status' : group;
    const statusValue = activeGroup === 'status' ? sectionId : 'Todo';
    // Pre-fill priority if grouping by priority
    const priorityValue = activeGroup === 'priority' && ['High','Medium','Low'].includes(sectionId) ? sectionId : 'Medium';
    setNewTaskInput({ ...emptyComposer, section: sectionId, status: statusValue, priority: priorityValue });
  }

  async function loadTasks() {
    if (!activeProject?._id && (!projects || projects.length === 0)) { setTasks([]); return; }
    try {
      if (activeProject?._id) {
        const list = await API.tasks.list(activeProject._id);
        setTasks(list.map(t => ({ ...t, projectRef: activeProject })) || []);
      } else {
        const response = await API.tasks.dashboardOverview();
        setTasks(response?.tasks || []);
      }
    } catch { toast.error('Failed to load tasks'); setTasks([]); }
  }

  async function handleUpdateTitle(tId) {
    if (!editTitle.trim()) { setEditingTask(null); return; }
    const original = tasks.find(t => t._id === tId);
    if (original.title === editTitle) { setEditingTask(null); return; }
    setTasks(ts => ts.map(t => t._id === tId ? { ...t, title: editTitle } : t));
    try { await API.tasks.update(tId, { title: editTitle }); toast.success('Task renamed'); }
    catch { toast.error('Failed to rename task'); loadTasks(); }
    finally { setEditingTask(null); }
  }

  async function handleDropStatus(e, targetStatus) {
    e.preventDefault();
    if (!draggedTaskId) return;
    const t = tasks.find(x => x._id === draggedTaskId);
    if (!t || t.status === targetStatus) return;
    setTasks(ts => ts.map(x => x._id === draggedTaskId ? { ...x, status: targetStatus } : x));
    try { await API.tasks.status(draggedTaskId, targetStatus); }
    catch { toast.error('Failed to move task'); loadTasks(); }
    setDraggedTaskId(null);
  }

  function handleDeleteTask(tId, e) {
    if (e) e.stopPropagation();
    setTaskToDelete(tId);
  }

  async function executeDeleteTask(tId) {
    try {
      await API.tasks.remove(tId);
      setTasks(ts => ts.filter(t => t._id !== tId));
      toast.success('Task removed');
      if (selectedTask?._id === tId) setSelectedTask(null);
    } catch {
      toast.error('Failed to remove task');
    } finally {
      setTaskToDelete(null);
    }
  }

  function addCustomStatus() {
    if (!newStatusName.trim()) return;
    const normalized = newStatusName.trim();
    if (customStatuses.includes(normalized)) { toast.error('Status already exists'); return; }
    const updated = [...customStatuses, normalized];
    setCustomStatuses(updated);
    localStorage.setItem('custom_task_statuses', JSON.stringify(updated));
    setNewStatusName(''); setAddingCustomStatus(false);
    toast.success(`Status "${normalized}" added`);
  }

  function removeCustomStatus(statusName) {
    const updated = customStatuses.filter(s => s !== statusName);
    setCustomStatuses(updated);
    localStorage.setItem('custom_task_statuses', JSON.stringify(updated));
    toast.success('Status removed');
  }

  async function handleAddTask(sectionKey) {
    if (!newTaskInput.title.trim()) return;
    const p = activeProject || projects[0];
    if (!p) { toast.error('Join a project first'); return; }

    const activeGroup = view === 'board' ? 'status' : group;

    let payload = {
      title: newTaskInput.title.trim(),
      description: newTaskInput.requirements.trim() || 'Added from My Tasks',
      assignedRole: 'Developer',
      assignedTo: newTaskInput.assignee === 'unassigned' ? null : (newTaskInput.assignee === 'me' ? user._id : newTaskInput.assignee),
      priority: newTaskInput.priority || 'Medium',
      status: newTaskInput.status || 'Todo',
    };

    if (activeGroup === 'date') {
      if (sectionKey === 'today') payload.deadline = new Date().toISOString();
      else if (sectionKey === 'nextWeek') { const d = new Date(); d.setDate(d.getDate()+3); payload.deadline = d.toISOString(); }
      else if (sectionKey === 'later') { const d = new Date(); d.setDate(d.getDate()+14); payload.deadline = d.toISOString(); }
    } else if (activeGroup === 'status') {
      payload.status = sectionKey;
    } else if (activeGroup === 'priority') {
      if (['High', 'Medium', 'Low'].includes(sectionKey)) payload.priority = sectionKey;
    }

    try {
      if (newTaskInput.deadline) payload.deadline = new Date(newTaskInput.deadline + 'T00:00:00').toISOString();
      await API.tasks.create(p._id, payload);
      toast.success('Task added');
      setNewTaskInput(emptyComposer);
      loadTasks();
    } catch {
      toast.error('Could not create task');
    }
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const projectId = activeProject?._id || fd.get('projectId');
    const assignedTo = fd.get('assignedTo');
    try {
      await API.tasks.create(projectId, {
        title: fd.get('title'),
        description: fd.get('description'),
        assignedRole: fd.get('role') || 'Member',
        priority: fd.get('priority') || 'Medium',
        status: fd.get('status') || 'Todo',
        deadline: fd.get('deadline') || undefined,
        assignedTo: assignedTo === 'unassigned' ? null : (assignedTo || user._id)
      });
      toast.success('Task created!');
      setTaskModal(false);
      loadTasks();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // ── Data pipeline ──────────────────────────────────────
  const processedList = useMemo(() => {
    let list = [...(tasks || [])];
    if (search) list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    if (showMineOnly) list = list.filter(t => t.assignedTo?._id === user._id || t.assignedTo === user._id);
    if (filter.status) list = list.filter(t => t.status === filter.status);
    if (filter.project) list = list.filter(t => t.projectRef?._id === filter.project);
    if (filter.assignee) {
      if (filter.assignee === 'me') list = list.filter(t => t.assignedTo?._id === user._id || t.assignedTo === user._id);
      else if (filter.assignee === 'unassigned') list = list.filter(t => !t.assignedTo);
      else list = list.filter(t => (t.assignedTo?._id || t.assignedTo) === filter.assignee);
    } else if (!filter.status && view !== 'calendar') {
      list = list.filter(t => t.status !== 'Done' && t.status !== 'Approved');
    }
    list.sort((a, b) => {
      let valA, valB;
      if (sort.field === 'name') { valA = a.title.toLowerCase(); valB = b.title.toLowerCase(); }
      else if (sort.field === 'priority') {
        const pMap = { High: 3, Medium: 2, Low: 1 };
        valA = pMap[a.priority] || 0; valB = pMap[b.priority] || 0;
      } else {
        valA = a.deadline ? new Date(a.deadline).getTime() : 9999999999999;
        valB = b.deadline ? new Date(b.deadline).getTime() : 9999999999999;
      }
      if (valA < valB) return sort.dir === 'asc' ? -1 : 1;
      if (valA > valB) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [tasks, search, filter, sort, user, view, showMineOnly]);

  const processedGroups = useMemo(() => {
    const activeGroup = view === 'board' ? 'status' : group;
    const list = processedList;
    const result = [];

    if (activeGroup === 'date') {
      const now = new Date(); now.setHours(0,0,0,0);
      const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate()+1);
      const nw = new Date(now); nw.setDate(nw.getDate()+7);
      const sections = { recently: [], today: [], nextWeek: [], later: [] };
      list.forEach(t => {
        if (!t.deadline) sections.recently.push(t);
        else {
          const d = new Date(t.deadline); d.setHours(0,0,0,0);
          if (d < tomorrow) sections.today.push(t);
          else if (d < nw) sections.nextWeek.push(t);
          else sections.later.push(t);
        }
      });
      result.push({ id: 'recently', label: 'Recently assigned', tasks: sections.recently });
      result.push({ id: 'today', label: 'Do today', tasks: sections.today });
      result.push({ id: 'nextWeek', label: 'Do next week', tasks: sections.nextWeek });
      result.push({ id: 'later', label: 'Do later', tasks: sections.later });

    } else if (activeGroup === 'status') {
      const defaultStatuses = ['Todo', 'In-Progress', 'Review', 'Done', 'Approved'];
      const allStatuses = [...defaultStatuses, ...customStatuses];
      const map = {}; allStatuses.forEach(s => map[s] = []);
      list.forEach(t => { if(map[t.status]) map[t.status].push(t); else map['Todo'].push(t); });
      allStatuses.forEach(s => result.push({ id: s, label: STATUS_CONFIG[s]?.label || s, tasks: map[s] }));

    } else if (activeGroup === 'priority') {
      const map = { High: [], Medium: [], Low: [], 'No Priority': [] };
      list.forEach(t => {
        if (map[t.priority]) map[t.priority].push(t);
        else map['No Priority'].push(t);
      });
      result.push({ id: 'High',        label: '↑ High Priority',   tasks: map.High,         accentColor: '#ef4444' });
      result.push({ id: 'Medium',      label: '→ Medium Priority',  tasks: map.Medium,       accentColor: '#f59e0b' });
      result.push({ id: 'Low',         label: '↓ Low Priority',     tasks: map.Low,          accentColor: '#22c55e' });
      result.push({ id: 'No Priority', label: '— No Priority',      tasks: map['No Priority'], accentColor: '#9ca3af' });

    } else if (activeGroup === 'project') {
      const map = {};
      list.forEach(t => {
        const pId = t.projectRef?._id || 'none';
        if (!map[pId]) map[pId] = { id: pId, label: t.projectRef?.title || 'No Project', tasks: [] };
        map[pId].tasks.push(t);
      });
      result.push(...Object.values(map));
    }
    return result;
  }, [processedList, group, customStatuses, view]);

  // Calendar cells
  const calendarCells = useMemo(() => {
    if (view !== 'calendar') return [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const cells = [];
    for (let x = firstDayIndex; x > 0; x--)
      cells.push({ day: daysInPrevMonth - x + 1, current: false, dateStr: new Date(year, month - 1, daysInPrevMonth - x + 1).toDateString() });
    for (let i = 1; i <= daysInMonth; i++)
      cells.push({ day: i, current: true, dateStr: new Date(year, month, i).toDateString() });
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++)
      cells.push({ day: i, current: false, dateStr: new Date(year, month + 1, i).toDateString() });
    const map = {};
    processedList.forEach(t => {
      if (t.deadline) {
        const dStr = new Date(t.deadline).toDateString();
        if (!map[dStr]) map[dStr] = [];
        map[dStr].push(t);
      }
    });
    cells.forEach(c => { c.tasks = map[c.dateStr] || []; });
    return cells;
  }, [currentDate, processedList, view]);

  // ── Computed values ────────────────────────────────────
  const gridCols = `minmax(260px, 3fr) 130px${columns.priority ? ' 110px' : ''}${columns.collaborators ? ' 140px' : ''}${columns.projects ? ' 180px' : ''}${columns.status ? ' 120px' : ''}`;

  return (
    <>
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hover-row:hover { background: rgba(0,0,0,.025); border-radius: 6px; }
        body.dark .hover-row:hover { background: rgba(255,255,255,.035); }

        .toolbar {
          display: flex; gap: 10px; align-items: center; padding: 10px 28px;
          background: var(--white); border-bottom: 1px solid var(--border);
          box-shadow: 0 2px 4px rgba(0,0,0,.02); flex-wrap: wrap;
        }
        body.dark .toolbar { box-shadow: 0 2px 4px rgba(0,0,0,.12); }

        .tool-btn {
          display: flex; align-items: center; gap: 7px;
          background: transparent; border: 1px solid var(--border);
          border-radius: 8px; padding: 6px 12px; font-size: .78rem;
          font-weight: 500; cursor: pointer; color: var(--text-secondary);
          transition: all .15s;
        }
        .tool-btn:hover, .tool-btn.active {
          background: rgba(0,0,0,.03); color: var(--text-primary); border-color: #d1d5db;
        }
        body.dark .tool-btn:hover, body.dark .tool-btn.active {
          background: rgba(255,255,255,.06); color: var(--text-primary); border-color: #2f2f2f;
        }

        /* Board columns */
        .jira-board { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 16px; }
        .jira-col {
          background: var(--bg); border: 1px solid var(--border); border-radius: 14px;
          min-width: 308px; max-width: 308px; padding: 14px;
          display: flex; flex-direction: column; gap: 10px;
          height: calc(100vh - 216px); overflow-y: auto;
          box-shadow: 0 1px 3px rgba(0,0,0,.05);
        }
        body.dark .jira-col { background: rgba(255,255,255,.03); border-color: rgba(255,255,255,.07); }
        .jira-col.drag-over { background: rgba(34,197,94,.06); border-color: var(--green); }
        .jira-col-header {
          display: flex; align-items: center; justify-content: space-between;
          font-size: .72rem; font-weight: 800; letter-spacing: .07em;
          color: var(--text-secondary); text-transform: uppercase; padding: 0 2px; margin-bottom: 2px;
        }
        .jira-col-count {
          background: #f3f4f6; color: var(--text-muted); border-radius: 999px;
          padding: 2px 8px; font-size: .65rem; font-weight: 700;
        }
        body.dark .jira-col-count { background: rgba(255,255,255,.08); color: rgba(255,255,255,.5); }

        .jira-card {
          background: var(--white); border: 1px solid var(--border);
          border-left: 4px solid transparent; border-radius: 10px;
          padding: 12px; display: flex; flex-direction: column; gap: 8px;
          cursor: grab; transition: all .18s;
          box-shadow: 0 1px 2px rgba(0,0,0,.04);
        }
        body.dark .jira-card { background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.08); }
        .jira-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,.1); }
        body.dark .jira-card:hover { box-shadow: 0 6px 16px rgba(0,0,0,.4); }
        .jira-card:active { cursor: grabbing; opacity: .85; }
        .jira-card-title { font-size: .875rem; font-weight: 600; color: var(--text-primary); line-height: 1.4; word-break: break-word; }
        .jira-card-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .jira-chip {
          display: inline-flex; align-items: center; gap: 4px;
          border: 1px solid var(--border); border-radius: 6px; padding: 3px 8px;
          color: var(--text-secondary); background: #f9fafb; font-size: .7rem;
        }
        body.dark .jira-chip { background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.08); }

        .jira-inline-add {
          border: 1.5px dashed var(--border); border-radius: 10px;
          padding: 10px; color: var(--text-muted); font-size: .78rem;
          font-weight: 500; cursor: pointer; text-align: center; transition: all .15s;
          background: transparent;
        }
        .jira-inline-add:hover { border-color: var(--green); color: var(--green); background: rgba(34,197,94,.04); }
        body.dark .jira-inline-add { color: rgba(255,255,255,.4); }
        body.dark .jira-inline-add:hover { background: rgba(34,197,94,.08); }

        /* Priority section accent line */
        .priority-section-bar {
          width: 3px; border-radius: 99px; flex-shrink: 0; align-self: stretch; min-height: 16px;
        }

        /* List view */
        .list-header-cell { font-size: .7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; }
        .list-row { position: relative; display: grid; gap: 14px; padding: 9px 10px; border-bottom: 1px solid var(--border); align-items: center; cursor: pointer; }

        /* Delete button hover */
        .del-btn { opacity: 0; transition: opacity .2s; }
        .hover-row:hover .del-btn, .jira-card:hover .del-btn { opacity: .7; }
        .del-btn:hover { opacity: 1 !important; color: #ef4444 !important; }

        /* Calendar */
        .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: var(--border); border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }
        .cal-header-cell { background: var(--white); padding: 10px; text-align: center; font-size: .72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
        body.dark .cal-header-cell { background: rgba(255,255,255,.03); }
        .cal-cell { background: var(--white); min-height: 110px; padding: 8px; display: flex; flex-direction: column; gap: 5px; }
        .cal-cell.dim { background: var(--bg); }
        body.dark .cal-cell.dim { background: rgba(255,255,255,.015); }
        .cal-task { font-size: .68rem; padding: 3px 6px; border-radius: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; border-left: 3px solid transparent; }

        /* Priority dots */
        .pdot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .pdot--high   { background: #ef4444; box-shadow: 0 0 4px rgba(239,68,68,.4); }
        .pdot--medium { background: #f59e0b; box-shadow: 0 0 4px rgba(245,158,11,.35); }
        .pdot--low    { background: #22c55e; box-shadow: 0 0 4px rgba(34,197,94,.35); }
      `}</style>

      {!embedded && <Topbar title="My Tasks" />}

      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="toolbar">
        {/* View switcher */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg)', borderRadius: 10, padding: 3 }}>
          {[['list','fa-list','List'],['board','fa-trello','Board'],['calendar','fa-calendar','Calendar']].map(([v, icon, lbl]) => (
            <button
              key={v}
              className={`tool-btn ${view === v ? 'active' : ''}`}
              onClick={() => setView(v)}
              style={{ borderRadius: 7, border: 'none', background: view === v ? 'var(--white)' : 'transparent',
                boxShadow: view === v ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}
            >
              <i className={`fa-solid ${icon}`} style={{ fontSize: '.75rem' }} /> {lbl}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 2px' }} />

        {view !== 'calendar' && (
          <>
            <select
              className="tool-btn"
              value={`${sort.field}-${sort.dir}`}
              onChange={e => { const [f, d] = e.target.value.split('-'); setSort({ field: f, dir: d }); }}
            >
              <option value="date-asc">Due Date ↑</option>
              <option value="date-desc">Due Date ↓</option>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="priority-desc">Priority</option>
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg)', borderRadius: 8, padding: '4px 10px' }}>
              <span style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Group</span>
              <select
                className="tool-btn"
                value={group}
                onChange={e => setGroup(e.target.value)}
                style={{ border: 'none', background: 'transparent', padding: '4px 6px' }}
              >
                <option value="date">Due Date</option>
                <option value="status">Status</option>
                <option value="priority">Priority</option>
                <option value="project">Project</option>
              </select>
            </div>
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Assignee</span>
          <select className="tool-btn" value={filter.assignee} onChange={e => setFilter(f => ({ ...f, assignee: e.target.value }))}>
            <option value="">Everyone</option>
            <option value="me">Just Me</option>
            <option value="unassigned">Unassigned</option>
            {projectMembers.map(m => {
              const memberId = m.user?._id || m.userId?._id || m.userId;
              const memberName = m.user?.username || m.user?.email?.split('@')[0] || 'Member';
              if (!memberId) return null;
              return <option key={memberId} value={memberId}>{memberName}</option>;
            })}
          </select>
        </div>

        <button
          className={`tool-btn ${showMineOnly ? 'active' : ''}`}
          onClick={() => setShowMineOnly(v => !v)}
        >
          <i className="fa-solid fa-user" style={{ fontSize: '.72rem' }} />
          {showMineOnly ? 'My tasks only' : 'All tasks'}
        </button>

        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ position: 'relative', width: 200 }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '.75rem' }} />
          <input
            type="text"
            className="tool-btn"
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 28, background: 'var(--bg)', borderRadius: 8 }}
          />
        </div>

        {/* Column toggles */}
        {view === 'list' && (
          <div style={{ display: 'flex', gap: 4 }}>
            {[['collaborators','Team'],['priority','Priority'],['status','Status'],['projects','Project']].map(([key, label]) => (
              <button
                key={key}
                className={`tool-btn ${columns[key] ? 'active' : ''}`}
                onClick={() => setColumns(c => ({ ...c, [key]: !c[key] }))}
                style={{ fontSize: '.72rem', padding: '5px 10px' }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <button className="btn btn--green btn--sm" onClick={() => setTaskModal(true)} style={{ borderRadius: 10 }}>
          <i className="fa-solid fa-plus" style={{ fontSize: '.75rem' }} /> Add Task
        </button>
      </div>

      {/* ── Main content ─────────────────────────────────── */}
      <div style={{ padding: '20px 28px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tasks === null ? (
          <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />
        ) : view === 'list' ? (

          /* ══ LIST VIEW ══════════════════════════════════ */
          <div style={{ background: 'var(--white)', borderRadius: 16, boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Column Headers */}
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 14, padding: '10px 12px 10px 36px', borderBottom: '2px solid var(--border)' }}>
              <div className="list-header-cell">Name</div>
              <div className="list-header-cell">Due date</div>
              {columns.priority     && <div className="list-header-cell">Priority</div>}
              {columns.collaborators && <div className="list-header-cell">Assignee</div>}
              {columns.projects      && <div className="list-header-cell">Project</div>}
              {columns.status        && <div className="list-header-cell">Status</div>}
            </div>

            <div style={{ overflowY: 'auto', padding: '8px 24px 16px' }}>
              {processedGroups.map(g => (
                <div key={g.id} style={{ marginBottom: 24 }}>
                  {/* Group header */}
                  <div
                    onClick={() => setCollapsed(prev => ({ ...prev, [g.id]: !prev[g.id] }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 0', borderBottom: `2px solid ${g.accentColor || 'var(--border)'}`, marginBottom: 4 }}
                  >
                    <i className={`fa-solid fa-chevron-${collapsed[g.id] ? 'right' : 'down'}`} style={{ color: g.accentColor || 'var(--text-muted)', fontSize: '.7rem', width: 12 }} />
                    {g.accentColor && <span className="priority-section-bar" style={{ background: g.accentColor }} />}
                    <h4 style={{ margin: 0, fontSize: '.85rem', fontWeight: 700, color: g.accentColor || 'var(--text-primary)' }}>
                      {g.label}
                    </h4>
                    <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontWeight: 500, background: 'var(--bg)', borderRadius: 99, padding: '1px 8px' }}>{g.tasks.length}</span>
                  </div>

                  {!collapsed[g.id] && (
                    <div style={{ paddingLeft: 22 }}>
                      {g.tasks.map(t => {
                        const cCol = getProjectColor(t.projectRef?._id);
                        const pCfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.Medium;
                        const sCfg = STATUS_CONFIG[t.status] || { label: t.status, color: '#6b7280', bg: '#f3f4f6' };
                        const overdue = t.deadline && new Date(t.deadline) < new Date();
                        return (
                          <div
                            key={t._id}
                            className="list-row hover-row"
                            style={{ gridTemplateColumns: gridCols }}
                            onClick={() => setSelectedTask(t)}
                          >
                            {/* Name */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <i className="fa-regular fa-circle-check" style={{ color: 'var(--text-muted)', fontSize: '.85rem', flexShrink: 0 }} />
                              <span
                                className={`pdot pdot--${(t.priority || 'medium').toLowerCase()}`}
                              />
                              {editingTask === t._id ? (
                                <input
                                  autoFocus type="text" value={editTitle}
                                  onChange={e => setEditTitle(e.target.value)}
                                  onBlur={() => handleUpdateTitle(t._id)}
                                  onKeyDown={e => e.key === 'Enter' && handleUpdateTitle(t._id)}
                                  style={{ border: '1px solid var(--green)', borderRadius: 6, padding: '2px 8px', fontSize: '.875rem', flex: 1 }}
                                  onClick={e => e.stopPropagation()}
                                />
                              ) : (
                                <span
                                  style={{ fontSize: '.875rem', fontWeight: 500, cursor: 'text', flex: 1 }}
                                  onClick={e => { e.stopPropagation(); setEditingTask(t._id); setEditTitle(t.title); }}
                                >{t.title}</span>
                              )}
                            </div>

                            {/* Due date */}
                            <div style={{ fontSize: '.78rem', color: overdue ? '#ef4444' : 'var(--text-muted)', fontWeight: overdue ? 600 : 400 }}>
                              {t.deadline ? fmtDate(t.deadline) : '—'}
                            </div>

                            {/* Priority */}
                            {columns.priority && (
                              <div>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  background: pCfg.bg, color: pCfg.color, borderRadius: 6,
                                  padding: '3px 8px', fontSize: '.72rem', fontWeight: 700,
                                }}>
                                  {pCfg.icon} {pCfg.label}
                                </span>
                              </div>
                            )}

                            {/* Assignee */}
                            {columns.collaborators && (
                              <div>
                                {t.assignedTo
                                  ? <Avatar user={t.assignedTo} size="sm" />
                                  : <span style={{ color: 'var(--text-muted)', fontSize: '.78rem' }}>Unassigned</span>
                                }
                              </div>
                            )}

                            {/* Project */}
                            {columns.projects && (
                              <div>
                                {t.projectRef && <Badge variant={cCol} style={{ fontSize: '.68rem' }}>{t.projectRef.title}</Badge>}
                              </div>
                            )}

                            {/* Status */}
                            {columns.status && (
                              <div>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  background: sCfg.bg, color: sCfg.color, borderRadius: 6,
                                  padding: '3px 8px', fontSize: '.72rem', fontWeight: 700,
                                }}>
                                  {sCfg.label}
                                </span>
                              </div>
                            )}

                            {/* Actions */}
                            <button
                              className="del-btn"
                              onClick={e => handleDeleteTask(t._id, e)}
                              style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                              title="Delete task"
                            >
                              <i className="fa-solid fa-trash-can" style={{ fontSize: '.85rem' }} />
                            </button>
                          </div>
                        );
                      })}

                      {/* Inline composer */}
                      {newTaskInput.section === g.id ? (
                        <div style={{ padding: '8px 0 4px', paddingLeft: 22 }}>
                          <InlineTaskComposer
                            sectionId={g.id}
                            newTaskInput={newTaskInput}
                            setNewTaskInput={setNewTaskInput}
                            onSubmit={handleAddTask}
                            onCancel={() => setNewTaskInput(emptyComposer)}
                            projectMembers={projectMembers}
                            user={user}
                          />
                        </div>
                      ) : (
                        <div
                          onClick={() => openInlineComposer(g.id)}
                          style={{ padding: '8px 10px 8px 22px', color: 'var(--text-muted)', fontSize: '.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                          className="hover-row"
                        >
                          <i className="fa-solid fa-plus" style={{ fontSize: '.7rem', color: 'var(--green)' }} />
                          Add task...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        ) : view === 'board' ? (

          /* ══ BOARD VIEW ═════════════════════════════════ */
          <div className="jira-board" style={{ flex: 1 }}>
            {processedGroups.map(g => (
              <div
                key={g.id}
                className="jira-col"
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.currentTarget.classList.remove('drag-over'); handleDropStatus(e, g.id); }}
                onDragEnter={e => e.currentTarget.classList.add('drag-over')}
                onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
              >
                <div className="jira-col-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {g.accentColor && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.accentColor, display: 'inline-block' }} />
                    )}
                    {g.label}
                  </div>
                  <span className="jira-col-count">{g.tasks.length}</span>
                </div>

                {g.tasks.map(t => {
                  const colorMap = ['#3b82f6','#8b5cf6','#ef4444','#f97316','#22c55e','#ec4899','#14b8a6','#6366f1'];
                  const cardColor = colorMap[Math.abs(String(t._id).split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colorMap.length];
                  const pCfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.Medium;
                  return (
                    <div
                      key={t._id}
                      className="jira-card"
                      draggable
                      onDragStart={e => { setDraggedTaskId(t._id); e.dataTransfer.effectAllowed = 'move'; }}
                      onDragEnd={() => setDraggedTaskId(null)}
                      onClick={() => setSelectedTask(t)}
                      style={{ position: 'relative', borderLeftColor: cardColor }}
                    >
                      <button
                        className="del-btn"
                        onClick={e => handleDeleteTask(t._id, e)}
                        style={{ position: 'absolute', top: '6px', right: '6px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                        title="Delete task"
                      >
                        <i className="fa-solid fa-trash-can" style={{ fontSize: '.8rem' }} />
                      </button>
                      <div className="jira-card-title" style={{ paddingRight: '22px' }}>{t.title}</div>
                      <div className="jira-card-meta">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {t.deadline ? (
                            <span className="jira-chip" style={{ color: new Date(t.deadline) < new Date() ? '#ef4444' : undefined }}>
                              <i className="fa-regular fa-calendar" /> {fmtDate(t.deadline)}
                            </span>
                          ) : (
                            <span className="jira-chip"><i className="fa-regular fa-calendar" /> No date</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '.67rem', fontWeight: 700, color: pCfg.color, background: pCfg.bg, borderRadius: 5, padding: '2px 6px' }}>
                            {pCfg.icon} {pCfg.label}
                          </span>
                          {t.assignedTo
                            ? <Avatar user={t.assignedTo} size="sm" style={{ width: 22, height: 22 }} />
                            : <i className="fa-regular fa-user" style={{ color: '#9ca3af', fontSize: '.8rem' }} />
                          }
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Board inline composer */}
                {newTaskInput.section === g.id ? (
                  <InlineTaskComposer
                    sectionId={g.id}
                    newTaskInput={newTaskInput}
                    setNewTaskInput={setNewTaskInput}
                    onSubmit={handleAddTask}
                    onCancel={() => setNewTaskInput(emptyComposer)}
                    projectMembers={projectMembers}
                    user={user}
                  />
                ) : (
                  <div className="jira-inline-add" onClick={() => openInlineComposer(g.id)}>
                    <i className="fa-solid fa-plus" style={{ marginRight: 6, fontSize: '.75rem' }} />Add task
                  </div>
                )}
              </div>
            ))}

            {/* Add custom status column */}
            <div style={{
              background: 'var(--bg)', border: '2px dashed var(--border)', borderRadius: 14,
              minWidth: 280, maxWidth: 280, padding: 14,
              display: 'flex', flexDirection: 'column', gap: 10,
              height: 'calc(100vh - 216px)', alignItems: 'center', justifyContent: 'flex-start',
            }}>
              <div style={{ paddingTop: 16, textAlign: 'center', width: '100%' }}>
                {addingCustomStatus ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      autoFocus type="text" className="form-input"
                      placeholder="Status name..."
                      value={newStatusName}
                      onChange={e => setNewStatusName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') addCustomStatus();
                        if (e.key === 'Escape') { setAddingCustomStatus(false); setNewStatusName(''); }
                      }}
                      style={{ padding: '8px', fontSize: '.85rem' }}
                    />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button className="btn btn--sm btn--primary" onClick={addCustomStatus}>Add</button>
                      <button className="btn btn--sm btn--ghost" onClick={() => { setAddingCustomStatus(false); setNewStatusName(''); }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn--sm btn--outline" onClick={() => setAddingCustomStatus(true)} style={{ whiteSpace: 'nowrap' }}>
                    <i className="fa-solid fa-plus" /> Add Status
                  </button>
                )}
              </div>

              {customStatuses.length > 0 && (
                <div style={{ width: '100%', paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 8 }}>
                  <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Custom</div>
                  {customStatuses.map(status => (
                    <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '.8rem', marginBottom: 6 }}>
                      <span>{status}</span>
                      <button onClick={() => removeCustomStatus(status)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, fontSize: '.75rem' }}>
                        <i className="fa-solid fa-trash-can" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        ) : (

          /* ══ CALENDAR VIEW ══════════════════════════════ */
          <div style={{ background: 'var(--white)', borderRadius: 16, boxShadow: 'var(--shadow)', padding: 16, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontWeight: 700 }}>{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn--sm btn--outline" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}><i className="fa-solid fa-chevron-left"/></button>
                <button className="btn btn--sm btn--outline" onClick={() => setCurrentDate(new Date())}>Today</button>
                <button className="btn btn--sm btn--outline" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}><i className="fa-solid fa-chevron-right"/></button>
              </div>
            </div>
            <div className="calendar-grid" style={{ flex: 1 }}>
              {CAL_DAYS.map(day => <div key={day} className="cal-header-cell">{day}</div>)}
              {calendarCells.map((c, i) => (
                <div key={i} className={`cal-cell ${!c.current ? 'dim' : ''}`}>
                  <div style={{ fontSize: '.78rem', fontWeight: c.dateStr === new Date().toDateString() ? 800 : 600, color: c.current ? 'var(--text-primary)' : 'var(--text-muted)', textAlign: 'right', background: c.dateStr === new Date().toDateString() ? 'var(--green)' : 'transparent', color: c.dateStr === new Date().toDateString() ? '#fff' : c.current ? 'var(--text-primary)' : 'var(--text-muted)', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto', fontSize: '.75rem' }}>{c.day}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto' }}>
                    {c.tasks.map(t => {
                      const cCol = getProjectColor(t.projectRef?._id);
                      return (
                        <div key={t._id} className="cal-task" onClick={() => setSelectedTask(t)}
                          style={{ background: `var(--${cCol}-bg)`, color: `var(--${cCol})`, borderLeftColor: `var(--${cCol})` }} title={t.title}>
                          {t.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Task Side Panel ──────────────────────── */}
      {selectedTask && (
        <TaskSidePanel
          task={selectedTask}
          onClose={() => { setSelectedTask(null); loadTasks(); }}
          isOwner={false}
          isMember={true}
          userId={user?._id}
          projectId={selectedTask.projectRef?._id || selectedTask.project}
          onTaskUpdate={updated => {
            setTasks(ts => ts.map(t => t._id === updated._id ? { ...t, ...updated } : t));
            setSelectedTask(prev => prev?._id === updated._id ? { ...prev, ...updated } : prev);
          }}
        />
      )}

      {/* ── Create Task Modal ─────────────────────── */}
      <Modal open={taskModal} onClose={() => setTaskModal(false)} title="Add Task">
        <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!activeProject?._id && (
            <div className="form-group">
              <label className="form-label">Project *</label>
              <select name="projectId" className="form-input" required defaultValue={selectedProject?._id || ''}>
                {(projects || []).map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Task Title *</label>
            <input name="title" className="form-input" required placeholder="What needs to be done?" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea name="description" className="form-input" rows={2} placeholder="Add task details…" style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select name="priority" className="form-input">
                <option value="Low">Low</option>
                <option defaultValue value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select name="status" className="form-input">
                <option value="Todo">To Do</option>
                <option value="In-Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Done">Done</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Deadline</label>
              <input name="deadline" className="form-input" type="date" />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <input name="role" className="form-input" placeholder="e.g. Developer" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Collaborator</label>
            <select name="assignedTo" className="form-input" defaultValue="me">
              <option value="me">Assign to me</option>
              <option value="unassigned">Unassigned</option>
              {projectMembers.map(m => {
                const memberId = m.user?._id || m.userId?._id || m.userId;
                const memberName = m.user?.username || m.user?.email?.split('@')[0] || 'Member';
                if (!memberId) return null;
                return <option key={memberId} value={memberId}>{memberName}</option>;
              })}
            </select>
          </div>
          <button className="btn btn--primary" style={{ width: '100%', marginTop: 8, borderRadius: 12 }}>Create Task</button>
        </form>
      </Modal>

      {/* ── Delete Confirm Modal ────────────────────── */}
      <Modal open={!!taskToDelete} onClose={() => setTaskToDelete(null)} title="Delete Task">
        <p style={{ margin: '10px 0 24px', fontSize: '.95rem', color: 'var(--text-secondary)' }}>
          Are you sure you want to delete this item?
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button className="btn btn--ghost" onClick={() => setTaskToDelete(null)}>Cancel</button>
          <button className="btn btn--danger" onClick={() => executeDeleteTask(taskToDelete)}>Yes, delete</button>
        </div>
      </Modal>
    </>
  );
}
