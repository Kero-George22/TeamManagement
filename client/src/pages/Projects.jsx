import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { SpinnerWrap } from '../components/Spinner.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../api/index.js';

const STATUSES = ['', 'active', 'paused', 'completed', 'cancelled'];

const INITIAL_FORM = {
  name:'', description:'', techStack:'', roles:'', maxMembers:''
};

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast    = useToast();

  const [projects,   setProjects]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [status,     setStatus]     = useState('');
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const searchTimer = useRef(null);
  const LIMIT = 12;

  const loadProjects = useCallback(async (p = 1, q = search, s = status) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT });
      if (q) params.set('search', q);
      if (s) params.set('status', s);
      const data = await api.get('/projects?' + params);
      setProjects(data.projects || data);
      setTotal(data.total || (data.projects || data).length);
      setPage(p);
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProjects(1); }, []);

  function onSearch(val) {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadProjects(1, val, status), 350);
  }

  function onStatusChange(val) {
    setStatus(val);
    loadProjects(1, search, val);
  }

  function onChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  async function createProject(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name:        form.name,
        description: form.description,
        techStack:   form.techStack.split(',').map(s => s.trim()).filter(Boolean),
        roles:       form.roles.split(',').map(s => s.trim()).filter(Boolean),
        maxMembers:  form.maxMembers ? +form.maxMembers : undefined,
      };
      await api.post('/projects', payload);
      toast.success('Project created!');
      setShowModal(false);
      setForm(INITIAL_FORM);
      loadProjects(1);
    } catch (err) {
      toast.error(err.message);
    } finally { setSubmitting(false); }
  }

  const pages = Math.ceil(total / LIMIT);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <div className="page-title">PROJECTS</div>
          <div className="page-sub">{total} PROJECTS IN THE ARENA</div>
        </div>
        {user?.isAdmin && (
          <button className="btn btn-cyan" onClick={() => setShowModal(true)}>+ NEW PROJECT</button>
        )}
      </div>

      {/* Search + filter */}
      <div style={{ display:'flex', gap:12, marginBottom:24, flexWrap:'wrap' }}>
        <div className="search-bar" style={{ flex:1, minWidth:200 }}>
          <span>🔍</span>
          <input placeholder="Search projects…" value={search} onChange={e => onSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width:160 }} value={status} onChange={e => onStatusChange(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading
        ? <SpinnerWrap />
        : projects.length === 0
          ? <EmptyState icon="🏗" text="No projects found" sub="Try a different search or check back later." />
          : (
            <div className="proj-grid mb-6">
              {projects.map(p => (
                <div key={p._id} className="proj-card" onClick={() => navigate('/projects/' + p._id)}>
                  <div className="proj-card-name">{p.name}</div>
                  <div className="proj-card-desc">
                    {(p.description || '').slice(0, 110)}{p.description?.length > 110 ? '…' : ''}
                  </div>
                  <div className="proj-card-tags mb-4">
                    {(p.techStack || []).slice(0, 4).map(t => (
                      <span key={t} className="badge-chip">{t}</span>
                    ))}
                  </div>
                  <div className="proj-card-footer">
                    <StatusBadge status={p.status} />
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-2)' }}>
                      👥 {(p.members || []).length}/{p.maxMembers || '∞'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
      }

      {/* Pagination */}
      {pages > 1 && (
        <div className="pagination">
          {page > 1 && <button className="page-btn" onClick={() => loadProjects(page - 1)}>‹</button>}
          {Array.from({ length: pages }, (_, i) => i + 1)
            .filter(p => Math.abs(p - page) <= 2)
            .map(p => (
              <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => loadProjects(p)}>{p}</button>
            ))}
          {page < pages && <button className="page-btn" onClick={() => loadProjects(page + 1)}>›</button>}
        </div>
      )}

      {/* Create project modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="CREATE PROJECT"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-cyan" disabled={submitting} onClick={createProject}>
              {submitting ? 'CREATING…' : '✓ Create'}
            </button>
          </>
        }
      >
        <form onSubmit={createProject}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input name="name" className="form-input" required value={form.name} onChange={onChange} placeholder="My Awesome Project" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea name="description" className="form-textarea" value={form.description} onChange={onChange} placeholder="What is this project about?" />
          </div>
          <div className="form-group">
            <label className="form-label">Tech Stack (comma-separated)</label>
            <input name="techStack" className="form-input" value={form.techStack} onChange={onChange} placeholder="React, Node.js, MongoDB" />
          </div>
          <div className="form-group">
            <label className="form-label">Roles Needed (comma-separated)</label>
            <input name="roles" className="form-input" value={form.roles} onChange={onChange} placeholder="Frontend Dev, Backend Dev" />
          </div>
          <div className="form-group">
            <label className="form-label">Max Members</label>
            <input name="maxMembers" type="number" className="form-input" value={form.maxMembers} onChange={onChange} placeholder="10" min={1} />
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
