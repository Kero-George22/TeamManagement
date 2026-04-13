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

  const [collapsed, setCollapsed] = useState({});
  const [newTaskInput, setNewTaskInput] = useState({ section: null, title: '' });
  const [taskModal, setTaskModal] = useState(false);

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

  async function loadTasks() {
    if (!projects || projects.length === 0) { setTasks([]); return; }
    try {
      if (selectedProject) {
        const list = await API.tasks.list(selectedProject._id);
        setTasks(list.map(t => ({ ...t, projectRef: selectedProject })) || []);
      } else {
        const allTasks = [];
        await Promise.all(projects.map(async p => {
          try {
            const list = await API.tasks.list(p._id);
            if (list && list.length) list.forEach(t => allTasks.push({ ...t, projectRef: p }));
          } catch (e) {}
        }));
        setTasks(allTasks);
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

  async function handleAddTask(e, sectionKey) {
    if (e.key === 'Enter' && newTaskInput.title.trim()) {
      e.preventDefault();
      const p = selectedProject || projects[0];
      if (!p) { toast.error('Join a project first'); return; }

      let payload = { title: newTaskInput.title, description: 'Added from My Tasks', assignedRole: 'Developer', assignedTo: user._id };
      
      if (group === 'date') {
        if (sectionKey === 'today') payload.deadline = new Date().toISOString();
        else if (sectionKey === 'nextWeek') { const d = new Date(); d.setDate(d.getDate()+3); payload.deadline = d.toISOString(); }
        else if (sectionKey === 'later') { const d = new Date(); d.setDate(d.getDate()+14); payload.deadline = d.toISOString(); }
      } else if (group === 'status') {
        payload.status = sectionKey;
      }
      
      try {
        await API.tasks.create(p._id, payload);
        toast.success('Task added'); setNewTaskInput({ section: null, title: '' }); loadTasks();
      } catch { toast.error('Could not create task'); }
    } else if (e.key === 'Escape') setNewTaskInput({ section: null, title: '' });
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const projectId = fd.get('projectId');
    try {
      await API.tasks.create(projectId, {
        title: fd.get('title'), description: fd.get('description'),
        assignedRole: fd.get('role') || 'Member', priority: fd.get('priority'),
        xpPoints: Number(fd.get('xp')) || 50, deadline: fd.get('deadline') || undefined,
        assignedTo: user._id
      });
      toast.success('Task created!'); setTaskModal(false); loadTasks();
    } catch (err) { toast.error(err.message); }
  }

  // --- DATA PIPELINE ---

  const processedList = useMemo(() => {
    let list = [...(tasks || [])];

    // Filter
    if (search) list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
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
  }, [tasks, search, filter, sort, user, view]);

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
      const statuses = ['Todo', 'In-Progress', 'Review', 'Done', 'Approved'];
      const map = {}; statuses.forEach(s => map[s] = []);
      list.forEach(t => { if(map[t.status]) map[t.status].push(t); else map['Todo'].push(t); });
      statuses.forEach(s => result.push({ id: s, label: s, tasks: map[s] }));
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
  }, [processedList, group]);

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
        .hover-row:hover { background: #f9fafb; border-radius: 6px; }
        .toolbar { display: flex; gap: 12px; alignItems: center; padding: 12px 30px; background: var(--white); border-bottom: 1px solid var(--border); box-shadow: 0 2px 4px rgba(0,0,0,.02); flex-wrap: wrap; }
        .tool-btn { display: flex; align-items: center; gap: 8px; background: transparent; border: 1px solid var(--border); border-radius: 6px; padding: 6px 12px; font-size: .8rem; font-weight: 500; cursor: pointer; color: var(--text-secondary); transition: .2s; }
        .tool-btn:hover, .tool-btn.active { background: #f9fafb; color: var(--text); border-color: #d1d5db; }
        .board-col { background: #f9fafb; border-radius: 12px; min-width: 310px; max-width: 310px; padding: 14px; display: flex; flex-direction: column; gap: 10px; height: calc(100vh - 200px); overflow-y: auto; }
        .board-card { background: var(--white); border-radius: 8px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.08); cursor: grab; border: 1px solid var(--border); border-left: 5px solid var(--border); }
        .board-card:active { cursor: grabbing; opacity: 0.8; }
        .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: var(--border); border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }
        .cal-header-cell { background: #f9fafb; padding: 10px; text-align: center; font-size: .75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
        .cal-cell { background: var(--white); min-height: 120px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
        .cal-cell.dim { background: #fafafa; }
        .cal-cell-day { font-size: .8rem; font-weight: 600; color: var(--text-muted); text-align: right; }
        .cal-task { font-size: .7rem; padding: 4px 6px; border-radius: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,.05); border-left: 3px solid transparent; }
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
                          <div style={{ padding: '8px 10px 8px 18px', borderBottom: '1px solid var(--border)' }}>
                            <input autoFocus type="text" value={newTaskInput.title} onChange={e => setNewTaskInput({ section: g.id, title: e.target.value })} onKeyDown={e => handleAddTask(e, g.id)} onBlur={() => setNewTaskInput({ section: null, title: '' })} placeholder="Task name" style={{ border: 'none', background: 'transparent', outline: 'none', width:'100%', fontSize:'.875rem' }} />
                          </div>
                        ) : (
                          <div onClick={() => setNewTaskInput({ section: g.id, title: '' })} style={{ padding: '10px 10px 10px 18px', color: 'var(--text-secondary)', fontSize: '.85rem', cursor: 'pointer' }} className="hover-row">Add task...</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
          ) : view === 'board' ? (
            <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 20, flex: 1 }}>
              {processedGroups.map(g => (
                <div 
                  key={g.id} className="board-col"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.currentTarget.classList.remove('drag-over'); handleDropStatus(e, g.id); }}
                  onDragEnter={e => e.currentTarget.classList.add('drag-over')}
                  onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
                >
                  <div className="board-col__header">
                    <div><span className="board-col__caret">▸</span> {g.label} ({g.tasks.length})</div>
                    <div style={{ display: 'flex', gap: 8, color: 'var(--text-muted)' }}>
                      <i className="fa-solid fa-plus" style={{ cursor: 'pointer' }} />
                      <i className="fa-solid fa-ellipsis-vertical" style={{ cursor: 'pointer' }} />
                    </div>
                  </div>
                  {g.tasks.map(t => {
                    const KANBAN_COLORS = ['blue', 'purple', 'red', 'orange', 'green', 'pink'];
                    let cCol = getProjectColor(t.projectRef?._id);
                    if (!KANBAN_COLORS.includes(cCol)) cCol = KANBAN_COLORS[Math.abs(t._id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % KANBAN_COLORS.length];
                    const progressVal = t.xpPoints > 100 ? 100 : (t.xpPoints < 10 ? 10 : t.xpPoints);

                    return (
                    <div 
                      key={t._id} className={`kanban-card kanban-card--${cCol}`}
                      draggable={group === 'status'}
                      onDragStart={(e) => { setDraggedTaskId(t._id); e.dataTransfer.effectAllowed = "move"; }}
                      onDragEnd={() => setDraggedTaskId(null)}
                      onClick={() => setSelectedTask(t)}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <span className="task-tag">#{t.priority.toLowerCase()}</span>
                            <span className="task-tag">#{t.projectRef?.title?.toLowerCase().replace(/\s+/g, '') || 'task'}</span>
                          </div>
                          <i className="fa-solid fa-ellipsis-vertical" style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }} />
                        </div>
                        
                        <div style={{ fontWeight: 800, fontSize: '.95rem', color: `var(--${cCol})`, filter: 'brightness(0.4)', lineHeight: 1.3 }}>{t.title}</div>
                        
                        {t.description && <div style={{ fontSize: '.75rem', color: `var(--${cCol})`, filter: 'brightness(0.6)', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>Note: {t.description}</div>}
                        


                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                          <div style={{ display: 'flex', marginLeft: 8 }}>
                            {t.assignedTo ? <Avatar user={t.assignedTo} size="sm" style={{ border: '2px solid rgba(255,255,255,0.8)', marginLeft: -8, width: 26, height: 26 }} /> : <div className="avatar-placeholder" style={{ width: 26, height: 26, fontSize: '.6rem', marginLeft: -8, border: '2px solid rgba(255,255,255,0.8)', background: `var(--${cCol})`, color: '#fff', filter: 'brightness(0.8)' }}>UI</div>}
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <div className="task-meta-pill"><i className="fa-regular fa-comment-dots" /> {t.comments?.length || 0}</div>
                            <div className="task-meta-pill"><i className="fa-solid fa-paperclip" /> {Math.floor(Math.abs(t._id.charCodeAt(5)) % 5)}</div>
                          </div>
                        </div>
                    </div>
                  )})}
                  {newTaskInput.section === g.id ? (
                      <input autoFocus type="text" value={newTaskInput.title} onChange={e => setNewTaskInput({ section: g.id, title: e.target.value })} onKeyDown={e => handleAddTask(e, g.id)} onBlur={() => setNewTaskInput({ section: null, title: '' })} placeholder="Task name" style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '8px', fontSize: '.8rem' }} />
                  ) : (
                    <div onClick={() => setNewTaskInput({ section: g.id, title: '' })} style={{ fontSize: '.8rem', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>+ Add task...</div>
                  )}
                </div>
              ))}
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
        <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group"><label className="form-label">Project *</label>
            <select name="projectId" className="form-input" required defaultValue={selectedProject?._id || ''}>
              {(projects || []).map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Title *</label><input name="title" className="form-input" required placeholder="Task title" /></div>
          <div className="form-group"><label className="form-label">Description</label><textarea name="description" className="form-input" rows={2} placeholder="Optional notes" /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Role</label>
              <input name="role" className="form-input" placeholder="e.g. Developer" />
            </div>
            <div className="form-group"><label className="form-label">Priority</label>
              <select name="priority" className="form-input"><option>Low</option><option defaultValue>Medium</option><option>High</option></select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">XP Points</label><input name="xp" className="form-input" type="number" defaultValue={50} min={1} /></div>
            <div className="form-group"><label className="form-label">Deadline</label><input name="deadline" className="form-input" type="date" /></div>
          </div>
          <button className="btn btn--green" style={{ width: '100%', marginTop: 8 }}>Create Task</button>
        </form>
      </Modal>
    </>
  );
}
