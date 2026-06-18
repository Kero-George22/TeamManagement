import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../lib/api';
import Topbar from '../components/layout/Topbar';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';
import { useToast } from '../lib/toast';
import { daysLeft, projectProgress } from '../lib/utils';

const STATUS_COLORS = { Recruiting: 'green', 'In-Progress': 'blue', Completed: 'gray' };

const CATEGORY_GROUPS = [
  {
    id: 'software',
    label: 'Software',
    icon: 'fa-microchip',
    children: [
      { id: 'Web Development', label: 'Web Dev', icon: 'fa-globe' },
      { id: 'Mobile Development', label: 'Mobile', icon: 'fa-mobile-screen' },
      { id: 'Software Development', label: 'Software', icon: 'fa-code' },
      { id: 'DevOps & Cloud', label: 'DevOps', icon: 'fa-cloud' },
      { id: 'Cybersecurity', label: 'Security', icon: 'fa-shield-halved' },
      { id: 'Blockchain', label: 'Blockchain', icon: 'fa-link' },
      { id: 'Game Development', label: 'Games', icon: 'fa-gamepad' },
    ],
  },
  {
    id: 'data',
    label: 'Data & AI',
    icon: 'fa-brain',
    children: [
      { id: 'Data Science & AI', label: 'Data Science & AI', icon: 'fa-brain' },
      { id: 'Research & Development', label: 'Research', icon: 'fa-flask' },
    ],
  },
  {
    id: 'design',
    label: 'Design',
    icon: 'fa-palette',
    children: [
      { id: 'UI/UX Design', label: 'UI/UX', icon: 'fa-pen-ruler' },
    ],
  },
  {
    id: 'product',
    label: 'Product',
    icon: 'fa-lightbulb',
    children: [
      { id: 'E-commerce', label: 'E-commerce', icon: 'fa-cart-shopping' },
      { id: 'Business & Marketing', label: 'Go-to-market', icon: 'fa-bullhorn' },
      { id: 'Research & Development', label: 'Innovation', icon: 'fa-flask' },
    ],
  },
  {
    id: 'business',
    label: 'Business',
    icon: 'fa-briefcase',
    children: [
      { id: 'Business & Marketing', label: 'Marketing', icon: 'fa-chart-line' },
      { id: 'Finance & Accounting', label: 'Finance', icon: 'fa-coins' },
      { id: 'E-commerce', label: 'E-commerce', icon: 'fa-cart-shopping' },
    ],
  },
  {
    id: 'engineering',
    label: 'Engineering',
    icon: 'fa-gears',
    children: [
      { id: 'Engineering', label: 'Engineering', icon: 'fa-gears' },
      { id: 'IoT & Hardware', label: 'Hardware', icon: 'fa-microchip' },
      { id: 'Research & Development', label: 'R&D', icon: 'fa-flask' },
    ],
  },
  {
    id: 'health',
    label: 'Health',
    icon: 'fa-heart-pulse',
    children: [
      { id: 'Healthcare', label: 'Healthcare', icon: 'fa-heart-pulse' },
      { id: 'Research & Development', label: 'Medical R&D', icon: 'fa-flask' },
    ],
  },
  {
    id: 'education',
    label: 'Education',
    icon: 'fa-graduation-cap',
    children: [
      { id: 'Education & Training', label: 'Education', icon: 'fa-graduation-cap' },
      { id: 'Research & Development', label: 'Research', icon: 'fa-flask' },
    ],
  },
  {
    id: 'impact',
    label: 'Impact',
    icon: 'fa-hand-holding-heart',
    children: [
      { id: 'Social Impact', label: 'Social Impact', icon: 'fa-hand-holding-heart' },
      { id: 'Education & Training', label: 'Education', icon: 'fa-graduation-cap' },
      { id: 'Healthcare', label: 'Healthcare', icon: 'fa-heart-pulse' },
    ],
  },
];

