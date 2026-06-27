import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Select from 'react-select';
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
import SectionPage from './SectionPage';
import ProjectAnalyticsTab from '../components/ProjectAnalyticsTab';
import AICopilotChat from '../components/ui/AICopilotChat';
import TeamHubTab from '../components/teamFeatures/TeamHubTab';

const DEFAULT_WORKFLOW_STATUSES = ['Todo', 'In-Progress', 'Review', 'Done', 'Approved'];
const STATUS_VARIANTS = { Todo: 'gray', 'In-Progress': 'blue', Review: 'yellow', Done: 'green', Approved: 'purple' };
const PROJECT_STATUS_VARIANTS = { Recruiting: 'green', 'In-Progress': 'blue', Completed: 'gray' };
const PRIORITY_DOT = { High: 'priority-dot--high', Medium: 'priority-dot--medium', Low: 'priority-dot--low' };
const BOARD_COLORS = ['blue', 'purple', 'red', 'orange', 'green', 'pink', 'teal', 'indigo', 'cyan', 'yellow'];

function getProjectColor(projectId) {
  if (!projectId) return BOARD_COLORS[0];
  const sum = String(projectId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return BOARD_COLORS[sum % BOARD_COLORS.length];
}

function getTaskCardColor(taskId, fallback = 'blue') {
  if (!taskId) return fallback;
  const sum = String(taskId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return BOARD_COLORS[sum % BOARD_COLORS.length] || fallback;
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

  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';
  const setTab = (newTab) => {
    setSearchParams(newTab === 'overview' ? {} : { tab: newTab }, { replace: false });
  };
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
  const [newStatusName, setNewStatusName] = useState('');
  const [chatOpen, setChatOpen] = useState(false);

  const isOwner = !!project && (project.owner?._id === (user?.id || user?._id) || project.owner === (user?.id || user?._id));
  const isMember = isOwner || (project?.members || []).some(member => (member.userId?._id || member.userId) === (user?.id || user?._id));
  const workflowStatuses = project?.taskStatuses?.length ? project.taskStatuses : DEFAULT_WORKFLOW_STATUSES;

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
  }, [isOwner, tab]);

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

  async function handleRemoveMember(userId, name) {
    if (!window.confirm(`Remove ${name} from this project?`)) return;
    try {
      await API.projects.removeMember(id, userId);
      toast.success('Member removed');
      loadMembers();
    } catch (err) {
      toast.error(err.message || 'Failed to remove member');
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
    return list.filter(task => Array.isArray(task.assignedTo) && task.assignedTo.some(u => (u._id || u) === (user?.id || user?._id)));
  }, [tasks, myTasksOnly, user]);

  const groupedTasks = useMemo(() => {
    const groups = {};
    workflowStatuses.forEach(status => {
      groups[status] = [];
    });

    filteredTasks.forEach(task => {
      if (groups[task.status]) groups[task.status].push(task);
      else {
        if (!groups.Todo) groups.Todo = [];
        groups.Todo.push(task);
      }
    });
    return groups;
  }, [filteredTasks, workflowStatuses]);

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
        taskType: formData.get('taskType') || 'Task',
        assignedRole: formData.get('role') || 'Member',
        assignedTo: formData.getAll('assignedTo'),
        priority: formData.get('priority'),
        status: formData.get('status') || 'Todo',
        startDate: formData.get('startDate') || undefined,
        deadline: formData.get('deadline') || undefined,
        storyPoints: formData.get('storyPoints') || 0,
        labels: formData.get('labels') || '',
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

  async function handleAddCustomStatus() {
    const trimmed = newStatusName.trim();
    if (!trimmed) return;
    if (workflowStatuses.some(status => status.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('This status already exists');
      return;
    }

    try {
      const nextStatuses = [...workflowStatuses, trimmed];
      const updated = await API.projects.update(id, { taskStatuses: nextStatuses });
      const updatedProject = updated?.project || updated;
      setProject(current => ({ ...(current || {}), ...(updatedProject || {}), taskStatuses: nextStatuses }));
      setNewStatusName('');
      toast.success('Custom status added');
    } catch (error) {
      toast.error(error.message || 'Failed to add status');
    }
  }

  async function handleReq(requestId, action) {
    try {
      await API.projects.handleRequest(id, requestId, action);
      toast.success(`Request ${action}ed`);
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
      await API.tasks.update(draggedTask._id, { status });
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

  if (tab === 'tasks') {
    return (
      <>
        <Topbar title={project.title} onBack={() => navigate(-1)} />
        <SectionPage embedded forcedProjectId={id} forcedProject={project} forcedProjectMembers={members || []} />
      </>
    );
  }

  return (
    <>
      <Topbar title={project.title} />

      <div className="workspace-tabs" style={{ marginTop: 20 }}>
        <button className={`workspace-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
        <button className={`workspace-tab ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>Tasks</button>
        <button className={`workspace-tab ${tab === 'team' ? 'active' : ''}`} onClick={() => setTab('team')}>Team</button>
        {isMember && (
          <button className={`workspace-tab ${tab === 'team-hub' ? 'active' : ''}`} onClick={() => setTab('team-hub')}>Team Hub</button>
        )}
        {(isOwner || user?.isAdmin) && (
          <button className={`workspace-tab ${tab === 'analytics' ? 'active' : ''}`} onClick={() => setTab('analytics')}>Analytics</button>
        )}
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
                  {isOwner && member.user?._id !== (user?.id || user?._id) && (project.owner?._id || project.owner) !== member.user?._id && (
                    <button
                      className="tool-btn"
                      onClick={() => handleRemoveMember(member.user._id, member.user?.username || 'this member')}
                      style={{ color: '#ef4444', fontSize: '.72rem', padding: '4px 8px', marginLeft: 4 }}
                      title="Remove from project"
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  )}
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

            <section className="workspace-panel" style={{ marginTop: 24 }}>
              <div className="workspace-header">
                <div>
                  <h3 className="section-title" style={{ marginBottom: 4 }}>Custom Fields</h3>
                  <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Project-wide custom fields for tasks.</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '12px 20px' }}>
                {(project.customFields || []).length === 0 ? (
                  <div className="empty-state" style={{ padding: '18px 0', alignItems: 'flex-start' }}>
                    <h4>No custom fields defined</h4>
                    <p>Add fields like Budget or Sprint Number to your tasks.</p>
                  </div>
                ) : (
                  (project.customFields || []).map((cf, index) => (
                    <span key={index} className="chip" style={{ padding: '8px 12px' }}>
                      <i className="fa-solid fa-tag" />
                      {cf.name}
                      <span style={{ fontSize: '.7rem', marginLeft: 6, opacity: 0.7 }}>({cf.type})</span>
                    </span>
                  ))
                )}
                {isOwner && (
                  <button 
                    className="btn btn--outline btn--sm" 
                    style={{ width: '100%', marginTop: 12 }}
                    onClick={async () => {
                      const fieldName = window.prompt('Enter new custom field name (e.g. Sprint Number):');
                      if (!fieldName || !fieldName.trim()) return;
                      try {
                        const updatedFields = [...(project.customFields || []), { name: fieldName.trim(), type: 'text' }];
                        const updated = await API.projects.update(id, { customFields: updatedFields });
                        setProject(updated);
                        toast.success('Custom field added');
                      } catch (err) {
                        toast.error(err.message || 'Failed to add custom field');
                      }
                    }}
                  >
                    <i className="fa-solid fa-plus" style={{ marginRight: 6 }}></i> Add Field
                  </button>
                )}
              </div>
            </section>
          </aside>

          <aside className="workspace-sidebar">
            {isOwner && project?.inviteToken && (
              <section className="workspace-panel" style={{ marginBottom: '24px' }}>
                <div className="workspace-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                  <div>
                    <h3 className="section-title" style={{ marginBottom: 4 }}>Invite Link</h3>
                    <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Share this link to invite members directly.</div>
                  </div>
                </div>
                <div style={{ padding: '0 20px 20px 20px', display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    readOnly 
                    className="form-input" 
                    value={`${window.location.origin}/app/invite/${project.inviteToken}`}
                    style={{ flex: 1, fontSize: '0.85rem' }} 
                    onClick={(e) => e.target.select()}
                  />
                  <button 
                    className="btn btn--primary" 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/app/invite/${project.inviteToken}`);
                      toast.success('Copied to clipboard!');
                    }}
                  >
                    Copy
                  </button>
                </div>
              </section>
            )}

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
                  <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {requests.map(request => (
                      <div key={request._id} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar user={request.user} size="md" />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{request.user?.username || request.user?.email || 'User'}</div>
                            <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>wants to join as <strong style={{ color: 'var(--text)' }}>{request.roleName}</strong></div>
                          </div>
                        </div>
                        <div>
                          {request.requestedAt && <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Sent: {fmtDate(request.requestedAt)}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn--danger btn--sm" onClick={() => handleReq(request._id, 'reject')}>Reject</button>
                          <button className="btn btn--green btn--sm" onClick={() => handleReq(request._id, 'accept')}>Accept</button>
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

      {tab === 'analytics' && (isOwner || user?.isAdmin) && (
        <ProjectAnalyticsTab projectId={id} />
      )}

      {tab === 'team-hub' && isMember && (
        <TeamHubTab projectId={id} isOwner={isOwner} />
      )}

      <Modal open={taskModal} onClose={() => setTaskModal(false)} title="Add Task">
        <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input name="title" className="form-input" required placeholder="Task title" />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Issue Type</label>
              <select name="taskType" className="form-input" defaultValue="Task">
                <option value="Task">Task</option>
                <option value="Bug">Bug</option>
                <option value="Story">Story</option>
                <option value="Epic">Epic</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Workflow Status</label>
              <select name="status" className="form-input" defaultValue={workflowStatuses[0] || 'Todo'}>
                {workflowStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
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
              <label className="form-label">Assignee</label>
              <Select
                isMulti
                name="assignedTo"
                className="react-select-container"
                classNamePrefix="react-select"
                placeholder="Unassigned"
                options={(members || []).map((member) => {
                  const userInfo = member.user || member;
                  return {
                    value: userInfo?._id,
                    label: userInfo?.username || userInfo?.email?.split('@')[0] || 'User'
                  };
                })}
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
            <div className="form-group">
              <label className="form-label">Story Points</label>
              <input name="storyPoints" className="form-input" type="number" min="0" defaultValue="0" />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input name="startDate" className="form-input" type="date" />
            </div>
            <div className="form-group">
              <label className="form-label">Deadline</label>
              <input name="deadline" className="form-input" type="date" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Labels</label>
            <input name="labels" className="form-input" placeholder="frontend, urgent, api" />
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
          userId={user?.id || user?._id}
          projectId={id}
          projectCustomFields={project?.customFields || []}
          onTaskUpdate={handleTaskUpdate}
        />
      )}

      {isMember && (
        <>
          <button 
            className="btn btn--blue" 
            style={{ position: 'fixed', bottom: 24, right: 24, borderRadius: '50%', width: 56, height: 56, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9998 }}
            onClick={() => setChatOpen(!chatOpen)}
          >
            <i className={`fa-solid ${chatOpen ? 'fa-xmark' : 'fa-robot'}`} style={{ fontSize: '1.4rem' }} />
          </button>
          {chatOpen && <AICopilotChat projectId={id} onClose={() => setChatOpen(false)} />}
        </>
      )}
    </>
  );
}
