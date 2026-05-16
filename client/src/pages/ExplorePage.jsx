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

const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'fa-layer-group' },
  { id: 'Software Development', label: 'Software Dev', icon: 'fa-code' },
  { id: 'Web Development', label: 'Web Dev', icon: 'fa-globe' },
  { id: 'Mobile Development', label: 'Mobile', icon: 'fa-mobile-screen' },
  { id: 'Data Science & AI', label: 'AI & Data', icon: 'fa-brain' },
  { id: 'DevOps & Cloud', label: 'DevOps', icon: 'fa-cloud' },
  { id: 'Cybersecurity', label: 'Security', icon: 'fa-shield-halved' },
  { id: 'Blockchain', label: 'Blockchain', icon: 'fa-link' },
  { id: 'IoT & Hardware', label: 'IoT', icon: 'fa-microchip' },
  { id: 'Game Development', label: 'Games', icon: 'fa-gamepad' },
  { id: 'UI/UX Design', label: 'Design', icon: 'fa-palette' },
  { id: 'Business & Marketing', label: 'Business', icon: 'fa-chart-line' },
  { id: 'Finance & Accounting', label: 'Finance', icon: 'fa-coins' },
  { id: 'Engineering', label: 'Engineering', icon: 'fa-gears' },
  { id: 'Education & Training', label: 'Education', icon: 'fa-graduation-cap' },
  { id: 'Healthcare', label: 'Healthcare', icon: 'fa-heart-pulse' },
  { id: 'E-commerce', label: 'E-commerce', icon: 'fa-cart-shopping' },
  { id: 'Social Impact', label: 'Social', icon: 'fa-hand-holding-heart' },
  { id: 'Research & Development', label: 'R&D', icon: 'fa-flask' },
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
    status: 'Recruiting',
    sort: 'newest',
    durationMin: '',
    durationMax: '',
  });
  const [page, setPage] = useState(1);

  const [joinProject, setJoinProject] = useState(null);
  const [joinRole, setJoinRole] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await API.projects.explore({
        q: filters.q,
        role: filters.role,
        category: filters.category !== 'all' ? filters.category : undefined,
        status: filters.status,
        sort: filters.sort,
        durationMin: filters.durationMin,
        durationMax: filters.durationMax,
        page,
        limit: 12,
      });
      setResult(data);
    } catch (e) {
      toast.error(e.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [filters, page, toast]);

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

  const projects = result?.projects || [];
  const totalPages = result?.totalPages || 1;

  return (
    <>
      <Topbar title="Discover Projects" />

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 16 }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={filters.category === cat.id ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm'}
            onClick={() => updateFilter('category', cat.id)}
            style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className={`fa-solid ${cat.icon}`} />
            {cat.label}
          </button>
        ))}
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
              <option value="Recruiting">Recruiting</option>
              <option value="In-Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="all">All statuses</option>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {projects.map((p) => {
              const openRoles = (p.rolesRequired || []).filter(
                (r) => (r.filledSlots || 0) < (r.totalSlots || 0)
              );
              return (
                <article key={p._id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{p.title}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.78rem', color: 'var(--text-muted)' }}>
                        <Avatar user={p.owner} size="sm" />
                        {p.owner?.username || p.owner?.email?.split('@')[0] || 'Owner'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <Badge variant={STATUS_COLORS[p.status] || 'gray'}>{p.status}</Badge>
                      {p.category && p.category !== 'Other' && (
                        <span className="chip" style={{ fontSize: '.7rem' }}>
                          {p.category}
                        </span>
                      )}
                    </div>
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
    </>
  );
}
