import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../lib/toast';
import API from '../lib/api';
import Topbar from '../components/layout/Topbar';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import TaskSidePanel from '../components/ui/TaskSidePanel';
import { ProgressBar } from '../components/ui/Primitives';
import { fmtDate, daysLeft, projectProgress } from '../lib/utils';

const WORKFLOW_STATUSES = ['Todo', 'In-Progress', 'Review', 'Done', 'Approved'];
const STATUS_VARIANTS = { Todo: 'gray', 'In-Progress': 'blue', Review: 'yellow', Done: 'green', Approved: 'purple' };
const PROJECT_STATUS_VARIANTS = { Recruiting: 'green', 'In-Progress': 'blue', Completed: 'gray' };
const PRIORITY_DOT = { High: 'priority-dot--high', Medium: 'priority-dot--medium', Low: 'priority-dot--low' };
const BOARD_COLORS = ['blue', 'purple', 'red', 'orange', 'green', 'pink'];

function getProjectColor(projectId) {
  if (!projectId) return BOARD_COLORS[0];
  const sum = String(projectId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return BOARD_COLORS[sum % BOARD_COLORS.length];
}

export default function ProjectPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [members, setMembers] = useState(null);
  const [requests, setRequests] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  const [tab, setTab] = useState('overview');
  const [taskView, setTaskView] = useState('board');
  const [taskModal, setTaskModal] = useState(false);
  const [joinModal, setJoinModal] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [joinRole, setJoinRole] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  const [inlineAdding, setInlineAdding] = useState(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const isOwner = !!project && (project.owner?._id === user?._id || project.owner === user?._id);
  const isMember = isOwner || (project?.members || []).some(member => (member.userId?._id || member.userId) === user?._id);

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (isOwner) {
      loadRequests();
    } else {
      setRequests([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);

  async function init() {
    try {
      const response = await API.projects.get(id);
      setProject(response);
      await Promise.all([loadTasks(), loadMembers()]);
    } catch {
      toast.error('Could not load project');
    }
  }

  async function loadTasks() {
    try {
      setTasks(await API.tasks.list(id) || []);
    } catch {
      toast.error('Failed to load tasks');
      setTasks([]);
    }
  }

  async function loadMembers() {
    try {
      setMembers(await API.projects.members(id) || []);
    } catch {
      setMembers([]);
    }
  }

  async function loadRequests() {
    try {
      setRequests((await API.projects.joinRequests(id) || []).filter(request => request.status === 'pending'));
    } catch {
      setRequests([]);
    }
  }

  const filteredTasks = useMemo(() => {
    const list = tasks || [];
    if (!myTasksOnly) return list;
    return list.filter(task => (task.assignedTo?._id || task.assignedTo) === user?._id);
  }, [tasks, myTasksOnly, user]);

  const groupedTasks = useMemo(() => {
    const groups = {};
    WORKFLOW_STATUSES.forEach(status => {
      groups[status] = [];
    });

    filteredTasks.forEach(task => {
      if (groups[task.status]) groups[task.status].push(task);
      else groups.Todo.push(task);
    });

    return groups;
  }, [filteredTasks]);

  const overviewStats = useMemo(() => {
    const total = tasks || [];
    const completed = total.filter(task => task.status === 'Done' || task.status === 'Approved').length;
    const open = total.length - completed;
    const memberCount = members?.length || project?.members?.length || 0;
    const roleCount = project?.rolesRequired?.length || 0;

    return {
      totalTasks: total.length,
      completed,
      open,
      memberCount,
      roleCount,
      progress: project ? projectProgress(project.startDate, project.duration) : 0,
    };
  }, [tasks, members, project]);

  async function handleGenerate() {
    setGenLoading(true);
    try {
      await API.tasks.generate(id);
      toast.success('Tasks generated!');
      loadTasks();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setGenLoading(false);
    }
  }

  async function handleCreateTask(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    try {
      await API.tasks.create(id, {
        title: formData.get('title'),
        description: formData.get('description'),
        assignedRole: formData.get('role') || 'Member',
        priority: formData.get('priority'),
        deadline: formData.get('deadline') || undefined,
      });
      toast.success('Task created!');
      setTaskModal(false);
      loadTasks();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function handleJoin() {
    if (!joinRole) {
      toast.error('Please select a role');
      return;
    }

    setJoinLoading(true);
    try {
      await API.projects.requestJoin(id, joinRole);
      toast.success('Request sent! Waiting for owner approval.');
      setJoinModal(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setJoinLoading(false);
    }
  }

  async function handleReq(requestId, status) {
    try {
      await API.projects.handleRequest(id, requestId, status);
      toast.success(`Request ${status}`);
      loadRequests();
      loadMembers();
      init();
    } catch (error) {
      toast.error(error.message);
    }
  }

  function handleTaskUpdate(updatedTask) {
    setTasks(current => (current || []).map(task => (task._id === updatedTask._id ? { ...task, ...updatedTask } : task)));
    setSelectedTask(current => (current?._id === updatedTask._id ? { ...current, ...updatedTask } : current));
  }

  async function handleDrop(event, status) {
    event.preventDefault();
    if (!draggedTask || draggedTask.status === status) return;

    const previousStatus = draggedTask.status;
    handleTaskUpdate({ _id: draggedTask._id, status });

    try {
      await API.tasks.status(draggedTask._id, status);
    } catch {
      toast.error('Failed to update status');
      handleTaskUpdate({ _id: draggedTask._id, status: previousStatus });
    }

    setDraggedTask(null);
  }

  async function handleInlineCreate(event, status) {
    if (event.key === 'Escape') {
      setInlineAdding(null);
      setInlineTitle('');
      return;
    }

    if (event.key !== 'Enter') return;

    event.preventDefault();
    if (!inlineTitle.trim()) return;

    const defaultRole = project?.rolesRequired?.[0]?.roleName || 'Member';

    try {
      await API.tasks.create(id, {
        title: inlineTitle.trim(),
        description: '',
        assignedRole: defaultRole,
        priority: 'Medium',
        status,
      });
      setInlineAdding(null);
      setInlineTitle('');
      loadTasks();
    } catch (error) {
      toast.error(error.message);
    }
  }

  function handleUpdateTitle(taskId) {
    if (!editTitle.trim()) {
      setEditingTask(null);
      return;
    }

    const original = (tasks || []).find(task => task._id === taskId);
    if (!original || original.title === editTitle.trim()) {
      setEditingTask(null);
      return;
    }

    const nextTitle = editTitle.trim();
    handleTaskUpdate({ _id: taskId, title: nextTitle });

    API.tasks.update(taskId, { title: nextTitle })
      .then(() => toast.success('Task renamed'))
      .catch(() => {
        toast.error('Failed to rename task');
        loadTasks();
      })
      .finally(() => setEditingTask(null));
  }

  if (!project) {
    return (
      <>
        <Topbar title="Project" />
        <div className="skeleton" style={{ height: 160, borderRadius: 'var(--card-radius)' }} />
      </>
    );
  }

  return (
    <>
      <Topbar title={project.title} />

      <section className="dashboard-hero" style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 10 }}>
            <Badge variant={PROJECT_STATUS_VARIANTS[project.status] || 'gray'}>{project.status}</Badge>
            {project.isPrivate && <span className="chip"><i className="fa-solid fa-lock" /> Private</span>}
          </div>
          <h2 className="dashboard-hero__title" style={{ maxWidth: '14ch' }}>{project.title}</h2>
          <p className="dashboard-hero__sub" style={{ maxWidth: '60ch' }}>{project.description || 'No project description yet.'}</p>
          <div className="dashboard-hero__meta">
            <span className="chip"><i className="fa-regular fa-calendar" /> {fmtDate(project.startDate)}</span>
            <span className="chip"><i className="fa-solid fa-flag-checkered" /> {project.duration} days</span>
            <span className="chip"><i className="fa-solid fa-users" /> {overviewStats.memberCount} members</span>
            <span className="chip"><i className="fa-solid fa-list-check" /> {overviewStats.totalTasks} tasks</span>
          </div>
        </div>

        <div className="dashboard-progress-ring" style={{ background: `conic-gradient(var(--green) ${overviewStats.progress * 3.6}deg, rgba(255,255,255,.12) 0deg)` }}>
          <span className="dashboard-progress-ring__value">{overviewStats.progress}%</span>
        </div>
      </section>

      <div className="workspace-tabs" style={{ marginTop: 20 }}>
        <button className={`workspace-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
        <button className={`workspace-tab ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>Tasks</button>
        <button className={`workspace-tab ${tab === 'team' ? 'active' : ''}`} onClick={() => setTab('team')}>Team</button>
        <div style={{ flex: 1 }} />
        <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/app/office/${id}`)}>
          <i className="fa-solid fa-comments" /> Office
        </button>
      </div>

      {tab === 'overview' && (
        <div className="workspace-grid">
          <section className="workspace-panel">
            <div className="workspace-header">
              <div>
                <h3 className="section-title" style={{ marginBottom: 4 }}>Project Snapshot</h3>
                <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>A quick read on progress and execution.</div>
              </div>
              <button className="btn btn--green btn--sm" onClick={() => setTab('tasks')}>Go to tasks</button>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <div className="stat-card" style={{ boxShadow: 'none', border: '1px solid var(--border)' }}>
                <div className="stat-card__label">Progress</div>
                <div className="stat-card__value">{overviewStats.progress}%</div>
                <div className="stat-card__sub">{daysLeft(project.startDate, project.duration)} remaining</div>
              </div>
              <div className="stat-card" style={{ boxShadow: 'none', border: '1px solid var(--border)' }}>
                <div className="stat-card__label">Members</div>
                <div className="stat-card__value">{overviewStats.memberCount}</div>
                <div className="stat-card__sub">{overviewStats.roleCount} open roles</div>
              </div>
              <div className="stat-card" style={{ boxShadow: 'none', border: '1px solid var(--border)' }}>
                <div className="stat-card__label">Open Work</div>
                <div className="stat-card__value">{overviewStats.open}</div>
                <div className="stat-card__sub">Tasks still moving</div>
              </div>
              <div className="stat-card" style={{ boxShadow: 'none', border: '1px solid var(--border)' }}>
                <div className="stat-card__label">Closed</div>
                <div className="stat-card__value">{overviewStats.completed}</div>
                <div className="stat-card__sub">Done or approved</div>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div className="section-title" style={{ marginBottom: 12 }}>Roles Needed</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {(project.rolesRequired || []).length === 0 ? (
                  <div className="empty-state" style={{ padding: '18px 0', alignItems: 'flex-start' }}>
                    <h4>No roles defined</h4>
                    <p>Add roles to make the team structure clear.</p>
                  </div>
                ) : (
                  (project.rolesRequired || []).map((role, index) => {
                    const openSlots = role.totalSlots - (role.filledSlots || 0);
                    return (
                      <span key={index} className="chip" style={{ padding: '8px 12px' }}>
                        <i className="fa-solid fa-user-group" />
                        {role.roleName}
                        <strong style={{ marginLeft: 4, color: openSlots > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                          ({role.filledSlots || 0}/{role.totalSlots})
                        </strong>
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          <aside className="dashboard-stack">
            <section className="workspace-panel">
              <div className="workspace-header">
                <div>
                  <h3 className="section-title" style={{ marginBottom: 4 }}>Team Preview</h3>
                  <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Members currently inside the workspace.</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {(members || []).slice(0, 6).map((member, index) => (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Avatar user={member.user || member} size="md" />
                    <div style={{ fontSize: '.76rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: 88 }}>
                      {member.user?.username || member.user?.email?.split('@')[0] || 'User'}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="workspace-panel">
              <div className="workspace-header">
                <div>
                  <h3 className="section-title" style={{ marginBottom: 4 }}>Quick Actions</h3>
                  <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Jump straight to the next step.</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="btn btn--green" onClick={() => setTab('tasks')}>Open tasks</button>
                {isOwner && <button className="btn btn--outline" onClick={() => setTaskModal(true)}>Create task</button>}
                {!isMember && project.status === 'Recruiting' && <button className="btn btn--outline" onClick={() => setJoinModal(true)}>Request to join</button>}
                <button className="btn btn--ghost" onClick={() => navigate(`/app/office/${id}`)}>Open office</button>
              </div>
            </section>
          </aside>
        </div>
      )}

      {tab === 'tasks' && (
        <section className="workspace-panel">
          <div className="workspace-header" style={{ flexWrap: 'wrap' }}>
            <div>
              <h3 className="section-title" style={{ marginBottom: 4 }}>Tasks</h3>
              <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Board or list view with a quick personal filter.</div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className={`btn btn--sm ${myTasksOnly ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setMyTasksOnly(!myTasksOnly)}>
                <i className="fa-solid fa-user" /> {myTasksOnly ? 'My tasks' : 'All tasks'}
              </button>
              <button className={`btn btn--sm ${taskView === 'list' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setTaskView('list')}>
                <i className="fa-solid fa-list" /> List
              </button>
              <button className={`btn btn--sm ${taskView === 'board' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setTaskView('board')}>
                <i className="fa-brands fa-trello" /> Board
              </button>
              {isOwner && (
                <>
                  <button className="btn btn--ghost btn--sm" onClick={handleGenerate} disabled={genLoading}>
                    {genLoading ? <span className="spinner" style={{ borderTopColor: 'var(--text-primary)' }} /> : <><i className="fa-solid fa-wand-magic-sparkles" /> AI Generate</>}
                  </button>
                  <button className="btn btn--green btn--sm" onClick={() => setTaskModal(true)}><i className="fa-solid fa-plus" /> Add Task</button>
                </>
              )}
            </div>
          </div>

          {tasks === null ? (
            <div className="skeleton" style={{ height: 220, borderRadius: 'var(--card-radius)' }} />
          ) : filteredTasks.length === 0 ? (
            <div className="empty-state">
              <i className="fa-solid fa-clipboard-list" />
              <h4>No tasks yet</h4>
              <p>Tasks appear here once the workspace starts moving.</p>
            </div>
          ) : taskView === 'list' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {WORKFLOW_STATUSES.map(status => (
                <div key={status} style={{ border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
                  <div className="task-list-section-header" style={{ margin: 0, borderRadius: 0 }}>
                    <h4>{status}</h4>
                    <Badge variant={STATUS_VARIANTS[status] || 'gray'} style={{ fontSize: '.68rem' }}>{groupedTasks[status].length}</Badge>
                  </div>
                  <div style={{ padding: '0 8px 8px' }}>
                    {groupedTasks[status].map(task => (
                      <div
                        key={task._id}
                        className="task-list-row"
                        style={{ gridTemplateColumns: '28px 3fr 1fr 100px 90px 90px' }}
                        onClick={() => setSelectedTask(task)}
                      >
                        <div className={`task-circle ${task.status === 'Done' || task.status === 'Approved' ? 'task-circle--done' : ''}`} style={{ width: 20, height: 20 }}>
                          {(task.status === 'Done' || task.status === 'Approved') && <i className="fa-solid fa-check" style={{ fontSize: '.5rem' }} />}
                        </div>
                        <div style={{ fontWeight: 500, fontSize: '.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.title}
                        </div>
                        <div>
                          {task.assignedTo ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Avatar user={task.assignedTo} size="sm" />
                              <span style={{ fontSize: '.78rem' }}>{task.assignedTo?.username || task.assignedTo?.email?.split('@')[0]}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '.78rem' }}>—</span>
                          )}
                        </div>
                        <div style={{ fontSize: '.78rem', color: task.deadline && new Date(task.deadline) < new Date() ? '#ef4444' : 'var(--text-muted)' }}>
                          {task.deadline ? fmtDate(task.deadline) : '—'}
                        </div>
                        <div><div className={`priority-dot ${PRIORITY_DOT[task.priority]}`} title={task.priority} /></div>
                        <div onClick={event => event.stopPropagation()}>
                          <select
                            className="form-input"
                            style={{ padding: '2px 6px', fontSize: '.7rem', height: 24, borderRadius: 12, background: 'var(--white)', fontWeight: 600 }}
                            value={task.status}
                            onChange={event => {
                              const nextStatus = event.target.value;
                              handleTaskUpdate({ _id: task._id, status: nextStatus });
                              API.tasks.status(task._id, nextStatus).catch(() => handleTaskUpdate({ _id: task._id, status: task.status }));
                            }}
                          >
                            {WORKFLOW_STATUSES.map(value => <option key={value} value={value}>{value}</option>)}
                          </select>
                        </div>
                      </div>
                    ))}

                    {isOwner && (
                      inlineAdding === status ? (
                        <div className="task-list-row" style={{ gridTemplateColumns: '28px 1fr' }}>
                          <div className="task-circle" style={{ width: 20, height: 20 }} />
                          <input
                            autoFocus
                            className="form-input"
                            style={{ padding: '4px 8px', fontSize: '.875rem' }}
                            placeholder="Write a task name and press Enter"
                            value={inlineTitle}
                            onChange={event => setInlineTitle(event.target.value)}
                            onKeyDown={event => handleInlineCreate(event, status)}
                            onBlur={() => {
                              setInlineAdding(null);
                              setInlineTitle('');
                            }}
                          />
                        </div>
                      ) : (
                        <div onClick={() => setInlineAdding(status)} style={{ padding: '10px 10px 10px 18px', color: 'var(--text-secondary)', fontSize: '.85rem', cursor: 'pointer' }} className="task-list-row">
                          <div style={{ fontSize: '.875rem', fontWeight: 500 }}>
                            <i className="fa-solid fa-plus" style={{ marginRight: 8 }} /> Add task...
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {WORKFLOW_STATUSES.map(status => (
                <div
                  key={status}
                  className="board-col"
                  onDragOver={event => event.preventDefault()}
                  onDrop={event => handleDrop(event, status)}
                >
                  <div className="board-col__header">
                    <div><span className="board-col__caret">▸</span> {status} ({groupedTasks[status].length})</div>
                    <div style={{ display: 'flex', gap: 8, color: 'var(--text-muted)' }}>
                      <i className="fa-solid fa-plus" style={{ cursor: 'pointer' }} onClick={() => setInlineAdding(status)} />
                      <i className="fa-solid fa-ellipsis-vertical" style={{ cursor: 'pointer' }} />
                    </div>
                  </div>

                  {groupedTasks[status].length ? groupedTasks[status].map(task => {
                    const color = getProjectColor(task.projectRef?._id);
                    return (
                      <div
                        key={task._id}
                        className={`kanban-card kanban-card--${color}`}
                        draggable={groupedTasks[status].length > 0}
                        onDragStart={event => {
                          setDraggedTask(task);
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => setDraggedTask(null)}
                        onClick={() => setSelectedTask(task)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <span className="task-tag">#{(task.priority || 'medium').toLowerCase()}</span>
                            <span className="task-tag">#{(task.assignedRole || 'task').toLowerCase().replace(/\s+/g, '')}</span>
                          </div>
                          <i className="fa-solid fa-ellipsis-vertical" style={{ color: 'rgba(255,255,255,.45)', cursor: 'pointer', padding: 4 }} />
                        </div>

                        <div className="task-card-title">{task.title}</div>

                        {task.description && (
                          <div className="task-card-description">{task.description}</div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                          <div style={{ display: 'flex', marginLeft: 8 }}>
                            {task.assignedTo ? (
                              <Avatar user={task.assignedTo} size="sm" style={{ marginLeft: -8, width: 28, height: 28 }} />
                            ) : (
                              <div className="avatar-placeholder avatar-placeholder--pixel" style={{ width: 28, height: 28, fontSize: '.6rem', marginLeft: -8, color: '#fff' }}>UI</div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <div className="task-meta-pill"><i className="fa-regular fa-comment-dots" /> {task.comments?.length || 0}</div>
                            <div className="task-meta-pill"><i className="fa-solid fa-paperclip" /> {Math.floor(Math.abs(task._id.charCodeAt(5)) % 5)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  }) : <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: '.8rem' }}>Drop here</div>}

                  {isOwner && (
                    inlineAdding === status ? (
                      <input
                        autoFocus
                        type="text"
                        value={inlineTitle}
                        onChange={event => setInlineTitle(event.target.value)}
                        onKeyDown={event => handleInlineCreate(event, status)}
                        onBlur={() => {
                          setInlineAdding(null);
                          setInlineTitle('');
                        }}
                        placeholder="Task name"
                        className="form-input"
                        style={{ marginTop: 8 }}
                      />
                    ) : (
                      <div onClick={() => setInlineAdding(status)} style={{ fontSize: '.8rem', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>+ Add task...</div>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'team' && (
        <div className="workspace-grid">
          <section className="workspace-panel">
            <div className="workspace-header" style={{ flexWrap: 'wrap' }}>
              <div>
                <h3 className="section-title" style={{ marginBottom: 4 }}>Team Members</h3>
                <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>The people currently inside the project.</div>
              </div>
              {!isMember && project.status === 'Recruiting' && (
                <button className="btn btn--green btn--sm" onClick={() => setJoinModal(true)}>
                  <i className="fa-solid fa-user-plus" /> Request to Join
                </button>
              )}
            </div>

            <div className="team-grid">
              {(members || []).map((member, index) => (
                <div key={index} className="team-card">
                  <Avatar user={member.user || member} size="md" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '.92rem' }}>{member.user?.username || member.user?.email?.split('@')[0] || 'User'}</div>
                    <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{member.roleName}</div>
                  </div>
                  <Badge variant="gray">Member</Badge>
                </div>
              ))}
            </div>
          </section>

          <aside className="dashboard-stack">
            <section className="workspace-panel">
              <div className="workspace-header">
                <div>
                  <h3 className="section-title" style={{ marginBottom: 4 }}>Open Roles</h3>
                  <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Available slots and role demand.</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {(project.rolesRequired || []).length === 0 ? (
                  <div className="empty-state" style={{ padding: '18px 0', alignItems: 'flex-start' }}>
                    <h4>No roles defined</h4>
                    <p>Add roles to make the team structure clear.</p>
                  </div>
                ) : (
                  (project.rolesRequired || []).map((role, index) => {
                    const openSlots = role.totalSlots - (role.filledSlots || 0);
                    return (
                      <span key={index} className="chip" style={{ padding: '8px 12px' }}>
                        <i className="fa-solid fa-user-group" />
                        {role.roleName}
                        <strong style={{ marginLeft: 4, color: openSlots > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                          ({role.filledSlots || 0}/{role.totalSlots})
                        </strong>
                      </span>
                    );
                  })
                )}
              </div>
            </section>

            {isOwner && (
              <section className="workspace-panel">
                <div className="workspace-header">
                  <div>
                    <h3 className="section-title" style={{ marginBottom: 4 }}>Join Requests</h3>
                    <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Approve or decline pending applicants.</div>
                  </div>
                  {requests?.length ? <Badge variant="yellow">{requests.length} pending</Badge> : null}
                </div>
                {!requests?.length ? (
                  <div className="empty-state" style={{ padding: '18px 0' }}>
                    <i className="fa-solid fa-inbox" />
                    <h4>No pending requests</h4>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {requests.map(request => (
                      <div key={request._id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--white)', borderRadius: 18, padding: 14, border: '1px solid var(--border)' }}>
                        <Avatar user={request.user} size="md" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{request.user?.username || request.user?.email || 'User'}</div>
                          <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>Requested: <strong>{request.roleName}</strong></div>
                          {request.requestedAt && <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Sent: {fmtDate(request.requestedAt)}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn--danger btn--sm" onClick={() => handleReq(request._id, 'rejected')}>Reject</button>
                          <button className="btn btn--green btn--sm" onClick={() => handleReq(request._id, 'accepted')}>Accept</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </aside>
        </div>
      )}

      <Modal open={taskModal} onClose={() => setTaskModal(false)} title="Add Task">
        <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input name="title" className="form-input" required placeholder="Task title" />
          </div>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea name="description" className="form-input" rows={3} required placeholder="What needs to be done?" />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select name="role" className="form-input" required defaultValue={project.rolesRequired?.[0]?.roleName || 'Member'}>
                {project.rolesRequired?.length ? (
                  project.rolesRequired.map((role, index) => <option key={index} value={role.roleName}>{role.roleName}</option>)
                ) : (
                  <option value="Member">Member</option>
                )}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select name="priority" className="form-input" defaultValue="Medium">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Deadline</label>
              <input name="deadline" className="form-input" type="date" />
            </div>
          </div>
          <button className="btn btn--green" style={{ width: '100%' }}>Create Task</button>
        </form>
      </Modal>

      <Modal open={joinModal} onClose={() => setJoinModal(false)} title={`Join ${project.title}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', margin: 0 }}>Select your role:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(project.rolesRequired || []).map((role, index) => {
              const full = (role.filledSlots || 0) >= role.totalSlots;
              const openSlots = role.totalSlots - (role.filledSlots || 0);

              return (
                <label
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: `1.5px solid ${joinRole === role.roleName ? 'var(--green)' : 'var(--border)'}`,
                    cursor: full ? 'not-allowed' : 'pointer',
                    opacity: full ? 0.5 : 1,
                    background: joinRole === role.roleName ? 'var(--green-bg)' : 'transparent',
                    transition: 'all .15s',
                  }}
                >
                  <input
                    type="radio"
                    name="joinRole"
                    value={role.roleName}
                    disabled={full}
                    checked={joinRole === role.roleName}
                    onChange={() => setJoinRole(role.roleName)}
                    style={{ accentColor: 'var(--green)' }}
                  />
                  <span style={{ fontWeight: 600, fontSize: '.9rem', flex: 1 }}>{role.roleName}</span>
                  <span style={{ fontSize: '.78rem', color: full ? 'var(--text-muted)' : 'var(--green)', fontWeight: 600 }}>
                    {full ? 'Full' : `${openSlots} slot${openSlots > 1 ? 's' : ''} open`}
                  </span>
                </label>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn--outline" onClick={() => setJoinModal(false)} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn--green" onClick={handleJoin} disabled={!joinRole || joinLoading} style={{ flex: 1 }}>
              {joinLoading ? <span className="spinner" /> : 'Send Request'}
            </button>
          </div>
        </div>
      </Modal>

      {selectedTask && (
        <TaskSidePanel
          task={selectedTask}
          onClose={() => {
            setSelectedTask(null);
            loadTasks();
          }}
          isOwner={isOwner}
          isMember={isMember}
          userId={user?._id}
          projectId={id}
          onTaskUpdate={handleTaskUpdate}
        />
      )}
    </>
  );
}
