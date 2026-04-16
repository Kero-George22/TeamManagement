import { useState, useEffect, useMemo } from 'react';
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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function SectionPage() {
  const { user } = useAuth();
  const { projects, selectedProject } = useGlobalProject();
  const toast = useToast();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Toolbar State
  const [view, setView] = useState('list'); // 'list' | 'board' | 'calendar'
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ field: 'date', dir: 'asc' });
  const [group, setGroup] = useState('date');
  const [filter, setFilter] = useState({ status: '', project: '', assignee: '' });
  const [columns, setColumns] = useState({ collaborators: true, projects: true, visibility: true });
  const [showMineOnly, setShowMineOnly] = useState(false);

  const [collapsed, setCollapsed] = useState({});
  const [newTaskInput, setNewTaskInput] = useState({
    section: null,
    title: '',
    requirements: '',
    priority: 'Medium',
    deadline: '',
    assignee: 'me'
  });
  const [taskModal, setTaskModal] = useState(false);

  // Custom Status State
  const [customStatuses, setCustomStatuses] = useState(() => {
    const saved = localStorage.getItem('custom_task_statuses');
    return saved ? JSON.parse(saved) : [];
  });
  const [addingCustomStatus, setAddingCustomStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');

  // Inline editing state
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // Drag state
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d;
  });

  useEffect(() => { loadTasks(); }, [projects, selectedProject]);

  function openInlineComposer(sectionId) {
    setNewTaskInput({
      section: sectionId,
      title: '',
      requirements: '',
      priority: 'Medium',
      deadline: '',
      assignee: 'me'
    });
  }

  async function loadTasks() {
    if (!projects || projects.length === 0) { setTasks([]); return; }
    try {
      if (selectedProject) {
        const list = await API.tasks.list(selectedProject._id);
        setTasks(list.map(t => ({ ...t, projectRef: selectedProject })) || []);
      } else {
        // Fetch all visible tasks in one request (avoids N+1 calls across projects)
        const response = await API.tasks.dashboardOverview();
        setTasks(response?.tasks || []);
      }
    } catch { toast.error('Failed to load tasks'); setTasks([]); }
  }

  // --- ACTIONS ---

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
    if (!draggedTaskId || group !== 'status') return;
    const t = tasks.find(x => x._id === draggedTaskId);
    if (!t || t.status === targetStatus) return;

    setTasks(ts => ts.map(x => x._id === draggedTaskId ? { ...x, status: targetStatus } : x));
    try { await API.tasks.status(draggedTaskId, targetStatus); }
    catch { toast.error('Failed to move task'); loadTasks(); }
    setDraggedTaskId(null);
  }

  function addCustomStatus() {
    if (!newStatusName.trim()) return;
    const normalized = newStatusName.trim();
    if (customStatuses.includes(normalized)) {
      toast.error('Status already exists');
      return;
    }
    const updated = [...customStatuses, normalized];
    setCustomStatuses(updated);
    localStorage.setItem('custom_task_statuses', JSON.stringify(updated));
    setNewStatusName('');
    setAddingCustomStatus(false);
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
    const p = selectedProject || projects[0];
    if (!p) { toast.error('Join a project first'); return; }

    let payload = {
      title: newTaskInput.title.trim(),
      description: newTaskInput.requirements.trim() || 'Added from My Tasks',
      assignedRole: 'Developer',
      assignedTo: newTaskInput.assignee === 'unassigned' ? null : user._id,
      priority: newTaskInput.priority || 'Medium'
    };
    
    if (group === 'date') {
      if (sectionKey === 'today') payload.deadline = new Date().toISOString();
      else if (sectionKey === 'nextWeek') { const d = new Date(); d.setDate(d.getDate()+3); payload.deadline = d.toISOString(); }
      else if (sectionKey === 'later') { const d = new Date(); d.setDate(d.getDate()+14); payload.deadline = d.toISOString(); }
    } else if (group === 'status') {
      payload.status = sectionKey;
    }
    
    try {
      if (newTaskInput.deadline) payload.deadline = new Date(newTaskInput.deadline).toISOString();

      await API.tasks.create(p._id, payload);
      toast.success('Task added');
      setNewTaskInput({
        section: null,
        title: '',
        requirements: '',
        priority: 'Medium',
        deadline: '',
        assignee: 'me'
      });
      loadTasks();
    } catch {
      toast.error('Could not create task');
    }
  }

  function handleInlineTaskInputKeyDown(e, sectionKey) {
    if (e.key === 'Escape') {
      setNewTaskInput({
        section: null,
        title: '',
        requirements: '',
        priority: 'Medium',
        deadline: '',
        assignee: 'me'
      });
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey && e.target?.name !== 'requirements') {
      e.preventDefault();
      handleAddTask(sectionKey);
    }
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const projectId = fd.get('projectId');
    try {
      await API.tasks.create(projectId, {
        title: fd.get('title'),
        description: fd.get('description'),
        assignedRole: fd.get('role') || 'Member',
        priority: fd.get('priority') || 'Medium',
        status: fd.get('status') || 'Todo',
        deadline: fd.get('deadline') || undefined,
        assignedTo: user._id
      });
      toast.success('Task created!');
      setTaskModal(false);
      loadTasks();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // --- DATA PIPELINE ---

  const processedList = useMemo(() => {
    let list = [...(tasks || [])];

    // Filter
    if (search) list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    if (showMineOnly) list = list.filter(t => t.assignedTo?._id === user._id || t.assignedTo === user._id);
    if (filter.status) list = list.filter(t => t.status === filter.status);
    if (filter.project) list = list.filter(t => t.projectRef?._id === filter.project);
    if (filter.assignee) {
      if (filter.assignee === 'me') list = list.filter(t => t.assignedTo?._id === user._id || t.assignedTo === user._id);
      else if (filter.assignee === 'unassigned') list = list.filter(t => !t.assignedTo);
    } else if (!filter.status && view !== 'calendar') {
      // hide Done unless requested (except in calendar view where we might want to see them)
      list = list.filter(t => t.status !== 'Done' && t.status !== 'Approved');
    }

    // Sort
    list.sort((a, b) => {
      let valA, valB;
      if (sort.field === 'name') { valA = a.title.toLowerCase(); valB = b.title.toLowerCase(); }
      else if (sort.field === 'priority') {
        const pMap = { High: 3, Medium: 2, Low: 1 };
        valA = pMap[a.priority] || 0; valB = pMap[b.priority] || 0;
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
    const list = processedList;
    const result = [];
    if (group === 'date') {
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
    } else if (group === 'status') {
      const defaultStatuses = ['Todo', 'In-Progress', 'Review', 'Done', 'Approved'];
      const allStatuses = [...defaultStatuses, ...customStatuses];
      const map = {}; allStatuses.forEach(s => map[s] = []);
      list.forEach(t => { if(map[t.status]) map[t.status].push(t); else map['Todo'].push(t); });
      allStatuses.forEach(s => result.push({ id: s, label: s, tasks: map[s] }));
    } else if (group === 'project') {
      const map = {};
      list.forEach(t => {
        const pId = t.projectRef?._id || 'none';
        if (!map[pId]) map[pId] = { id: pId, label: t.projectRef?.title || 'No Project', tasks: [] };
        map[pId].tasks.push(t);
      });
      result.push(...Object.values(map));
    }
    return result;
  }, [processedList, group, customStatuses]);

  // Calendar logic
  const calendarCells = useMemo(() => {
    if (view !== 'calendar') return [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Previous month padding
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const cells = [];
    for (let x = firstDayIndex; x > 0; x--) {
      cells.push({ day: daysInPrevMonth - x + 1, current: false, dateStr: new Date(year, month - 1, daysInPrevMonth - x + 1).toDateString() });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
       cells.push({ day: i, current: true, dateStr: new Date(year, month, i).toDateString() });
    }

    const remaining = 42 - cells.length; // Ensure 6 rows
    for (let i = 1; i <= remaining; i++) {
       cells.push({ day: i, current: false, dateStr: new Date(year, month + 1, i).toDateString() });
    }
    
    // Group tasks per dateStr
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

  return (
    <>
      <style>{`
        .hover-row:hover { background: rgba(0,0,0,.03); border-radius: 6px; }
        .toolbar { display: flex; gap: 12px; alignItems: center; padding: 12px 30px; background: var(--white); border-bottom: 1px solid var(--border); box-shadow: 0 2px 4px rgba(0,0,0,.02); flex-wrap: wrap; }
        .tool-btn { display: flex; align-items: center; gap: 8px; background: transparent; border: 1px solid var(--border); border-radius: 6px; padding: 6px 12px; font-size: .8rem; font-weight: 500; cursor: pointer; color: var(--text-secondary); transition: .2s; }
        .tool-btn:hover, .tool-btn.active { background: rgba(0,0,0,.03); color: var(--text); border-color: #d1d5db; }
        .board-col { background: var(--white); border-radius: 12px; min-width: 310px; max-width: 310px; padding: 14px; display: flex; flex-direction: column; gap: 10px; height: calc(100vh - 200px); overflow-y: auto; }
        .board-card { background: var(--white); border-radius: 8px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.08); cursor: grab; border: 1px solid var(--border); border-left: 5px solid var(--border); }
        .board-card:active { cursor: grabbing; opacity: 0.8; }
        .jira-board { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 12px; }
        .jira-col {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: 12px;
          min-width: 300px;
          max-width: 300px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          height: calc(100vh - 210px);
          overflow-y: auto;
          box-shadow: 0 1px 3px rgba(0,0,0,.06);
        }
        body.dark .jira-col {
          background: rgba(255,255,255,.04);
          border-color: rgba(255,255,255,.08);
        }
        .jira-col-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: .75rem;
          font-weight: 800;
          letter-spacing: .06em;
          color: var(--text-primary);
          text-transform: uppercase;
          margin-bottom: 4px;
          padding: 0 4px;
        }
        .jira-col-count {
          background: #f3f4f6;
          color: var(--text-muted);
          border-radius: 999px;
          padding: 2px 8px;
          font-size: .65rem;
          font-weight: 700;
        }
        body.dark .jira-col-count {
          background: rgba(255,255,255,.08);
          color: rgba(255,255,255,.6);
        }
        .jira-card {
          background: var(--white);
          border: 1px solid var(--border);
          border-left: 4px solid var(--blue);
          border-radius: 10px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          cursor: grab;
          transition: all .2s;
          box-shadow: 0 1px 2px rgba(0,0,0,.04);
        }
        body.dark .jira-card {
          background: rgba(255,255,255,.03);
          border-color: rgba(255,255,255,.08);
        }
        .jira-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,.08);
          border-color: var(--border);
        }
        body.dark .jira-card:hover {
          box-shadow: 0 4px 8px rgba(0,0,0,.3);
        }
        .jira-card:active { cursor: grabbing; }
        .jira-card-title {
          font-size: .9rem;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.4;
          word-break: break-word;
        }
        .jira-card-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: .75rem;
          color: var(--text-muted);
          gap: 8px;
        }
        .jira-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: 1px solid var(--border);
          border-radius: 5px;
          padding: 3px 7px;
          color: var(--text-secondary);
          background: #f9fafb;
          font-size: .7rem;
        }
        body.dark .jira-chip {
          background: rgba(255,255,255,.05);
          border-color: rgba(255,255,255,.08);
        }
        .jira-inline-add {
          border: 1.5px dashed var(--border);
          border-radius: 8px;
          padding: 12px;
          color: var(--text-secondary);
          font-size: .8rem;
          font-weight: 500;
          cursor: pointer;
          text-align: center;
          transition: .2s;
          background: var(--bg);
        }
        .jira-inline-add:hover {
          border-color: var(--blue);
          color: var(--blue);
          background: rgba(59,130,246,.04);
        }
        body.dark .jira-inline-add {
          background: rgba(255,255,255,.02);
          color: rgba(255,255,255,.5);
        }
        body.dark .jira-inline-add:hover {
          background: rgba(59,130,246,.1);
          border-color: var(--blue);
          color: var(--blue);
        }
        .jira-inline-editor {
          border: 1.5px solid var(--blue);
          border-radius: 10px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: var(--bg);
        }
        body.dark .jira-inline-editor {
          background: rgba(59,130,246,.05);
        }
        .jira-inline-editor .form-input {
          background: var(--white);
          border-color: var(--border);
          color: var(--text-primary);
        }
        body.dark .jira-inline-editor .form-input {
          background: rgba(255,255,255,.08);
          border-color: rgba(255,255,255,.1);
          color: var(--text-primary);
        }
        .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: var(--border); border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }
        .cal-header-cell { background: var(--white); padding: 10px; text-align: center; font-size: .75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
        .cal-cell { background: var(--white); min-height: 120px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
        .cal-cell.dim { background: var(--bg); }
        .cal-cell-day { font-size: .8rem; font-weight: 600; color: var(--text-muted); text-align: right; }
        .cal-task { font-size: .7rem; padding: 4px 6px; border-radius: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,.05); border-left: 3px solid transparent; }
        body.dark .hover-row:hover { background: rgba(255,255,255,.04); }
        body.dark .tool-btn:hover, body.dark .tool-btn.active { background: rgba(255,255,255,.06); color: var(--text-primary); border-color: #2f2f2f; }
        body.dark .toolbar { box-shadow: 0 2px 4px rgba(0,0,0,.12); }
        body.dark .cal-header-cell { background: rgba(255,255,255,.03); }
        body.dark .cal-cell.dim { background: rgba(255,255,255,.02); }
      `}</style>

      <Topbar title="My Tasks" />

      {/* Toolbar */}
      <div className="toolbar">
        <div style={{ display: 'flex', gap: 4 }}>
          <button className={`tool-btn ${view==='list'?'active':''}`} onClick={()=>setView('list')}><i className="fa-solid fa-list" /> List</button>
          <button className={`tool-btn ${view==='board'?'active':''}`} onClick={()=>setView('board')}><i className="fa-brands fa-trello" /> Board</button>
          <button className={`tool-btn ${view==='calendar'?'active':''}`} onClick={()=>setView('calendar')}><i className="fa-regular fa-calendar" /> Calendar</button>
        </div>
        <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

        {/* Dynamic Filters depending on view */}
        {view !== 'calendar' && (
          <>
            <select className="tool-btn" value={`${sort.field}-${sort.dir}`} onChange={e => { const [f, d] = e.target.value.split('-'); setSort({field: f, dir: d}); }}>
              <option value="date-asc">Due Date (Asc)</option>
              <option value="date-desc">Due Date (Desc)</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="priority-desc">Priority</option>
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Group:</span>
              <select className="tool-btn" value={group} onChange={e => setGroup(e.target.value)}>
                <option value="date">Due Date</option>
                <option value="status">Status</option>
                <option value="project">Project</option>
              </select>
            </div>
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
           <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Assignee:</span>
           <select className="tool-btn" value={filter.assignee} onChange={e => setFilter(f => ({...f, assignee: e.target.value}))}>
             <option value="">Everyone</option>
             <option value="me">Just Me</option>
             <option value="unassigned">Unassigned</option>
           </select>
        </div>

        <button className={`tool-btn ${showMineOnly ? 'active' : ''}`} onClick={() => setShowMineOnly(v => !v)}>
          <i className="fa-solid fa-user" /> {showMineOnly ? 'My tasks only' : 'Show only my tasks'}
        </button>

        <div style={{ flex: 1 }} />
        
        <div style={{ position: 'relative', width: 220 }}>
          <i className="fa-solid fa-search" style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-muted)', fontSize: '.8rem' }} />
          <input type="text" className="tool-btn" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', paddingLeft: 30, background: '#f9fafb' }} />
        </div>

        {view === 'list' && (
          <div className="tool-btn" style={{ position: 'relative' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={columns.collaborators} onChange={e => setColumns(c => ({...c, collaborators: e.target.checked}))} /> Team</label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={columns.projects} onChange={e => setColumns(c => ({...c, projects: e.target.checked}))} /> Projects</label>
          </div>
        )}

        <button className="btn btn--green btn--sm" onClick={() => setTaskModal(true)}><i className="fa-solid fa-plus" /> Add Task</button>
      </div>

      <div style={{ padding: '20px 30px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tasks === null ? ( <div className="skeleton" style={{ height: 200, borderRadius: 12 }} /> ) : (

          view === 'list' ? (
            <div style={{ background: 'var(--white)', borderRadius: 'var(--card-radius)', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ 
                display: 'grid', gridTemplateColumns: `minmax(250px, 3fr) 150px ${columns.collaborators?'150px ':''}${columns.projects?'200px ':''}120px`, 
                gap: 16, padding: '10px 10px 10px 34px', borderBottom: '2px solid var(--border)',
                fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase'
              }}>
                <div>Name</div><div>Due date</div>
                {columns.collaborators && <div>Collaborators</div>}
                {columns.projects && <div>Projects</div>}
                {columns.visibility && <div>Visibility</div>}
              </div>

              <div style={{ overflowY: 'auto', padding: '10px 30px' }}>
                {processedGroups.map(g => (
                  <div key={g.id} style={{ marginBottom: 20 }}>
                    <div onClick={() => setCollapsed(prev => ({ ...prev, [g.id]: !prev[g.id] }))} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <i className={`fa-solid fa-chevron-${collapsed[g.id] ? 'right' : 'down'}`} style={{ color: 'var(--text-muted)', fontSize: '.75rem', width: 14 }} />
                      <h4 style={{ margin: 0, fontSize: '.95rem', fontWeight: 700 }}>{g.label} <span style={{color:'var(--text-muted)', fontSize:'.75rem', fontWeight: 400}}>({g.tasks.length})</span></h4>
                    </div>
                    
                    {!collapsed[g.id] && (
                      <div style={{ paddingLeft: 24, marginTop: 4 }}>
                        {g.tasks.map(t => {
                          const cCol = getProjectColor(t.projectRef?._id);
                          return (
                          <div key={t._id} style={{ 
                            display: 'grid', gridTemplateColumns: `minmax(250px, 3fr) 150px ${columns.collaborators?'150px ':''}${columns.projects?'200px ':''}120px`, 
                            gap: 16, padding: '10px', borderBottom: '1px solid var(--border)', alignItems: 'center', cursor: 'pointer'
                          }} className="hover-row" onClick={() => setSelectedTask(t)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div className={`priority-dot priority-dot--${(t.priority || 'low').toLowerCase()}`} />
                              
                              {editingTask === t._id ? (
                                <input autoFocus type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} onBlur={() => handleUpdateTitle(t._id)} onKeyDown={e => e.key === 'Enter' && handleUpdateTitle(t._id)} style={{ border: '1px solid var(--blue)', borderRadius: 4, padding: '2px 6px', fontSize: '.875rem' }} />
                              ) : (
                                <span style={{ fontSize: '.875rem', fontWeight: 500, cursor: 'text' }} onClick={(e) => { e.stopPropagation(); setEditingTask(t._id); setEditTitle(t.title); }}>{t.title}</span>
                              )}
                            </div>
                            <div style={{ fontSize: '.8rem', color: t.deadline && new Date(t.deadline) < new Date() ? '#ef4444' : 'var(--text-muted)' }}>{t.deadline ? fmtDate(t.deadline) : '—'}</div>
                            {columns.collaborators && <div>{t.assignedTo ? <Avatar user={t.assignedTo} size="sm" /> : <span style={{color:'var(--text-muted)', fontSize:'.8rem'}}>Unassigned</span>}</div>}
                            {columns.projects && <div>{t.projectRef && <Badge variant={cCol} style={{ fontSize: '.7rem' }}>{t.projectRef.title}</Badge>}</div>}
                            {columns.visibility && <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{t.projectRef?.isPrivate ? 'Private' : 'Workspace'}</div>}
                          </div>
                        )})}
                        {newTaskInput.section === g.id ? (
                          <div style={{ padding: '10px 12px 12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <input
                              autoFocus
                              type="text"
                              value={newTaskInput.title}
                            onChange={e => setNewTaskInput(prev => ({ ...prev, section: g.id, title: e.target.value }))}
                              onKeyDown={e => handleInlineTaskInputKeyDown(e, g.id)}
                              placeholder="Task name"
                              style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', outline: 'none', width:'100%', fontSize:'.875rem' }}
                            />
                            <textarea
                              name="requirements"
                              value={newTaskInput.requirements}
                              onChange={e => setNewTaskInput(prev => ({ ...prev, requirements: e.target.value }))}
                              onKeyDown={e => handleInlineTaskInputKeyDown(e, g.id)}
                              placeholder="Task requirements (optional)"
                              rows={2}
                              style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', outline: 'none', width:'100%', fontSize:'.82rem', resize: 'vertical' }}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                              <select
                                className="form-input"
                                value={newTaskInput.priority}
                                onChange={e => setNewTaskInput(prev => ({ ...prev, priority: e.target.value }))}
                                style={{ fontSize: '.78rem', padding: '6px 8px' }}
                              >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                              </select>
                              <input
                                type="date"
                                className="form-input"
                                value={newTaskInput.deadline}
                                onChange={e => setNewTaskInput(prev => ({ ...prev, deadline: e.target.value }))}
                                style={{ fontSize: '.78rem', padding: '6px 8px' }}
                              />
                              <select
                                className="form-input"
                                value={newTaskInput.assignee}
                                onChange={e => setNewTaskInput(prev => ({ ...prev, assignee: e.target.value }))}
                                style={{ fontSize: '.78rem', padding: '6px 8px' }}
                              >
                                <option value="me">Collaboration: Me</option>
                                <option value="unassigned">Collaboration: Unassigned</option>
                              </select>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button type="button" className="btn btn--green btn--sm" onClick={() => handleAddTask(g.id)}>Create</button>
                              <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                onClick={() => setNewTaskInput({
                                  section: null,
                                  title: '',
                                  requirements: '',
                                  priority: 'Medium',
                                  deadline: '',
                                  assignee: 'me'
                                })}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div onClick={() => openInlineComposer(g.id)} style={{ padding: '10px 10px 10px 18px', color: 'var(--text-secondary)', fontSize: '.85rem', cursor: 'pointer' }} className="hover-row">Add task...</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
          ) : view === 'board' ? (
            <div className="jira-board" style={{ flex: 1 }}>
              {processedGroups.map(g => (
                <div 
                  key={g.id} className="jira-col"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.currentTarget.classList.remove('drag-over'); handleDropStatus(e, g.id); }}
                  onDragEnter={e => e.currentTarget.classList.add('drag-over')}
                  onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
                >
                  <div className="jira-col-header">
                    <div>{g.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="jira-col-count">{g.tasks.length}</span>
                    </div>
                  </div>
                  {g.tasks.map(t => {
                    const colorMap = ['#3b82f6', '#8b5cf6', '#ef4444', '#f97316', '#22c55e', '#ec4899', '#14b8a6', '#6366f1'];
                    const cardColor = colorMap[Math.abs(String(t._id).split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colorMap.length];

                    return (
                    <div 
                      key={t._id} className="jira-card"
                      draggable={group === 'status'}
                      onDragStart={(e) => { setDraggedTaskId(t._id); e.dataTransfer.effectAllowed = "move"; }}
                      onDragEnd={() => setDraggedTaskId(null)}
                      onClick={() => setSelectedTask(t)}
                      style={{ borderLeftColor: cardColor }}
                    >
                        <div className="jira-card-title">{t.title}</div>

                        <div className="jira-card-meta">
                          <div>
                            {t.deadline ? (
                              <span className="jira-chip"><i className="fa-regular fa-calendar" /> {fmtDate(t.deadline)}</span>
                            ) : (
                              <span className="jira-chip"><i className="fa-regular fa-calendar" /> No date</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ textTransform: 'uppercase', fontSize: '.64rem', color: '#9ca3af' }}>{t.priority || 'Medium'}</span>
                            {t.assignedTo ? <Avatar user={t.assignedTo} size="sm" style={{ width: 22, height: 22 }} /> : <i className="fa-regular fa-user" style={{ color: '#6b7280' }} />}
                          </div>
                        </div>
                    </div>
                  )})}
                  {newTaskInput.section === g.id ? (
                      <div className="jira-inline-editor">
                        <input
                          autoFocus
                          type="text"
                          value={newTaskInput.title}
                          onChange={e => setNewTaskInput(prev => ({ ...prev, section: g.id, title: e.target.value }))}
                          onKeyDown={e => handleInlineTaskInputKeyDown(e, g.id)}
                          placeholder="Task name"
                          className="form-input"
                          style={{ padding: '8px', fontSize: '.8rem' }}
                        />
                        <textarea
                          name="requirements"
                          value={newTaskInput.requirements}
                          onChange={e => setNewTaskInput(prev => ({ ...prev, requirements: e.target.value }))}
                          onKeyDown={e => handleInlineTaskInputKeyDown(e, g.id)}
                          placeholder="Task requirements (optional)"
                          rows={2}
                          className="form-input"
                          style={{ padding: '8px', fontSize: '.78rem', resize: 'vertical' }}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <select
                            className="form-input"
                            value={newTaskInput.priority}
                            onChange={e => setNewTaskInput(prev => ({ ...prev, priority: e.target.value }))}
                            style={{ padding: '6px 8px', fontSize: '.75rem' }}
                          >
                            <option value="Low">Low Priority</option>
                            <option value="Medium">Medium Priority</option>
                            <option value="High">High Priority</option>
                          </select>
                          <input
                            type="date"
                            className="form-input"
                            value={newTaskInput.deadline}
                            onChange={e => setNewTaskInput(prev => ({ ...prev, deadline: e.target.value }))}
                            style={{ padding: '6px 8px', fontSize: '.75rem' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" className="btn btn--green btn--sm" onClick={() => handleAddTask(g.id)}>Create</button>
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => setNewTaskInput({
                              section: null,
                              title: '',
                              requirements: '',
                              priority: 'Medium',
                              deadline: '',
                              assignee: 'me'
                            })}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                  ) : (
                    <div className="jira-inline-add" onClick={() => openInlineComposer(g.id)}>+ Add task...</div>
                  )}
                </div>
              ))}
              
              {/* Add Custom Status Column */}
              {group === 'status' && (
                <div style={{
                  background: 'var(--bg)',
                  border: '2px dashed var(--border)',
                  borderRadius: 12,
                  minWidth: 300,
                  maxWidth: 300,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  height: 'calc(100vh - 210px)',
                  overflow: 'y-auto',
                  alignItems: 'center',
                  justifyContent: 'flex-start'
                }}>
                  <div style={{ paddingTop: 20, textAlign: 'center', width: '100%' }}>
                    {addingCustomStatus ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input
                          autoFocus
                          type="text"
                          className="form-input"
                          placeholder="Status name..."
                          value={newStatusName}
                          onChange={e => setNewStatusName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') addCustomStatus();
                            if (e.key === 'Escape') {
                              setAddingCustomStatus(false);
                              setNewStatusName('');
                            }
                          }}
                          style={{ padding: '8px', fontSize: '.85rem' }}
                        />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          <button
                            className="btn btn--sm btn--primary"
                            onClick={addCustomStatus}
                          >
                            Add
                          </button>
                          <button
                            className="btn btn--sm btn--ghost"
                            onClick={() => {
                              setAddingCustomStatus(false);
                              setNewStatusName('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="btn btn--sm btn--outline"
                        onClick={() => setAddingCustomStatus(true)}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        <i className="fa-solid fa-plus" /> Add Status
                      </button>
                    )}
                  </div>
                  
                  {/* List Custom Statuses */}
                  {customStatuses.length > 0 && (
                    <div style={{ width: '100%', paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 8 }}>
                      <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Custom Statuses</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {customStatuses.map(status => (
                          <div key={status} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px',
                            background: 'var(--white)',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            fontSize: '.8rem'
                          }}>
                            <span>{status}</span>
                            <button
                              onClick={() => removeCustomStatus(status)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '.75rem'
                              }}
                              title="Delete status"
                            >
                              <i className="fa-solid fa-trash-can" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
          ) : ( // CALENDAR VIEW
            <div style={{ background: 'var(--white)', borderRadius: 'var(--card-radius)', boxShadow: 'var(--shadow)', padding: 16, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn--sm btn--outline" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}><i className="fa-solid fa-chevron-left"/></button>
                  <button className="btn btn--sm btn--outline" onClick={() => setCurrentDate(new Date())}>Today</button>
                  <button className="btn btn--sm btn--outline" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}><i className="fa-solid fa-chevron-right"/></button>
                </div>
              </div>

              <div className="calendar-grid" style={{ flex: 1 }}>
                {DAYS.map(day => (<div key={day} className="cal-header-cell">{day}</div>))}
                
                {calendarCells.map((c, i) => (
                  <div key={i} className={`cal-cell ${!c.current ? 'dim' : ''}`}>
                    <div className="cal-cell-day" style={{ color: c.current ? 'var(--text)' : 'var(--text-muted)', fontWeight: c.dateStr === new Date().toDateString() ? 800 : 600 }}>{c.day}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
                      {c.tasks.map(t => {
                        const cCol = getProjectColor(t.projectRef?._id);
                        return (
                        <div key={t._id} className="cal-task" onClick={() => setSelectedTask(t)}
                          style={{ background: `var(--${cCol}-bg)`, color: `var(--${cCol}-dark, var(--text))`, borderLeftColor: `var(--${cCol})` }} title={t.title}>
                          <div className={`priority-dot priority-dot--${(t.priority || 'low').toLowerCase()}`} style={{ display: 'inline-block', marginRight: 4 }} />
                          {t.title}
                        </div>
                      )})}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {/* Task Side Panel */}
      {selectedTask && (
        <TaskSidePanel
          task={selectedTask}
          onClose={() => { setSelectedTask(null); loadTasks(); }}
          isOwner={false}
          isMember={true}
          userId={user?._id}
          projectId={selectedTask.projectRef?._id || selectedTask.project}
          onTaskUpdate={(updated) => {
            setTasks(ts => ts.map(t => t._id === updated._id ? { ...t, ...updated } : t));
            setSelectedTask(prev => prev?._id === updated._id ? { ...prev, ...updated } : prev);
          }}
        />
      )}

      {/* ═══════════════ CREATE TASK MODAL ═══════════════ */}
      <Modal open={taskModal} onClose={() => setTaskModal(false)} title="Add Task">
        <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Project *</label>
            <select name="projectId" className="form-input" required defaultValue={selectedProject?._id || ''}>
              {(projects || []).map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Task Title *</label>
            <input name="title" className="form-input" required placeholder="What needs to be done?" />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea name="description" className="form-input" rows={2} placeholder="Add task details and requirements..." style={{ resize: 'vertical' }} />
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

          <button className="btn btn--primary" style={{ width: '100%', marginTop: 8 }}>Create Task</button>
        </form>
      </Modal>
    </>
  );
}
