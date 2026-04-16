import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalProject } from '../contexts/ProjectContext';
import API from '../lib/api';
import Topbar from '../components/layout/Topbar';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/Primitives';
import { daysLeft, fmtDate, projectProgress } from '../lib/utils';

const STATUS_VARIANTS = {
  Recruiting: 'green',
  'In-Progress': 'blue',
  Completed: 'gray',
};

const CARD_COLORS = ['yellow', 'blue', 'pink', 'green', 'purple', 'orange', 'teal', 'indigo', 'cyan', 'red'];
const FILLS = {
  yellow: '#f59e0b',
  blue: '#3b82f6',
  pink: '#ec4899',
  green: '#22c55e',
  purple: '#8b5cf6',
  orange: '#f97316',
  teal: '#14b8a6',
  indigo: '#6366f1',
  cyan: '#06b6d4',
  red: '#ef4444',
};

const ANALYTICS_COLORS = {
  done: '#22c55e',
  inProgress: '#3b82f6',
  pending: '#f59e0b',
  overdue: '#ef4444',
};

function getFill(color) {
  return FILLS[color] || FILLS.blue;
}

function getProjectColor(projectId) {
  if (!projectId) return CARD_COLORS[0];
  const sum = String(projectId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CARD_COLORS[sum % CARD_COLORS.length];
}

function getProjectRole(project, userId) {
  if (!project || !userId) return 'Member';
  if (project.owner?._id === userId || project.owner === userId) return 'Owner';
  const membership = (project.members || []).find(member => (member.userId?._id || member.userId) === userId);
  return membership?.roleName || 'Member';
}

function getMemberCount(project) {
  const members = project?.members || [];
  const roleCounts = project?.rolesRequired || [];
  if (members.length) return members.length;
  if (roleCounts.length) {
    return roleCounts.reduce((count, role) => count + (role.filledSlots || 0), 0);
  }
  return 0;
}

function formatTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { projects, loadingProjects } = useGlobalProject();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState(null);
  const [allTasks, setAllTasks] = useState(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const response = await API.profile.me();
        if (isMounted) setProfile(response?.user || response || null);
      } catch {
        if (isMounted) setProfile(null);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setAllTasks(null);

    (async () => {
      try {
        const response = await API.tasks.dashboardOverview();
        const tasks = response?.tasks || [];
        if (isMounted) setAllTasks(tasks);
      } catch {
        if (isMounted) setAllTasks([]);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user?._id]);

  const dashboardStats = useMemo(() => {
    const list = projects || [];
    const owned = list.filter(project => project.owner?._id === user?._id || project.owner === user?._id);
    const joined = list.filter(project => (project.members || []).some(member => (member.userId?._id || member.userId) === user?._id));
    const active = list.filter(project => project.status !== 'Completed');
    const taskList = allTasks || [];
    const myTasks = taskList.filter(task => (task.assignedTo?._id || task.assignedTo) === user?._id);

    return {
      totalProjects: list.length,
      ownedProjects: owned.length,
      joinedProjects: joined.length,
      activeProjects: active.length,
      totalTasks: taskList.length,
      myTasks: myTasks.length,
    };
  }, [projects, allTasks, user]);

  const sortedProjects = useMemo(() => {
    const list = [...(projects || [])];
    return list.sort((left, right) => {
      const leftDate = new Date(left.updatedAt || left.createdAt || 0).getTime();
      const rightDate = new Date(right.updatedAt || right.createdAt || 0).getTime();
      return rightDate - leftDate;
    });
  }, [projects]);

  const myTasks = useMemo(() => {
    const list = (allTasks || []).filter(task => (task.assignedTo?._id || task.assignedTo) === user?._id);
    const priorityRank = { High: 3, Medium: 2, Low: 1 };

    return list.sort((left, right) => {
      const leftPriority = priorityRank[left.priority] || 0;
      const rightPriority = priorityRank[right.priority] || 0;
      if (leftPriority !== rightPriority) return rightPriority - leftPriority;

      const leftDeadline = left.deadline ? new Date(left.deadline).getTime() : Number.POSITIVE_INFINITY;
      const rightDeadline = right.deadline ? new Date(right.deadline).getTime() : Number.POSITIVE_INFINITY;
      if (leftDeadline !== rightDeadline) return leftDeadline - rightDeadline;

      return new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime();
    });
  }, [allTasks, user]);

  const activityFeed = useMemo(() => {
    const priorityRank = { High: 3, Medium: 2, Low: 1 };
    return [...(allTasks || [])]
      .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime())
      .map(task => ({
        task,
        project: task.projectRef,
        action: task.status === 'Done' || task.status === 'Approved' ? 'Completed' : 'Updated',
        priority: priorityRank[task.priority] || 0,
      }));
  }, [allTasks]);

  const analyticsData = useMemo(() => {
    const tasks = allTasks || [];
    const now = new Date();
    const done = tasks.filter(t => t.status === 'Done' || t.status === 'Approved').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const pending = tasks.filter(t => t.status === 'Todo' || t.status === 'To Do').length;
    const overdue = tasks.filter(t => t.deadline && new Date(t.deadline) < now && t.status !== 'Done' && t.status !== 'Approved').length;
    const total = tasks.length || 1;
    return {
      done,
      inProgress,
      pending,
      overdue,
      donePct: Math.round((done / total) * 100),
      inProgressPct: Math.round((inProgress / total) * 100),
      pendingPct: Math.round((pending / total) * 100),
      overduePct: Math.round((overdue / total) * 100),
    };
  }, [allTasks]);

  const priorityData = useMemo(() => {
    const tasks = allTasks || [];
    const high = tasks.filter(t => t.priority === 'High').length;
    const medium = tasks.filter(t => t.priority === 'Medium').length;
    const low = tasks.filter(t => t.priority === 'Low').length;
    const total = high + medium + low || 1;
    return { high, medium, low, highPct: (high / total) * 100, mediumPct: (medium / total) * 100, lowPct: (low / total) * 100 };
  }, [allTasks]);

  return (
    <>
      <Topbar title="All Projects" />

      <div className="dashboard-analytics">
        <div className="analytics-stat">
          <div className="analytics-stat__chart">
            <div className="analytics-bar" style={{ '--height': `${analyticsData.donePct}%`, '--color': ANALYTICS_COLORS.done }} />
          </div>
          <div className="analytics-stat__value">{analyticsData.done}</div>
          <div className="analytics-stat__label">Completed</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat__chart">
            <div className="analytics-bar" style={{ '--height': `${analyticsData.inProgressPct}%`, '--color': ANALYTICS_COLORS.inProgress }} />
          </div>
          <div className="analytics-stat__value">{analyticsData.inProgress}</div>
          <div className="analytics-stat__label">In Progress</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat__chart">
            <div className="analytics-bar" style={{ '--height': `${analyticsData.pendingPct}%`, '--color': ANALYTICS_COLORS.pending }} />
          </div>
          <div className="analytics-stat__value">{analyticsData.pending}</div>
          <div className="analytics-stat__label">Pending</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat__chart">
            <div className="analytics-bar" style={{ '--height': `${analyticsData.overduePct}%`, '--color': ANALYTICS_COLORS.overdue }} />
          </div>
          <div className="analytics-stat__value">{analyticsData.overdue}</div>
          <div className="analytics-stat__label">Overdue</div>
        </div>
        <div className="analytics-stat analytics-stat--wide">
          <div className="analytics-priority">
            <div className="analytics-priority__bar">
              <div className="analytics-priority__fill" style={{ width: `${priorityData.highPct}%`, background: FILLS.red }} />
              <div className="analytics-priority__fill" style={{ width: `${priorityData.mediumPct}%`, background: FILLS.yellow }} />
              <div className="analytics-priority__fill" style={{ width: `${priorityData.lowPct}%`, background: FILLS.green }} />
            </div>
            <div className="analytics-priority__legend">
              <span><i style={{ background: FILLS.red }} /> High ({priorityData.high})</span>
              <span><i style={{ background: FILLS.yellow }} /> Medium ({priorityData.medium})</span>
              <span><i style={{ background: FILLS.green }} /> Low ({priorityData.low})</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-layout">
        <div className="dashboard-stack">
          <section className="dashboard-widget">
            <div className="dashboard-widget__header">
              <div>
                <h3 className="section-title" style={{ marginBottom: 4 }}>Project Grid</h3>
                <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Open any project to jump into its workspace.</div>
              </div>
              <button className="btn btn--green btn--sm" onClick={() => navigate('/app/projects')}>
                <i className="fa-solid fa-compass" /> Browse all
              </button>
            </div>

            {loadingProjects || sortedProjects.length === 0 ? (
              loadingProjects ? (
                <div className="dashboard-project-grid">
                  {[0, 1, 2, 3].map(index => (
                    <div key={index} className="skeleton" style={{ height: 192, borderRadius: 24 }} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fa-solid fa-folder-open" />
                  <h4>No projects yet</h4>
                  <p>Create a project or join one to start the workspace.</p>
                </div>
              )
            ) : (
              <div className="dashboard-project-grid">
                {sortedProjects.slice(0, 6).map(project => {
                  const color = getProjectColor(project._id);
                  const progress = projectProgress(project.startDate, project.duration);
                  const role = getProjectRole(project, user?._id);

                  return (
                    <article
                      key={project._id}
                      className="dashboard-project-card"
                      style={{ borderTop: `4px solid ${FILLS[color]}` }}
                      onClick={() => navigate(`/app/project/${project._id}`, { state: { from: location.pathname + location.search } })}
                    >
                      <div className="dashboard-project-card__top">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Badge variant={STATUS_VARIANTS[project.status] || 'gray'}>{project.status}</Badge>
                          <h4 style={{ marginTop: 10, fontSize: '1.03rem', fontWeight: 800, lineHeight: 1.2 }}>{project.title}</h4>
                          <p className="dashboard-project-card__desc" style={{ marginTop: 8, minHeight: 42, fontSize: '.82rem', color: 'var(--text-secondary)' }}>
                            {project.description || 'No description yet.'}
                          </p>
                        </div>
                        <div
                          className="dashboard-progress-ring"
                          style={{ background: `conic-gradient(${FILLS[color]} ${progress * 3.6}deg, rgba(255,255,255,.12) 0deg)` }}
                        >
                          <span className="dashboard-progress-ring__value">{progress}%</span>
                        </div>
                      </div>

                      <div className="dashboard-project-card__meta" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginTop: 18 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span className="chip"><i className="fa-solid fa-user-gear" /> {role}</span>
                          <span className="chip"><i className="fa-solid fa-users" /> {getMemberCount(project)}</span>
                        </div>
                        <span className="p-card__date">{daysLeft(project.startDate, project.duration)} left</span>
                      </div>

                      <ProgressBar value={progress} style={{ marginTop: 14, '--fill': FILLS[color] }} />
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="dashboard-stack">
          <section className="dashboard-widget">
            <div className="dashboard-widget__header">
              <div>
                <h3 className="section-title" style={{ marginBottom: 4 }}>My Tasks</h3>
                <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Your next actions across all projects.</div>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => navigate('/app/tasks')}>
                Open view
              </button>
            </div>

            {allTasks === null ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {[0, 1, 2, 3].map(index => (
                  <div key={index} className="skeleton" style={{ height: 68, borderRadius: 18 }} />
                ))}
              </div>
            ) : myTasks.length === 0 ? (
              <div className="empty-state" style={{ padding: '28px 12px' }}>
                <i className="fa-solid fa-check-circle" />
                <h4>No assigned tasks</h4>
                <p>You’re clear for now. New work will surface here.</p>
              </div>
            ) : (
              <div>
                {myTasks.slice(0, 6).map(task => {
                  const projectColor = getProjectColor(task.projectRef?._id);
                  const projectBadge = FILLS[projectColor];
                  const isLate = task.deadline && new Date(task.deadline) < new Date();

                  return (
                    <div key={task._id} className="dashboard-task-row" onClick={() => navigate(`/app/task/${task._id}`)} style={{ cursor: 'pointer' }}>
                      <Avatar user={task.assignedTo || user} size="sm" />
                      <div className="dashboard-task-row__body">
                        <div className="dashboard-task-row__title">{task.title}</div>
                        <div className="dashboard-task-row__meta">
                          <Badge variant={projectColor}>{task.projectRef?.title || 'Project'}</Badge>
                          <span className="chip"><i className="fa-regular fa-calendar" /> {task.deadline ? fmtDate(task.deadline) : 'No deadline'}</span>
                          <span className="chip" style={{ color: isLate ? 'var(--red)' : 'inherit' }}>
                            <i className="fa-solid fa-circle" style={{ fontSize: '.45rem', color: projectBadge }} />
                            {task.priority || 'Medium'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="dashboard-widget">
            <div className="dashboard-widget__header">
              <div>
                <h3 className="section-title" style={{ marginBottom: 4 }}>Activity Feed</h3>
                <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Recent updates from the projects you’re in.</div>
              </div>
            </div>

            {allTasks === null ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {[0, 1, 2, 3].map(index => (
                  <div key={index} className="skeleton" style={{ height: 52, borderRadius: 18 }} />
                ))}
              </div>
            ) : activityFeed.length === 0 ? (
              <div className="empty-state" style={{ padding: '28px 12px' }}>
                <i className="fa-solid fa-bolt" />
                <h4>No recent activity</h4>
                <p>Task updates will appear here as the team moves.</p>
              </div>
            ) : (
              <div style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
                {activityFeed.map(({ task, project, action }) => {
                  const color = getProjectColor(project?._id);
                  return (
                    <div key={task._id} className="feed-item" onClick={() => navigate(`/app/task/${task._id}`)} style={{ cursor: 'pointer' }}>
                      <span className="feed-item__dot" style={{ background: FILLS[color], boxShadow: `0 0 0 4px ${FILLS[color]}22` }} />
                      <div className="feed-item__body">
                        <div className="feed-item__title">{action} “{task.title}”</div>
                        <div className="feed-item__meta">
                          <Badge variant={color}>{project?.title || 'Project'}</Badge>
                          <span>{formatTimestamp(task.updatedAt || task.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="dashboard-widget">
            <div className="dashboard-widget__header">
              <div>
                <h3 className="section-title" style={{ marginBottom: 4 }}>Profile</h3>
                <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Quick identity snapshot.</div>
              </div>
            </div>

            {profile ? (
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <Avatar user={profile} size="lg" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>{profile.username || profile.email?.split('@')[0] || 'User'}</div>
                  <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginTop: 4 }}>{profile.email}</div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className="chip"><i className="fa-solid fa-folder-open" /> {dashboardStats.ownedProjects} owned</span>
                    <span className="chip"><i className="fa-solid fa-handshake-angle" /> {dashboardStats.joinedProjects} joined</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="skeleton" style={{ height: 92, borderRadius: 18 }} />
            )}
          </section>
        </div>
      </div>
    </>
  );
}