export default function ExplorePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    q: '',
    role: '',
    category: 'all',
    status: 'all',
    sort: 'newest',
    durationMin: '',
    durationMax: '',
  });
  const [page, setPage] = useState(1);

  const [joinProject, setJoinProject] = useState(null);
  const [joinRole, setJoinRole] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  const [likedProjects, setLikedProjects] = useState(new Set());
  const [bookmarkedProjects, setBookmarkedProjects] = useState(new Set());
  const [likesCounts, setLikesCounts] = useState({});
  const [bookmarksCounts, setBookmarksCounts] = useState({});

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [roles, setRoles] = useState([{ roleName: '', totalSlots: 1 }]);
  const [expandedGroup, setExpandedGroup] = useState(null);

  const user = API.getUser();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await API.projects.explore({
        q: filters.q,
        role: filters.role,
        category: filters.category !== 'all' ? filters.category : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        sort: filters.sort,
        durationMin: filters.durationMin || undefined,
        durationMax: filters.durationMax || undefined,
        page,
        limit: 20,
      });
      setResult(data ?? { projects: [], totalPages: 1, total: 0 });
    } catch { toast.error('Failed to load projects'); }
    setLoading(false);
  }, [filters, page]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  function updateFilter(key, value) {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function openJoinModal(project) {
    const openRoles = (project.rolesRequired || []).filter(
      (r) => (r.filledSlots || 0) < (r.totalSlots || 0)
    );
    setJoinProject(project);
    setJoinRole(openRoles[0]?.roleName || '');
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinProject || !joinRole.trim()) return;
    setJoinLoading(true);
    try {
      await API.projects.requestJoin(joinProject._id, joinRole.trim());
      toast.success('Join request sent!');
      setJoinProject(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setJoinLoading(false);
    }
  }

  async function handleLike(projectId) {
    try {
      const res = await API.projects.like(projectId);
      setLikedProjects(prev => {
        const next = new Set(prev);
        if (res.liked) next.add(projectId);
        else next.delete(projectId);
        return next;
      });
      setLikesCounts(prev => ({ ...prev, [projectId]: res.likesCount }));
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleBookmark(projectId) {
    try {
      const res = await API.projects.bookmark(projectId);
      setBookmarkedProjects(prev => {
        const next = new Set(prev);
        if (res.bookmarked) next.add(projectId);
        else next.delete(projectId);
        return next;
      });
      setBookmarksCounts(prev => ({ ...prev, [projectId]: res.bookmarksCount }));
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const isPrivate = fd.get('isPrivate') === 'on';
    setCreating(true);
    try {
      const proj = await API.projects.create({
        title: fd.get('title'),
        description: fd.get('description'),
        startDate: fd.get('startDate'),
        duration: parseInt(fd.get('duration'), 10),
        category: fd.get('category') || 'Other',
        rolesRequired: roles.filter(r => r.roleName.trim()),
        isPrivate,
      });
      toast.success('Project created!');
      setCreateOpen(false);
      setRoles([{ roleName: '', totalSlots: 1 }]);
      if (!isPrivate) load();
      navigate(`/app/project/${proj._id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  const projects = result?.projects || [];
  const totalPages = result?.totalPages || 1;

  return (
    <>
      <Topbar title="Discover Projects" action={
        <button className="btn btn--green btn--sm" onClick={() => setCreateOpen(true)}>
          <i className="fa-solid fa-plus" style={{ marginRight: 6 }} />Create Project
        </button>
      } />

      {/* Category Groups */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 12, marginBottom: 16 }}>
        {/* All button */}
        <button
          type="button"
          className={filters.category === 'all' ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm'}
          onClick={() => { updateFilter('category', 'all'); setExpandedGroup(null); }}
          style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <i className="fa-solid fa-layer-group" />
          All
        </button>

        {/* Category groups */}
        {CATEGORY_GROUPS.map((group) => {
          const isExpanded = expandedGroup === group.id;
          const hasActiveChild = group.children.some(c => filters.category === c.id);
          const isActive = filters.category === 'all' ? false : (hasActiveChild || expandedGroup === group.id);

          return (
            <div key={group.id} style={{ position: 'relative' }}>
              <button
                type="button"
                className={isActive ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm'}
                onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <i className={`fa-solid ${group.icon}`} />
                {group.label}
                <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: '.6rem', marginLeft: 2 }} />
              </button>

              {/* Dropdown */}
              {isExpanded && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, zIndex: 100,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: 6, minWidth: 180, marginTop: 4,
                  boxShadow: '0 8px 24px rgba(0,0,0,.3)',
                }}>
                  {group.children.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      className={filters.category === child.id ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm'}
                      onClick={() => { updateFilter('category', child.id); setExpandedGroup(null); }}
                      style={{ width: '100%', justifyContent: 'flex-start', fontSize: '.8rem' }}
                    >
                      <i className={`fa-solid ${child.icon}`} style={{ width: 16 }} />
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Search & Filters Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
          Discover projects across all fields. Find collaborators, join teams, or get inspired by what others are building.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <i
              className="fa-solid fa-magnifying-glass"
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search projects, roles, or keywords…"
              value={filters.q}
              onChange={(e) => updateFilter('q', e.target.value)}
              style={{ paddingLeft: 38 }}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <input
              className="form-input"
              placeholder="Role (e.g. Frontend)"
              value={filters.role}
              onChange={(e) => updateFilter('role', e.target.value)}
              style={{ flex: '1 1 140px', minWidth: 120 }}
            />
            <select
              className="form-input"
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              style={{ flex: '0 1 140px' }}
            >
              <option value="all">All statuses</option>
              <option value="Recruiting">Recruiting</option>
              <option value="In-Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
            <select
              className="form-input"
              value={filters.sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              style={{ flex: '0 1 140px' }}
            >
              <option value="newest">Newest</option>
              <option value="popular">Most Popular</option>
              <option value="deadline">Deadline</option>
              <option value="slots">Most Openings</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="number"
              className="form-input"
              placeholder="Min days"
              value={filters.durationMin}
              onChange={(e) => updateFilter('durationMin', e.target.value)}
              style={{ width: 100 }}
              min={1}
            />
            <span style={{ color: 'var(--text-muted)' }}>–</span>
            <input
              type="number"
              className="form-input"
              placeholder="Max days"
              value={filters.durationMax}
              onChange={(e) => updateFilter('durationMax', e.target.value)}
              style={{ width: 100 }}
              min={1}
            />
            <button type="button" className="btn btn--primary btn--sm" onClick={load}>
              Apply filters
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 220, borderRadius: 'var(--card-radius)' }} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state card">
          <i className="fa-solid fa-compass" />
          <h4>No matching projects</h4>
          <p>Try different filters or create your own project to get started.</p>
          <button type="button" className="btn btn--outline btn--sm" onClick={() => navigate('/app/projects')}>
            Browse all projects
          </button>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            {result?.total ?? projects.length} project{(result?.total ?? 0) !== 1 ? 's' : ''} found
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {projects.map((p) => {
              const openRoles = (p.rolesRequired || []).filter(
                (r) => (r.filledSlots || 0) < (r.totalSlots || 0)
              );
              const progress = projectProgress(p.startDate, p.duration);
              const membersCount = p.membersCount || (p.members || []).length + 1;
              const isLiked = likedProjects.has(p._id);
              const isBookmarked = bookmarkedProjects.has(p._id);
              const likesCount = likesCounts[p._id] ?? p.likesCount ?? 0;
              const bookmarksCount = bookmarksCounts[p._id] ?? 0;

              return (
                <article key={p._id} className="card" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {/* Like/Bookmark buttons */}
                  <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      style={{ padding: '4px 8px', fontSize: '.8rem' }}
                      onClick={() => handleLike(p._id)}
                    >
                      <i className={`fa-${isLiked ? 'solid' : 'regular'} fa-heart`} style={{ color: isLiked ? '#ef4444' : 'inherit' }} />
                      {likesCount > 0 && <span style={{ marginLeft: 4 }}>{likesCount}</span>}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      style={{ padding: '4px 8px', fontSize: '.8rem' }}
                      onClick={() => handleBookmark(p._id)}
                    >
                      <i className={`fa-${isBookmarked ? 'solid' : 'regular'} fa-bookmark`} style={{ color: isBookmarked ? '#f59e0b' : 'inherit' }} />
                      {bookmarksCount > 0 && <span style={{ marginLeft: 4 }}>{bookmarksCount}</span>}
                    </button>
                  </div>

                  <div style={{ marginBottom: 8, paddingRight: 80 }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{p.title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.78rem', color: 'var(--text-muted)' }}>
                      <Avatar user={p.owner} size="sm" />
                      {p.owner?.username || p.owner?.email?.split('@')[0] || 'Owner'}
                      <span style={{ color: 'var(--text-muted)' }}>·</span>
                      <span>{membersCount} member{membersCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                    <Badge variant={STATUS_COLORS[p.status] || 'gray'}>{p.status}</Badge>
                    {p.category && p.category !== 'Other' && (
                      <span className="chip" style={{ fontSize: '.7rem' }}>
                        {p.category}
                      </span>
                    )}
                  </div>

                  <p
                    style={{
                      fontSize: '.82rem',
                      color: 'var(--text-secondary)',
                      flex: 1,
                      marginBottom: 12,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {p.description}
                  </p>

                  {/* Progress bar */}
                  {progress > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--primary)', borderRadius: 2, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )}

                  {p.lookingFor && (
                    <div style={{ fontSize: '.75rem', color: 'var(--text-secondary)', marginBottom: 8, fontStyle: 'italic' }}>
                      <i className="fa-solid fa-user-plus" style={{ marginRight: 4 }} />
                      Looking for: {p.lookingFor}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {openRoles.slice(0, 4).map((role, i) => (
                      <span key={i} className="chip" style={{ fontSize: '.75rem' }}>
                        {role.roleName} ({(role.totalSlots || 0) - (role.filledSlots || 0)} open)
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                    <span>{p.openSlots} open slot{p.openSlots !== 1 ? 's' : ''}</span>
                    <span>{daysLeft(p.startDate, p.duration)}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      style={{ flex: 1 }}
                      onClick={() => openJoinModal(p)}
                    >
                      Request to join
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => navigate(`/app/project/${p._id}`, { state: { from: location.pathname } })}
                    >
                      View
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24 }}>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span style={{ alignSelf: 'center', fontSize: '.875rem', color: 'var(--text-muted)' }}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <Modal open={!!joinProject} onClose={() => setJoinProject(null)} title="Request to join">
        {joinProject && (
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)' }}>
              Project: <strong>{joinProject.title}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select
                className="form-input"
                value={joinRole}
                onChange={(e) => setJoinRole(e.target.value)}
                required
              >
                {(joinProject.rolesRequired || [])
                  .filter((r) => (r.filledSlots || 0) < (r.totalSlots || 0))
                  .map((r) => (
                    <option key={r.roleName} value={r.roleName}>
                      {r.roleName} ({(r.totalSlots || 0) - (r.filledSlots || 0)} slots left)
                    </option>
                  ))}
              </select>
            </div>
            <button type="submit" className="btn btn--primary" disabled={joinLoading}>
              {joinLoading ? 'Sending…' : 'Send request'}
            </button>
          </form>
        )}
      </Modal>

      {/* Create Project Modal */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setRoles([{ roleName: '', totalSlots: 1 }]); }} title="Create Project" maxWidth={560}>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input name="title" className="form-input" required placeholder="e.g. E-commerce Platform" />
          </div>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea name="description" className="form-input" rows={3} required placeholder="What's this project about?" />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Start Date *</label>
              <input name="startDate" type="date" className="form-input" required defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="form-group">
              <label className="form-label">Duration (days) *</label>
              <input name="duration" type="number" className="form-input" min="1" required placeholder="30" />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select name="category" className="form-input" defaultValue="Other">
                <option value="Other">Other</option>
                {CATEGORY_GROUPS.flatMap(g => g.children).map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              Roles Required
              <button type="button" onClick={() => setRoles([...roles, { roleName: '', totalSlots: 1 }])} style={{ color: 'var(--green)', fontWeight: 600, fontSize: '.78rem', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add Role</button>
            </label>
            {roles.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                <input className="form-input" placeholder="Role name" required value={r.roleName} onChange={e => { const n = [...roles]; n[i].roleName = e.target.value; setRoles(n); }} style={{ flex: 2 }} />
                <input className="form-input" type="number" required min="1" placeholder="Slots" value={r.totalSlots} onChange={e => { const n = [...roles]; n[i].totalSlots = +e.target.value; setRoles(n); }} style={{ width: 80 }} />
                <button type="button" onClick={() => setRoles(roles.filter((_, j) => j !== i))} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><i className="fa-solid fa-trash" /></button>
              </div>
            ))}
          </div>
          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" name="isPrivate" style={{ width: 18, height: 18, accentColor: 'var(--green)', cursor: 'pointer' }} />
            <label style={{ fontSize: '.875rem', cursor: 'pointer' }}>
              Private project <span style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}>(invite-only via link)</span>
            </label>
          </div>
          <button className="btn btn--green" disabled={creating} style={{ width: '100%' }}>
            {creating ? <span className="spinner" /> : 'Create Project'}
          </button>
        </form>
      </Modal>
    </>
  );
}
