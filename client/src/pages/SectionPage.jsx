import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
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

function isSectionGroup(value) {
  return value === 'sections' || value === 'date';
}

function isStatusGroup(value) {
  return value === 'status';
}

const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CAL_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const GROUP_OPTIONS = [
  { value: 'sections', label: 'Sections',   icon: 'fa-bars-staggered' },
  { value: 'date',     label: 'Due Date',   icon: 'fa-calendar' },
  { value: 'status',   label: 'Status',     icon: 'fa-circle-check' },
  { value: 'priority', label: 'Priority',   icon: 'fa-flag' },
  { value: 'assignee', label: 'Assignee',   icon: 'fa-user' },
  { value: 'project',  label: 'Project',    icon: 'fa-folder' },
];

const GROUP_LABELS = {
  sections: 'Sections',
  date: 'Due Date',
  status: 'Status',
  priority: 'Priority',
  assignee: 'Assignee',
  project: 'Project',
};

/* ─── Asana-style Grouping Pill ─────────────────────────── */
function GroupPill({ icon, label, value, options, current, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        className="tool-btn"
        onClick={() => setOpen(!open)}
        style={{ fontSize: '.72rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
      >
        <i className={`fa-solid ${icon}`} style={{ fontSize: '.65rem', opacity: .7 }} />
        <span>{value}</span>
        <i className={`fa-solid fa-chevron-down`} style={{ fontSize: '.55rem', opacity: .5, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 1000,
          background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', padding: 4, minWidth: 170,
        }}>
          <div style={{ padding: '4px 8px 2px', fontSize: '.65rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 10px',
                border: 'none', borderRadius: 7, background: current === opt.value ? 'rgba(59,130,246,.08)' : 'transparent',
                color: current === opt.value ? '#3b82f6' : 'var(--text)', fontSize: '.78rem', cursor: 'pointer',
                fontWeight: current === opt.value ? 600 : 400,
              }}
            >
              <i className={`fa-solid ${opt.icon}`} style={{ fontSize: '.7rem', width: 16, textAlign: 'center', opacity: .6 }} />
              {opt.label}
              {current === opt.value && <i className="fa-solid fa-check" style={{ marginLeft: 'auto', fontSize: '.65rem', opacity: .7 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

const DEFAULT_WORKFLOW_STATUSES = ['Todo', 'In-Progress', 'Review', 'Done', 'Approved'];

function getCalendarTaskStyle(task) {
  const projectColor = getProjectColor(task.projectRef?._id);

  return {
    '--cal-task-accent': `var(--${projectColor})`,
    background: `var(--${projectColor}-bg)`,
    color: `var(--${projectColor})`,
    borderColor: `var(--${projectColor}-bg)`,
  };
}

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
function InlineTaskComposer({ sectionId, initialPriority = 'Medium', initialStatus, newTaskInput, setNewTaskInput, onSubmit, onCancel, projectMembers, user, availableStatuses = ['Todo', 'In-Progress', 'Review', 'Done', 'Approved'] }) {
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

  const statusOpts = availableStatuses.map(s => ({
    value: s, label: STATUS_CONFIG[s]?.label || s, color: STATUS_CONFIG[s]?.color || '#6b7280', dot: true,
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
export default function SectionPage({ embedded = false, forcedProjectId = null, forcedProject = null, forcedProjectMembers = [], globalMode = false }) {
  const { user } = useAuth();
  const { projects, selectedProject, loadingProjects } = useGlobalProject();
  const toast = useToast();
  const navigate = useNavigate();

  const activeProject = useMemo(() => {
    if (forcedProject) return forcedProject;
    if (forcedProjectId) {
      return projects.find(p => p._id === forcedProjectId) || { _id: forcedProjectId, title: 'Project' };
    }
    if (globalMode) return null;
    return selectedProject;
  }, [forcedProject, forcedProjectId, projects, selectedProject, globalMode]);

  const isOwner = activeProject && (String(activeProject.owner?._id || activeProject.owner) === String(user?._id || user?.id));
  const isAdmin = user?.isAdmin === true || user?.isAdmin === 'true';
  const canDeleteTask = isAdmin || isOwner || activeProject?.permissions?.memberCanDeleteTask;

  const [tasks, setTasks] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  // Toolbar State
  const [view, setView] = useState('list');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ field: 'date', dir: 'asc' });
  const [group, setGroup] = useState(embedded ? 'status' : 'sections');
  const [filter, setFilter] = useState({ status: '', project: '', assignee: '' });
  const [columns, setColumns] = useState({ collaborators: true, projects: true, priority: true, status: true });
  const [showMineOnly, setShowMineOnly] = useState(false);

  const [collapsed, setCollapsed] = useState({});
  const emptyComposer = {
    section: null, title: '', requirements: '',
    priority: 'Medium', status: 'Todo', deadline: '', assignee: 'me'
  };
  const [newTaskInput, setNewTaskInput] = useState(emptyComposer);
  const [taskModalDate, setTaskModalDate] = useState(null);
  const [taskModal, setTaskModal] = useState(false);
  const [modalAssignees, setModalAssignees] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);

  // Custom Status
  const [customStatuses, setCustomStatuses] = useState(() => {
    const saved = localStorage.getItem('custom_task_statuses');
    return saved ? JSON.parse(saved) : [];
  });
  const [projectStatuses, setProjectStatuses] = useState(() => (
    embedded && activeProject?.taskStatuses?.length ? activeProject.taskStatuses : DEFAULT_WORKFLOW_STATUSES
  ));
  const [addingCustomStatus, setAddingCustomStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');

  // Custom Date Sections
  const DEFAULT_DATE_SECTIONS = [
    { id: 'recently', label: 'Recently assigned', type: 'recently' },
    { id: 'today', label: 'Do today', type: 'today' },
    { id: 'nextWeek', label: 'Do next week', type: 'nextWeek' },
    { id: 'later', label: 'Do later', type: 'later' },
  ];

  const [customDateSections, setCustomDateSections] = useState(() => {
    const saved = localStorage.getItem('custom_date_sections');
    return saved ? JSON.parse(saved) : [...DEFAULT_DATE_SECTIONS];
  });
  const [taskSectionMap, setTaskSectionMap] = useState(() => {
    const saved = localStorage.getItem('task_section_map');
    return saved ? JSON.parse(saved) : {};
  });
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingSectionLabel, setEditingSectionLabel] = useState('');

  // Inline editing
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // Deletion
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Drag
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [draggedSectionId, setDraggedSectionId] = useState(null);
  const draggedTaskIdRef = useRef(null);
  useEffect(() => { draggedTaskIdRef.current = draggedTaskId; }, [draggedTaskId]);

  // Calendar view state
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d;
  });

  const activeProjectId = activeProject?._id || null;
  const activeProjectIdRef = useRef(activeProjectId);
  const prevProjectIdRef = useRef(null);
  const forcedProjectMembersRef = useRef(forcedProjectMembers);
  forcedProjectMembersRef.current = forcedProjectMembers;

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  const loadTasksRef = useRef(loadTasks);
  loadTasksRef.current = loadTasks;

  useEffect(() => {
    const currentId = activeProjectIdRef.current;
    const prevId = prevProjectIdRef.current;
    if (!embedded && loadingProjects) return;
    if (currentId !== prevId || prevId === null) {
      prevProjectIdRef.current = currentId;
      loadTasksRef.current();
    }
  }, [activeProjectId, embedded, loadingProjects, projects.length]);

  useEffect(() => {
    const members = forcedProjectMembersRef.current;
    if (members?.length) { setProjectMembers(members); return; }
    const pid = activeProjectIdRef.current;
    if (!pid) { setProjectMembers([]); return; }
    (async () => {
      try {
        const fetchedMembers = await API.projects.members(pid);
        setProjectMembers(fetchedMembers || []);
      } catch { setProjectMembers([]); }
    })();
  }, [activeProjectId]);

  useEffect(() => {
    if (!embedded) return;
    setProjectStatuses(activeProject?.taskStatuses?.length ? activeProject.taskStatuses : DEFAULT_WORKFLOW_STATUSES);
  }, [embedded, activeProject?.taskStatuses]);

  const availableStatuses = embedded
    ? projectStatuses
    : [...DEFAULT_WORKFLOW_STATUSES, ...customStatuses];

  function isCustomizableGroup(value = group) {
    return isSectionGroup(value) || (embedded && isStatusGroup(value));
  }

  function openInlineComposer(sectionId) {
    // Pre-fill status if grouping by status
    const activeGroup = group;
    const statusValue = activeGroup === 'status' ? sectionId : 'Todo';
    // Pre-fill priority if grouping by priority
    const priorityValue = activeGroup === 'priority' && ['High','Medium','Low'].includes(sectionId) ? sectionId : 'Medium';
    setNewTaskInput({ ...emptyComposer, section: sectionId, status: statusValue, priority: priorityValue });
  }

  async function loadTasks() {
    if (embedded && !activeProject?._id) { setTasks([]); return; }
    try {
      if (activeProject?._id) {
        const list = await API.tasks.list(activeProject._id);
        setTasks(list.map(t => ({ ...t, projectRef: activeProject })) || []);
      } else {
        const response = await API.tasks.dashboardOverview({ force: true });
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

  async function handleDropStatus(e, targetStatus, overrideTaskId = null) {
    if (e && e.preventDefault) e.preventDefault();
    const taskIdToUse = overrideTaskId || draggedTaskIdRef.current;
    if (!taskIdToUse) return;
    const t = tasks.find(x => x._id === taskIdToUse);
    if (!t || t.status === targetStatus) return;

    const ownerId = activeProject?.owner?._id || activeProject?.owner;
    
    // Auth helpers to avoid "undefined" strings
    const currentUserId = user ? String(user.id || user._id) : null;
    const isOwner = activeProject && ownerId && currentUserId && (String(ownerId) === currentUserId);
    
    const isAssignee = Array.isArray(t.assignedTo) && currentUserId
      ? t.assignedTo.some(u => String(u._id || u) === currentUserId)
      : false;
    const isUnassigned = !t.assignedTo || t.assignedTo.length === 0;
    
    // Check local admin role (since user context might lag behind DB)
    const isAdmin = user?.isAdmin === true || user?.isAdmin === 'true';

    // Admin أو Owner يقدر يحط أي task في أي حالة
    if (!isAdmin && !isOwner) {
      // Member عادي
      const perms = activeProject?.permissions || {};
      
      if (!isAssignee && !isUnassigned && !perms.memberCanEditAnyTask) {
        toast.error('You can only move tasks assigned to you or unassigned tasks');
        setDraggedTaskId(null);
        return;
      }
      
      if (perms.memberCanChangeToAnyStatus === false) {
        const restricted = perms.memberRestrictedStatuses || ['Approved'];
        if (restricted.includes(targetStatus)) {
          toast.error(`Members cannot move tasks to "${targetStatus}"`);
          setDraggedTaskId(null);
          return;
        }
      } else {
        // Fallback backward compatible behavior if no permissions set
        const isBlockedStatus = targetStatus === 'Approved';
        if (isBlockedStatus && !perms.memberCanChangeToAnyStatus && perms.memberRestrictedStatuses === undefined) {
          toast.error('Only the project admin or owner can mark tasks as Approved');
          setDraggedTaskId(null);
          return;
        }
      }
    }

    setTasks(ts => ts.map(x => x._id === taskIdToUse ? { ...x, status: targetStatus } : x));
    try { await API.tasks.status(taskIdToUse, targetStatus); }
    catch (err) {
      toast.error(err.message || 'Failed to move task');
      loadTasks();
    }
    setDraggedTaskId(null);
  }

  async function handleDropDeadline(e, dateStr, overrideTaskId = null) {
    if (e && e.preventDefault) e.preventDefault();
    const taskIdToUse = overrideTaskId || draggedTaskIdRef.current;
    if (!taskIdToUse) return;
    const t = tasks.find(x => x._id === taskIdToUse);
    if (!t) return;
    
    // format to ISO string of the date dropping onto
    const newDate = new Date(dateStr);
    newDate.setHours(12, 0, 0, 0); // set to noon to avoid timezone drifts
    
    const newDeadline = newDate.toISOString();
    setTasks(ts => ts.map(x => x._id === taskIdToUse ? { ...x, deadline: newDeadline } : x));
    try { await API.tasks.update(taskIdToUse, { deadline: newDeadline }); }
    catch (err) {
      toast.error(err.message || 'Failed to update task deadline');
      loadTasks();
    }
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

  async function saveProjectStatuses(nextStatuses) {
    const cleanStatuses = nextStatuses.map(s => String(s || '').trim()).filter(Boolean);
    if (!embedded) {
      setCustomStatuses(cleanStatuses.filter(s => !DEFAULT_WORKFLOW_STATUSES.includes(s)));
      localStorage.setItem('custom_task_statuses', JSON.stringify(cleanStatuses.filter(s => !DEFAULT_WORKFLOW_STATUSES.includes(s))));
      return;
    }
    setProjectStatuses(cleanStatuses);
    try {
      await API.projects.update(activeProjectIdRef.current, { taskStatuses: cleanStatuses });
    } catch (error) {
      toast.error(error.message || 'Failed to update sections');
      setProjectStatuses(activeProject?.taskStatuses?.length ? activeProject.taskStatuses : DEFAULT_WORKFLOW_STATUSES);
    }
  }

  // Custom Date Sections Management
  function saveCustomSections(sections) {
    setCustomDateSections(sections);
    localStorage.setItem('custom_date_sections', JSON.stringify(sections));
  }

  function saveTaskSectionMap(nextMap) {
    setTaskSectionMap(nextMap);
    localStorage.setItem('task_section_map', JSON.stringify(nextMap));
  }

  function addCustomSection(afterSectionId = null) {
    if (embedded && group === 'status') {
      const perms = activeProject?.permissions || {};
      const isAdmin = user?.isAdmin === true || user?.isAdmin === 'true';
      const isOwner = activeProject && (String(activeProject.owner?._id || activeProject.owner) === String(user?._id || user?.id));
      if (!isAdmin && !isOwner && !perms.memberCanCreateStatus) {
        toast.error('You do not have permission to create statuses');
        return;
      }
      const newStatus = `New Status ${Date.now().toString().slice(-4)}`;
      const insertIndex = afterSectionId
        ? projectStatuses.findIndex(s => s === afterSectionId) + 1
        : projectStatuses.length;
      const nextStatuses = [...projectStatuses];
      nextStatuses.splice(insertIndex <= 0 ? projectStatuses.length : insertIndex, 0, newStatus);
      saveProjectStatuses(nextStatuses);
      setEditingSectionId(newStatus);
      setEditingSectionLabel(newStatus);
      return;
    }
    const newId = `custom_${Date.now()}`;
    const newSection = { id: newId, label: 'New Section', type: 'custom' };
    const insertIndex = afterSectionId
      ? customDateSections.findIndex(s => s.id === afterSectionId) + 1
      : customDateSections.length;
    const nextSections = [...customDateSections];
    nextSections.splice(insertIndex <= 0 ? customDateSections.length : insertIndex, 0, newSection);
    saveCustomSections(nextSections);
    setEditingSectionId(newId);
    setEditingSectionLabel('New Section');
  }

  function updateSectionLabel(sectionId, newLabel) {
    if (embedded && group === 'status') {
      const perms = activeProject?.permissions || {};
      const isAdmin = user?.isAdmin === true || user?.isAdmin === 'true';
      const isOwner = activeProject && (String(activeProject.owner?._id || activeProject.owner) === String(user?._id || user?.id));
      if (!isAdmin && !isOwner && !perms.memberCanEditStatus) {
        toast.error('You do not have permission to edit statuses');
        return;
      }
      if (projectStatuses.some(s => s !== sectionId && s.toLowerCase() === newLabel.toLowerCase())) {
        toast.error('This status already exists');
        return;
      }
      const updated = projectStatuses.map(s => s === sectionId ? newLabel : s);
      saveProjectStatuses(updated);
      const affectedTasks = (tasks || []).filter(t => t.status === sectionId);
      setTasks(ts => (ts || []).map(t => t.status === sectionId ? { ...t, status: newLabel } : t));
      Promise.all(affectedTasks.map(t => API.tasks.update(t._id, { status: newLabel })))
        .catch(() => { toast.error('Some tasks could not be moved to the renamed section'); loadTasks(); });
      return;
    }
    const updated = customDateSections.map(s =>
      s.id === sectionId ? { ...s, label: newLabel } : s
    );
    saveCustomSections(updated);
  }

  function removeCustomSection(sectionId) {
    if (embedded && group === 'status') {
      const perms = activeProject?.permissions || {};
      const isAdmin = user?.isAdmin === true || user?.isAdmin === 'true';
      const isOwner = activeProject && (String(activeProject.owner?._id || activeProject.owner) === String(user?._id || user?.id));
      if (!isAdmin && !isOwner && !perms.memberCanDeleteStatus) {
        toast.error('You do not have permission to delete statuses');
        return;
      }
      if (projectStatuses.length <= 1) {
        toast.error('Keep at least one section');
        return;
      }
      const updated = projectStatuses.filter(s => s !== sectionId);
      const fallbackStatus = updated[0];
      saveProjectStatuses(updated);
      const affectedTasks = (tasks || []).filter(t => t.status === sectionId);
      setTasks(ts => (ts || []).map(t => t.status === sectionId ? { ...t, status: fallbackStatus } : t));
      Promise.all(affectedTasks.map(t => API.tasks.update(t._id, { status: fallbackStatus })))
        .catch(() => { toast.error('Some tasks could not be moved out of the removed section'); loadTasks(); });
      toast.success('Section removed');
      return;
    }
    if (customDateSections.length <= 1) {
      toast.error('Keep at least one section');
      return;
    }
    const updated = customDateSections.filter(s => s.id !== sectionId);
    saveCustomSections(updated);
    const fallbackId = updated[0]?.id;
    if (fallbackId) {
      const nextMap = { ...taskSectionMap };
      Object.entries(nextMap).forEach(([taskId, mappedSectionId]) => {
        if (mappedSectionId === sectionId) nextMap[taskId] = fallbackId;
      });
      saveTaskSectionMap(nextMap);
    }
    setEditingSectionId(null);
    toast.success('Section removed');
  }

  function startEditingSection(sectionId, currentLabel) {
    setEditingSectionId(sectionId);
    setEditingSectionLabel(currentLabel);
  }

  function finishEditingSection() {
    if (editingSectionId && editingSectionLabel.trim()) {
      updateSectionLabel(editingSectionId, editingSectionLabel.trim());
    }
    setEditingSectionId(null);
    setEditingSectionLabel('');
  }

  function resetSectionsToDefault() {
    if (embedded && group === 'status') {
      saveProjectStatuses(DEFAULT_WORKFLOW_STATUSES);
      setEditingSectionId(null);
      toast.success('Sections reset to default');
      return;
    }
    saveCustomSections([...DEFAULT_DATE_SECTIONS]);
    setEditingSectionId(null);
    toast.success('Sections reset to default');
  }

  function moveSection(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return;
    if (embedded && group === 'status') {
      const perms = activeProject?.permissions || {};
      const isAdmin = user?.isAdmin === true || user?.isAdmin === 'true';
      const isOwner = activeProject && (String(activeProject.owner?._id || activeProject.owner) === String(user?._id || user?.id));
      if (!isAdmin && !isOwner && !perms.memberCanEditStatus) {
        toast.error('You do not have permission to edit statuses');
        return;
      }
      const sourceIndex = projectStatuses.findIndex(s => s === sourceId);
      const targetIndex = projectStatuses.findIndex(s => s === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return;
      const updated = [...projectStatuses];
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, moved);
      saveProjectStatuses(updated);
      return;
    }
    const sourceIndex = customDateSections.findIndex(s => s.id === sourceId);
    const targetIndex = customDateSections.findIndex(s => s.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const updated = [...customDateSections];
    const [moved] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, moved);
    saveCustomSections(updated);
  }

  function moveTaskToSection(taskId, sectionId) {
    if (!taskId || !sectionId) return;
    if (embedded && group === 'status') {
      handleDropStatus(null, sectionId, taskId);
      return;
    }
    saveTaskSectionMap({ ...taskSectionMap, [taskId]: sectionId });
  }

  async function handleAddTask(sectionKey) {
    if (!newTaskInput.title.trim()) return;
    const p = activeProject || projects[0];
    if (!p) { toast.error('Join a project first'); return; }

    const activeGroup = group;

    let payload = {
      title: newTaskInput.title.trim(),
      description: newTaskInput.requirements.trim() || 'Added from My Tasks',
      assignedRole: 'Developer',
      assignedTo: newTaskInput.assignee === 'unassigned' ? [] : [newTaskInput.assignee === 'me' ? 'me' : newTaskInput.assignee],
      priority: newTaskInput.priority || 'Medium',
      status: newTaskInput.status || 'Todo',
    };

    if (isSectionGroup(activeGroup)) {
      const section = customDateSections.find(s => s.id === sectionKey);
      if (section) {
        if (section.type === 'today') payload.deadline = new Date().toISOString();
        else if (section.type === 'nextWeek') { const d = new Date(); d.setDate(d.getDate()+3); payload.deadline = d.toISOString(); }
        else if (section.type === 'later') { const d = new Date(); d.setDate(d.getDate()+14); payload.deadline = d.toISOString(); }
        else if (section.type === 'recently') { /* no deadline */ }
        else if (section.type === 'custom') { /* custom section - no automatic deadline */ }
      }
    } else if (activeGroup === 'status') {
      payload.status = sectionKey;
    } else if (activeGroup === 'priority') {
      if (['High', 'Medium', 'Low'].includes(sectionKey)) payload.priority = sectionKey;
    }

    try {
      if (newTaskInput.deadline) payload.deadline = new Date(newTaskInput.deadline + 'T00:00:00').toISOString();
      const createdTask = await API.tasks.create(p._id, payload);
      if (isSectionGroup(activeGroup) && sectionKey) {
        const createdTaskId = createdTask?._id || createdTask?.id;
        if (createdTaskId) saveTaskSectionMap({ ...taskSectionMap, [createdTaskId]: sectionKey });
      }
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
    const assignedTo = modalAssignees.map(o => o.value);
    try {
      await API.tasks.create(projectId, {
        title: fd.get('title'),
        description: fd.get('description'),
        assignedRole: fd.get('role') || 'Member',
        priority: fd.get('priority') || 'Medium',
        status: fd.get('status') || 'Todo',
        deadline: fd.get('deadline') || undefined,
        assignedTo,
      });
      toast.success('Task created!');
      setTaskModal(false);
      setTaskModalDate(null);
      setModalAssignees([]);
      loadTasks();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // ── Data pipeline ──────────────────────────────────────
  const processedList = useMemo(() => {
    let list = [...(tasks || [])];
    if (search) list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    if (showMineOnly) list = list.filter(t => Array.isArray(t.assignedTo) && t.assignedTo.some(u => (u._id || u) === user._id));
    if (filter.status) list = list.filter(t => t.status === filter.status);
    if (filter.project) list = list.filter(t => t.projectRef?._id === filter.project);
    if (filter.assignee) {
      if (filter.assignee === 'me') list = list.filter(t => Array.isArray(t.assignedTo) && t.assignedTo.some(u => (u._id || u) === user._id));
      else if (filter.assignee === 'unassigned') list = list.filter(t => !Array.isArray(t.assignedTo) || t.assignedTo.length === 0);
      else list = list.filter(t => Array.isArray(t.assignedTo) && t.assignedTo.some(u => (u._id || u) === filter.assignee));
    }
    list.sort((a, b) => {
      let valA, valB;
      if (sort.field === 'name') { valA = a.title.toLowerCase(); valB = b.title.toLowerCase(); }
      else if (sort.field === 'priority') {
        const pMap = { High: 3, Medium: 2, Low: 1 };
        valA = pMap[a.priority] || 0; valB = pMap[b.priority] || 0;
      }
      else if (sort.field === 'status') {
        const sM = { 'Todo':1, 'In-Progress':2, 'Review':3, 'Done':4, 'Approved':5 };
        valA = sM[a.status] || 0; valB = sM[b.status] || 0;
      }
      else if (sort.field === 'project') {
        valA = (a.projectRef?.title || a.project || '').toLowerCase();
        valB = (b.projectRef?.title || b.project || '').toLowerCase();
      }
      else if (sort.field === 'assignee') {
        valA = (Array.isArray(a.assignedTo) && a.assignedTo.length > 0 ? (a.assignedTo[0].username || a.assignedTo[0].email || '') : '').toLowerCase();
        valB = (Array.isArray(b.assignedTo) && b.assignedTo.length > 0 ? (b.assignedTo[0].username || b.assignedTo[0].email || '') : '').toLowerCase();
      }
      else {
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
    const activeGroup = group;
    const list = processedList;
    const result = [];

    if (isSectionGroup(activeGroup)) {
      const now = new Date(); now.setHours(0,0,0,0);
      const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate()+1);
      const nw = new Date(now); nw.setDate(nw.getDate()+7);

      // Build sections map based on custom date sections
      const sectionsMap = {};
      customDateSections.forEach(section => {
        sectionsMap[section.id] = [];
      });

      list.forEach(t => {
        let assigned = false;
        const mappedSection = taskSectionMap[t._id || t.id];
        if (mappedSection && sectionsMap[mappedSection]) {
          sectionsMap[mappedSection].push(t);
          assigned = true;
        } else if (!t.deadline) {
          if (sectionsMap.recently) { sectionsMap.recently.push(t); assigned = true; }
        } else {
          const d = new Date(t.deadline); d.setHours(0,0,0,0);
          if (d < tomorrow && sectionsMap.today) { sectionsMap.today.push(t); assigned = true; }
          else if (d < nw && sectionsMap.nextWeek) { sectionsMap.nextWeek.push(t); assigned = true; }
        }
        // If not assigned to any section, put in 'later' or first available custom section
        if (!assigned) {
          if (sectionsMap.later) sectionsMap.later.push(t);
          else if (customDateSections.length > 0) {
            sectionsMap[customDateSections[customDateSections.length - 1].id].push(t);
          }
        }
      });

      // Build result from custom sections
      customDateSections.forEach(section => {
        result.push({
          id: section.id,
          label: section.label,
          tasks: sectionsMap[section.id] || [],
          isCustom: section.type === 'custom',
        });
      });

    } else if (activeGroup === 'status') {
      // Use project's custom taskStatuses when embedded, otherwise use defaults + customStatuses
      const statuses = embedded ? projectStatuses : availableStatuses;
      const map = {}; statuses.forEach(s => map[s] = []);
      list.forEach(t => { if(map[t.status]) map[t.status].push(t); else map[statuses[0]].push(t); });
      statuses.forEach(s => result.push({ id: s, label: embedded ? s : (STATUS_CONFIG[s]?.label || s), tasks: map[s] }));

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

    } else if (activeGroup === 'assignee') {
      const map = {};
      list.forEach(t => {
        const assignees = Array.isArray(t.assignedTo) && t.assignedTo.length > 0 ? t.assignedTo : [null];
        assignees.forEach(a => {
          const key = a?._id || 'unassigned';
          if (!map[key]) map[key] = { id: key, label: a?.username || a?.email || 'Unassigned', tasks: [], avatar: a };
          if (!map[key].tasks.find(x => x._id === t._id)) map[key].tasks.push(t);
        });
      });
      result.push(...Object.values(map));

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
  }, [processedList, group, customStatuses, view, customDateSections, taskSectionMap, embedded, projectStatuses]);

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
  const todayDateStr = new Date().toDateString();

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
          appearance: none;
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
        .jira-col-header .section-actions { margin-left: 8px; }
        .jira-col-header:hover .section-actions, .jira-col-header:focus-within .section-actions { opacity: 1; }
        .jira-col-title-inline {
          border: 1px solid transparent; border-radius: 6px; padding: 2px 4px;
          cursor: text; color: var(--text-secondary);
        }
        .jira-col-title-inline:hover { border-color: var(--border); background: rgba(255,255,255,.5); }
        body.dark .jira-col-title-inline:hover { background: rgba(255,255,255,.05); }
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
        .jira-add-section-col {
          border: 1.5px dashed var(--border); border-radius: 14px; min-width: 280px; max-width: 280px;
          height: 72px; padding: 14px; display: flex; align-items: center; justify-content: center;
          color: var(--text-muted); font-size: .82rem; font-weight: 700; cursor: pointer;
          background: var(--bg); transition: all .15s;
        }
        .jira-add-section-col:hover { border-color: var(--green); color: var(--green); background: rgba(34,197,94,.05); }

        /* Priority section accent line */
        .priority-section-bar {
          width: 3px; border-radius: 99px; flex-shrink: 0; align-self: stretch; min-height: 16px;
        }

        /* List view */
        .list-header-cell { font-size: .7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; }
        .list-row { position: relative; display: grid; gap: 14px; padding: 9px 10px; border-bottom: 1px solid var(--border); align-items: center; cursor: pointer; }
        .section-row {
          display: flex; align-items: center; gap: 10px; cursor: pointer;
          padding: 8px 0; border-bottom: 2px solid var(--border); margin-bottom: 4px;
        }
        .section-row.drag-over { background: rgba(34,197,94,.06); border-color: var(--green) !important; }
        .section-title-inline {
          margin: 0; font-size: .85rem; font-weight: 700; color: var(--text-primary);
          border: 1px solid transparent; border-radius: 6px; padding: 2px 4px; cursor: text;
        }
        .section-title-inline:hover { border-color: var(--border); background: var(--bg); }
        .section-actions { display: inline-flex; align-items: center; gap: 2px; margin-left: auto; opacity: 0; transition: opacity .15s; }
        .section-row:hover .section-actions, .section-row:focus-within .section-actions { opacity: 1; }
        .section-icon-btn {
          width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center;
          border: none; border-radius: 7px; background: transparent; color: var(--text-muted);
          cursor: pointer; transition: background .15s, color .15s;
        }
        .section-icon-btn:hover { background: var(--bg); color: var(--text-primary); }
        .section-icon-btn.danger:hover { color: #ef4444; }
        .section-drag-handle { cursor: grab; }
        .section-drag-handle:active { cursor: grabbing; }
        .inline-add-section {
          display: inline-flex; align-items: center; gap: 8px; border: none; background: transparent;
          color: var(--text-muted); font-size: .8rem; font-weight: 600; cursor: pointer;
          padding: 8px 4px; border-radius: 8px; margin-left: 22px;
        }
        .inline-add-section:hover { color: var(--green); background: rgba(34,197,94,.06); }

        /* Delete button hover */
        .del-btn { opacity: 0; transition: opacity .2s; }
        .hover-row:hover .del-btn, .jira-card:hover .del-btn { opacity: .7; }
        .del-btn:hover { opacity: 1 !important; color: #ef4444 !important; }

        /* Calendar */
        .calendar-shell {
          background: var(--white);
          border-radius: 18px;
          box-shadow: var(--shadow);
          border: 1px solid var(--border);
          padding: 18px;
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        body.dark .calendar-shell {
          background: var(--white);
          border-color: var(--border);
          box-shadow: var(--shadow);
        }
        .calendar-hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }
        .calendar-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .calendar-title {
          margin: 0;
          font-size: 1.18rem;
          font-weight: 750;
          color: var(--text-primary);
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 1px;
          background: var(--border);
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--border);
        }
        .cal-header-cell {
          background: rgba(255,255,255,.78);
          padding: 12px 8px;
          text-align: center;
          font-size: .68rem;
          font-weight: 700;
          letter-spacing: .06em;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        body.dark .cal-header-cell { background: rgba(255,255,255,.03); color: var(--text-muted); }
        .cal-cell {
          background: var(--white);
          min-height: 124px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 5px;
          position: relative;
          transition: background .15s, box-shadow .15s;
        }
        .cal-cell.dim { background: var(--bg); }
        body.dark .cal-cell.dim { background: rgba(255,255,255,.015); }
        .cal-cell.today {
          box-shadow: inset 0 0 0 1px rgba(34,197,94,.55);
          z-index: 1;
        }
        .cal-cell:hover { background: rgba(0,0,0,.01); }
        body.dark .cal-cell:hover { background: rgba(255,255,255,.035); }
        .cal-cell.drag-over { background: rgba(34,197,94,.08) !important; box-shadow: inset 0 0 0 2px var(--green); }
        .cal-date-chip {
          font-weight: 700;
          color: var(--text-primary);
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: auto;
          font-size: .75rem;
        }
        .cal-date-chip.dim { color: var(--text-muted); opacity: .72; }
        .cal-date-chip.today { background: var(--green); color: #fff; box-shadow: none; }
        .cal-task-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
          overflow-y: auto;
          min-height: 0;
          padding-right: 1px;
          scrollbar-width: thin;
        }
        .cal-task {
          position: relative;
          min-height: 22px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: .68rem;
          line-height: 1.1;
          padding: 4px 8px 4px 7px;
          border-radius: 6px;
          overflow: hidden;
          cursor: pointer;
          background: rgba(0,0,0,.035);
          border: 1px solid rgba(0,0,0,.055);
          color: var(--text-primary);
          font-weight: 650;
          transition: background .15s, border-color .15s;
        }
        body.dark .cal-task {
          background: rgba(255,255,255,.075);
          border-color: rgba(255,255,255,.075);
        }
        .cal-task:hover {
          filter: brightness(1.08);
          border-color: var(--cal-task-accent);
        }
        .cal-task::before {
          content: "";
          width: 4px;
          height: 14px;
          border-radius: 999px;
          background: var(--cal-task-accent);
          flex: 0 0 auto;
        }
        .cal-task-title {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .calendar-more {
          color: var(--text-muted);
          font-size: .68rem;
          font-weight: 800;
          padding: 2px 8px;
        }

        /* Priority dots */
        .pdot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .pdot--high   { background: #ef4444; box-shadow: 0 0 4px rgba(239,68,68,.4); }
        .pdot--medium { background: #f59e0b; box-shadow: 0 0 4px rgba(245,158,11,.35); }
        .pdot--low    { background: #22c55e; box-shadow: 0 0 4px rgba(34,197,94,.35); }
      `}</style>

      {!embedded && <Topbar title="My Tasks" />}

      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="toolbar" style={{ flexWrap: 'nowrap', overflowX: 'auto', gap: 8 }}>
        {/* View switcher */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg)', borderRadius: 10, padding: 3, flexShrink: 0 }}>
          {[['list','fa-list','List'],['board','fa-trello','Board'],['calendar','fa-calendar','Calendar']].map(([v, icon, lbl]) => (
            <button
              key={v}
              className={`tool-btn ${view === v ? 'active' : ''}`}
              onClick={() => setView(v)}
              style={{ borderRadius: 7, border: 'none', background: view === v ? 'var(--nav-active-bg)' : 'transparent',
                color: view === v ? 'var(--nav-active-text)' : 'var(--text-secondary)',
                boxShadow: view === v ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}
            >
              <i className={`fa-solid ${icon}`} style={{ fontSize: '.75rem' }} /> {lbl}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 2px', flexShrink: 0 }} />

        {/* Asana-style Grouping Pills */}
        {view !== 'calendar' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, minWidth: 0 }}>
            <GroupPill
              icon="fa-layer-group"
              label="Group"
              value={GROUP_LABELS[group] || group}
              options={GROUP_OPTIONS.map(o => ({ value: o.value, label: o.label, icon: o.icon }))}
              current={group}
              onChange={setGroup}
            />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
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
          style={{ flexShrink: 0 }}
        >
          <i className="fa-solid fa-user" style={{ fontSize: '.72rem' }} />
          {showMineOnly ? 'My tasks only' : 'All tasks'}
        </button>

        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ position: 'relative', width: 200, flexShrink: 0 }}>
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
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
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

        <button className="btn btn--green btn--sm" onClick={() => setTaskModal(true)} style={{ borderRadius: 10, flexShrink: 0 }}>
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
              <div className="list-header-cell" style={{ cursor: 'pointer' }} onClick={() => setSort({ field: 'name', dir: sort.field === 'name' && sort.dir === 'asc' ? 'desc' : 'asc' })}>Name {sort.field === 'name' && (sort.dir === 'asc' ? '↑' : '↓')}</div>
              <div className="list-header-cell" style={{ cursor: 'pointer' }} onClick={() => setSort({ field: 'date', dir: sort.field === 'date' && sort.dir === 'asc' ? 'desc' : 'asc' })}>Due date {sort.field === 'date' && (sort.dir === 'asc' ? '↑' : '↓')}</div>
              {columns.priority     && <div className="list-header-cell" style={{ cursor: 'pointer' }} onClick={() => setSort({ field: 'priority', dir: sort.field === 'priority' && sort.dir === 'asc' ? 'desc' : 'asc' })}>Priority {sort.field === 'priority' && (sort.dir === 'asc' ? '↑' : '↓')}</div>}
              {columns.collaborators && <div className="list-header-cell" style={{ cursor: 'pointer' }} onClick={() => setSort({ field: 'assignee', dir: sort.field === 'assignee' && sort.dir === 'asc' ? 'desc' : 'asc' })}>Assignee {sort.field === 'assignee' && (sort.dir === 'asc' ? '↑' : '↓')}</div>}
              {columns.projects      && <div className="list-header-cell" style={{ cursor: 'pointer' }} onClick={() => setSort({ field: 'project', dir: sort.field === 'project' && sort.dir === 'asc' ? 'desc' : 'asc' })}>Project {sort.field === 'project' && (sort.dir === 'asc' ? '↑' : '↓')}</div>}
              {columns.status        && <div className="list-header-cell" style={{ cursor: 'pointer' }} onClick={() => setSort({ field: 'status', dir: sort.field === 'status' && sort.dir === 'asc' ? 'desc' : 'asc' })}>Status {sort.field === 'status' && (sort.dir === 'asc' ? '↑' : '↓')}</div>}
            </div>

            <div style={{ overflowY: 'auto', padding: '8px 24px 16px' }}>
              {processedGroups.map(g => (
                <div 
                  key={g.id} 
                  style={{ marginBottom: 24 }}
                  onDragOver={e => e.preventDefault()}
                  onDragEnter={e => e.currentTarget.classList.add('drag-over')}
                  onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
                  onDrop={e => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('drag-over');
                    if (isCustomizableGroup(group)) {
                      if (draggedSectionId) moveSection(draggedSectionId, g.id);
                      else {
                        const dtId = e.dataTransfer.getData('text/plain') || draggedTaskId;
                        if (dtId) moveTaskToSection(dtId, g.id);
                      }
                      setDraggedSectionId(null);
                      setDraggedTaskId(null);
                      return;
                    }
                    const dtId = e.dataTransfer.getData('text/plain') || draggedTaskId;
                    if (dtId) { handleDropStatus(e, g.id, dtId); } else { handleDropStatus(e, g.id); }
                  }}
                >
                  {/* Group header */}
                  <div
                    className="section-row"
                    onClick={() => setCollapsed(prev => ({ ...prev, [g.id]: !prev[g.id] }))}
                    style={{ borderBottomColor: g.accentColor || 'var(--border)' }}
                  >
                    <i className={`fa-solid fa-chevron-${collapsed[g.id] ? 'right' : 'down'}`} style={{ color: g.accentColor || 'var(--text-muted)', fontSize: '.7rem', width: 12 }} />
                    {g.accentColor && <span className="priority-section-bar" style={{ background: g.accentColor }} />}
                    {editingSectionId === g.id && isCustomizableGroup(group) ? (
                      <input
                        autoFocus
                        className="form-input"
                        value={editingSectionLabel}
                        onChange={e => setEditingSectionLabel(e.target.value)}
                        onBlur={finishEditingSection}
                        onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') finishEditingSection(); if (e.key === 'Escape') setEditingSectionId(null); }}
                        onClick={e => e.stopPropagation()}
                        style={{ flex: 1, padding: '4px 8px', fontSize: '.85rem', maxWidth: 200 }}
                      />
                    ) : (
                      <h4
                        className="section-title-inline"
                        onClick={e => {
                          if (!isCustomizableGroup(group)) return;
                          e.stopPropagation();
                          startEditingSection(g.id, g.label);
                        }}
                        style={{ color: g.accentColor || 'var(--text-primary)', cursor: isCustomizableGroup(group) ? 'text' : 'pointer' }}
                      >
                        {g.label}
                      </h4>
                    )}
                    <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontWeight: 500, background: 'var(--bg)', borderRadius: 99, padding: '1px 8px' }}>{g.tasks.length}</span>
                    {isCustomizableGroup(group) && editingSectionId !== g.id && (
                      <div className="section-actions">
                        <button
                          type="button"
                          className="section-icon-btn"
                          onClick={(e) => { e.stopPropagation(); addCustomSection(g.id); }}
                          aria-label="Add section below"
                          title="Add section below"
                        >
                          <i className="fa-solid fa-plus" />
                        </button>
                        <button
                          type="button"
                          className="section-icon-btn danger"
                          onClick={(e) => { e.stopPropagation(); removeCustomSection(g.id); }}
                          aria-label="Remove section"
                          title="Remove section"
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                        <span
                          className="section-icon-btn section-drag-handle"
                          draggable
                          onClick={e => e.stopPropagation()}
                          onDragStart={e => { e.stopPropagation(); setDraggedSectionId(g.id); e.dataTransfer.effectAllowed = 'move'; }}
                          onDragEnd={() => setDraggedSectionId(null)}
                          role="button"
                          aria-label="Drag section"
                          title="Drag section"
                        >
                          <i className="fa-solid fa-grip-vertical" />
                        </span>
                      </div>
                    )}
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
                            draggable={isCustomizableGroup(group)}
                            onDragStart={e => {
                              if (!isCustomizableGroup(group)) return;
                              setDraggedTaskId(t._id);
                              draggedTaskIdRef.current = t._id;
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', t._id);
                            }}
                            onDragEnd={() => { setDraggedTaskId(null); draggedTaskIdRef.current = null; }}
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
                                {Array.isArray(t.assignedTo) && t.assignedTo.length > 0
                                  ? (
                                    <div style={{ display: 'flex' }}>
                                      {t.assignedTo.map((u, i) => (
                                        <div key={u._id || i} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i, border: '2px solid var(--white)', borderRadius: '50%' }}>
                                          <Avatar user={u} size="sm" />
                                        </div>
                                      ))}
                                    </div>
                                  )
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
                              <div onClick={e => e.stopPropagation()}>
                                <select
                                  value={t.status}
                                  onChange={e => {
                                    const nextStatus = e.target.value;
                                    handleDropStatus(null, nextStatus, t._id);
                                  }}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    background: sCfg.bg, color: sCfg.color, borderRadius: 6,
                                    padding: '3px 0', fontSize: '.72rem', fontWeight: 700,
                                    border: 'none', cursor: 'pointer', outline: 'none'
                                  }}
                                >
                                  {availableStatuses.map(st => (
                                    <option key={st} value={st} style={{ color: '#000' }}>{st}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Actions */}
                            {canDeleteTask && (
                              <button
                                className="del-btn"
                                onClick={e => handleDeleteTask(t._id, e)}
                                style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                                title="Delete task"
                              >
                                <i className="fa-solid fa-trash-can" style={{ fontSize: '.85rem' }} />
                              </button>
                            )}
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
                            availableStatuses={availableStatuses}
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
              {isCustomizableGroup(group) && (
                <button
                  type="button"
                  className="inline-add-section"
                  onClick={() => addCustomSection()}
                >
                  <i className="fa-solid fa-plus" />
                  Add section
                </button>
              )}
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
                onDrop={e => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('drag-over');
                  if (isCustomizableGroup(group)) {
                    if (draggedSectionId) moveSection(draggedSectionId, g.id);
                    else {
                      const dtId = e.dataTransfer.getData('text/plain') || draggedTaskId;
                      if (dtId) moveTaskToSection(dtId, g.id);
                    }
                    setDraggedSectionId(null);
                    setDraggedTaskId(null);
                    return;
                  }
                  const dtId = e.dataTransfer.getData('text/plain');
                  if (dtId) { handleDropStatus(e, g.id, dtId); } else { handleDropStatus(e, g.id); }
                }}
                onDragEnter={e => e.currentTarget.classList.add('drag-over')}
                onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
              >
                <div className="jira-col-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1 }}>
                    {g.accentColor && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.accentColor, display: 'inline-block' }} />
                    )}
                    {editingSectionId === g.id && isCustomizableGroup(group) ? (
                      <input
                        autoFocus
                        className="form-input"
                        value={editingSectionLabel}
                        onChange={e => setEditingSectionLabel(e.target.value)}
                        onBlur={finishEditingSection}
                        onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') finishEditingSection(); if (e.key === 'Escape') setEditingSectionId(null); }}
                        onClick={e => e.stopPropagation()}
                        style={{ flex: 1, padding: '4px 8px', fontSize: '.78rem', textTransform: 'none', letterSpacing: 0 }}
                      />
                    ) : (
                      <span
                        className="jira-col-title-inline"
                        onClick={e => {
                          if (!isCustomizableGroup(group)) return;
                          e.stopPropagation();
                          startEditingSection(g.id, g.label);
                        }}
                        style={{ cursor: isCustomizableGroup(group) ? 'text' : 'default' }}
                      >
                        {g.label}
                      </span>
                    )}
                    {isCustomizableGroup(group) && editingSectionId !== g.id && (
                      <div className="section-actions">
                        <button
                          type="button"
                          className="section-icon-btn"
                          onClick={(e) => { e.stopPropagation(); addCustomSection(g.id); }}
                          aria-label="Add section after"
                          title="Add section after"
                        >
                          <i className="fa-solid fa-plus" />
                        </button>
                        <button
                          type="button"
                          className="section-icon-btn danger"
                          onClick={(e) => { e.stopPropagation(); removeCustomSection(g.id); }}
                          aria-label="Remove section"
                          title="Remove section"
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                        <span
                          className="section-icon-btn section-drag-handle"
                          draggable
                          onClick={e => e.stopPropagation()}
                          onDragStart={e => { e.stopPropagation(); setDraggedSectionId(g.id); e.dataTransfer.effectAllowed = 'move'; }}
                          onDragEnd={() => setDraggedSectionId(null)}
                          role="button"
                          aria-label="Drag section"
                          title="Drag section"
                        >
                          <i className="fa-solid fa-grip-vertical" />
                        </span>
                      </div>
                    )}
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
                      onDragStart={e => { setDraggedTaskId(t._id); draggedTaskIdRef.current = t._id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', t._id); }}
                      onDragEnd={() => { setDraggedTaskId(null); draggedTaskIdRef.current = null; }}
                      onClick={() => setSelectedTask(t)}
                      style={{ position: 'relative', borderLeftColor: cardColor }}
                    >
                      {canDeleteTask && (
                        <button
                          className="del-btn"
                          onClick={e => handleDeleteTask(t._id, e)}
                          style={{ position: 'absolute', top: '6px', right: '6px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                          title="Delete task"
                        >
                          <i className="fa-solid fa-trash-can" style={{ fontSize: '.8rem' }} />
                        </button>
                      )}
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
                          {Array.isArray(t.assignedTo) && t.assignedTo.length > 0
                            ? (
                              <div style={{ display: 'flex' }}>
                                {t.assignedTo.map((u, i) => (
                                  <div key={u._id || i} style={{ marginLeft: i > 0 ? -6 : 0, zIndex: 10 - i, border: '2px solid var(--white)', borderRadius: '50%' }}>
                                    <Avatar user={u} size="sm" style={{ width: 22, height: 22 }} />
                                  </div>
                                ))}
                              </div>
                            )
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
                    availableStatuses={availableStatuses}
                  />
                ) : (
                  <div className="jira-inline-add" onClick={() => openInlineComposer(g.id)}>
                    <i className="fa-solid fa-plus" style={{ marginRight: 6, fontSize: '.75rem' }} />Add task
                  </div>
                )}
              </div>
            ))}

            {isCustomizableGroup(group) && (
              <button type="button" className="jira-add-section-col" onClick={() => addCustomSection()}>
                <i className="fa-solid fa-plus" style={{ marginRight: 8 }} />
                Add section
              </button>
            )}

            {/* Add custom status column (only for global My Tasks page) */}
            {!embedded && !isCustomizableGroup(group) && (
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
            )}
          </div>

        ) : (

          /* ══ CALENDAR VIEW ══════════════════════════════ */
          <div className="calendar-shell">
            <div className="calendar-hero">
              <div>
                <div className="calendar-title-row">
                  <h3 className="calendar-title">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn--sm btn--outline" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}><i className="fa-solid fa-chevron-left"/></button>
                <button className="btn btn--sm btn--outline" onClick={() => setCurrentDate(new Date())}>Today</button>
                <button className="btn btn--sm btn--outline" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}><i className="fa-solid fa-chevron-right"/></button>
              </div>
            </div>
            <div className="calendar-grid" style={{ flex: 1 }}>
              {CAL_DAYS.map(day => <div key={day} className="cal-header-cell">{day}</div>)}
              {calendarCells.map((c, i) => {
                const isToday = c.dateStr === todayDateStr;

                return (
                <div key={i} className={`cal-cell ${!c.current ? 'dim' : ''} ${isToday ? 'today' : ''}`}
                  onDragOver={e => e.preventDefault()}
                  onDragEnter={e => e.currentTarget.classList.add('drag-over')}
                  onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
                  onDrop={e => { e.currentTarget.classList.remove('drag-over'); handleDropDeadline(e, c.dateStr); }}
                  onClick={() => { setTaskModalDate(c.dateStr); setTaskModal(true); }}
                  aria-label={`${c.day} ${MONTHS[new Date(c.dateStr).getMonth()]} - ${c.tasks.length} tasks`}
                  style={{ cursor: 'pointer' }}>
                  <div className={`cal-date-chip ${!c.current ? 'dim' : ''} ${isToday ? 'today' : ''}`}>{c.day}</div>
                  <div className="cal-task-list">
                    {c.tasks.slice(0, 5).map(t => {
                      const taskStyle = getCalendarTaskStyle(t);
                      return (
                        <div key={t._id} className="cal-task"
                          draggable
                          onDragStart={(e) => { e.stopPropagation(); setDraggedTaskId(t._id); draggedTaskIdRef.current = t._id; }}
                          onClick={(e) => { e.stopPropagation(); setSelectedTask(t); }}
                          style={taskStyle} title={`${t.title}${t.status ? ` - ${t.status}` : ''}`}>
                          <span className="cal-task-title">{t.title}</span>
                        </div>
                      );
                    })}
                    {c.tasks.length > 5 && <div className="calendar-more">+{c.tasks.length - 5} more</div>}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Task Side Panel ──────────────────────── */}
      {selectedTask && (
        <TaskSidePanel
          task={selectedTask}
          onClose={() => { setSelectedTask(null); loadTasks(); }}
          isOwner={isOwner}
          isMember={true}
          userId={user?._id || user?.id}
          projectId={activeProjectId}
          projectCustomFields={activeProject?.customFields}
          projectPermissions={activeProject?.permissions}
          onTaskUpdate={updated => {
            setTasks(ts => ts.map(t => t._id === updated._id ? { ...t, ...updated } : t));
            setSelectedTask(prev => prev?._id === updated._id ? { ...prev, ...updated } : prev);
          }}
        />
      )}

      {/* ── Create Task Modal ─────────────────────── */}
      <Modal open={taskModal} onClose={() => { setTaskModal(false); setTaskModalDate(null); }} title="Add Task">
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
                {availableStatuses.map(status => (
                  <option key={status} value={status}>{STATUS_CONFIG[status]?.label || status}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Deadline</label>
              <input name="deadline" className="form-input" type="date" defaultValue={taskModalDate ? (() => { const d = new Date(taskModalDate); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })() : ''} />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <input name="role" className="form-input" placeholder="e.g. Developer" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Collaborator</label>
            <Select
              isMulti
              name="assignedTo"
              className="react-select-container"
              classNamePrefix="react-select"
              placeholder="Unassigned"
              value={modalAssignees}
              onChange={setModalAssignees}
              options={[
                { value: 'me', label: 'Assign to me' },
                ...projectMembers.map(m => {
                  const memberId = m.user?._id || m.userId?._id || m.userId;
                  const memberName = m.user?.username || m.user?.email?.split('@')[0] || 'Member';
                  if (!memberId) return null;
                  return { value: memberId, label: memberName };
                }).filter(Boolean)
              ]}
              styles={{
                control: (base) => ({
                  ...base,
                  borderRadius: '8px',
                  borderColor: 'var(--border)',
                  boxShadow: 'none',
                  minHeight: '38px',
                })
              }}
            />
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
