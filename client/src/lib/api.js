/* ── TeamForge API Client (ES Module) ─────── */
import { getCache, setCache, invalidateCachePrefix } from './cache.js';

const BASE = '';

const getToken = () => localStorage.getItem('tf_token') || localStorage.getItem('jxp_token');
const getUser  = () => {
  try {
    return JSON.parse(localStorage.getItem('tf_user') || localStorage.getItem('jxp_user') || 'null');
  }
  catch { return null; }
};

const saveAuth = (data) => {
  if (data?.token) {
    localStorage.setItem('tf_token', data.token);
    localStorage.removeItem('jxp_token');
  }
  if (data?.user) {
    localStorage.setItem('tf_user', JSON.stringify(data.user));
    localStorage.removeItem('jxp_user');
  }
};

const clearAuth = () => {
  localStorage.removeItem('tf_token');
  localStorage.removeItem('tf_user');
  localStorage.removeItem('jxp_token');
  localStorage.removeItem('jxp_user');
};

const isLoggedIn = () => !!getToken();

/* core fetch */
let onUnauthorized = () => { window.location.href = '/app/login'; };

export const setOnUnauthorized = (fn) => { onUnauthorized = fn; };

const request = async (method, path, body = null) => {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(BASE + path, opts);

  if (res.status === 401) {
    clearAuth();
    onUnauthorized();
    return;
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }
  return json?.data ?? json;
};

const get    = (path)       => request('GET',    path);
const post   = (path, body) => request('POST',   path, body);
const put    = (path, body) => request('PUT',    path, body);
const patch  = (path, body) => request('PATCH',  path, body);
const del    = (path)       => request('DELETE', path);

/* Auth */
const auth = {
  signup:   (email, password)    => post('/auth/signup',  { email, password }),
  verify:   (token)              => post('/auth/verify',  { token }),
  login:    (email, password)    => post('/auth/login',   { email, password }),
  logout:   ()                   => post('/auth/logout'),
  forgotPw: (email)              => post('/auth/forgot-password', { email }),
  resetPw:  (token, newPassword) => post('/auth/reset-password',  { token, newPassword }),
  changePw: (oldPassword, newPw) => post('/auth/change-password', { oldPassword, newPassword: newPw }),
};

/* Profile */
const profile = {
  me:     ()         => get('/profile/me'),
  update: (data)     => put('/profile/me', data),
  user:   (userId)   => get(`/profile/${userId}`),
  public: (userId)   => fetch(BASE + `/profile/public/${userId}`).then(r => r.json()),
};

/* Projects */
const projects = {
  list:          ()             => get('/projects').then(res => res?.projects || []),
  explore:       (params = {})  => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') qs.set(k, v);
    });
    const q = qs.toString();
    return get(`/projects/explore${q ? `?${q}` : ''}`);
  },
  create:        (data)         => post('/projects', data),
  get:           (id)           => get(`/projects/${id}`),
  update:        (id, data)     => put(`/projects/${id}`, data),
  remove:        (id)           => del(`/projects/${id}`),
  members:       (id)           => get(`/projects/${id}/members`),
  requestJoin:   (id, roleName) => post(`/projects/${id}/join`, { roleName }),
  joinRequests:  (id)           => get(`/projects/${id}/join-requests`),
  handleRequest: (pid, rid, st) => patch(`/projects/${pid}/join-requests/${rid}`, { status: st }),
  joinViaInvite: (token)        => post(`/projects/invite/${token}/join`),
  like:          (id)           => post(`/projects/${id}/like`),
  bookmark:      (id)           => post(`/projects/${id}/bookmark`),
};

/* Tasks */
const TASKS_CACHE_KEY = 'tasks_dashboard_overview';
const TASKS_CACHE_TTL = 30 * 1000; // 30 seconds

const tasks = {
  list:     (projectId)       => get(`/tasks/${projectId}`).then((r) => { invalidateCachePrefix('tasks_'); return r; }),
  board:    (projectId)       => get(`/tasks/${projectId}/board`),
  dashboardOverview: ()       => {
    const cached = getCache(TASKS_CACHE_KEY);
    if (cached) return Promise.resolve(cached);
    return get('/tasks/dashboard/overview').then((r) => {
      setCache(TASKS_CACHE_KEY, r, TASKS_CACHE_TTL);
      return r;
    });
  },
  create:   (projectId, data) => post(`/tasks/${projectId}`, data).then((r) => { invalidateCachePrefix('tasks_'); return r; }),
  generate: (projectId)       => post(`/tasks/${projectId}/generate`).then((r) => { invalidateCachePrefix('tasks_'); return r; }),
  get:      (taskId)          => get(`/tasks/task/${taskId}`),
  update:   (taskId, data)    => put(`/tasks/task/${taskId}`, data).then((r) => { invalidateCachePrefix('tasks_'); return r; }),
  status:   (taskId, status)  => patch(`/tasks/task/${taskId}/status`, { status }).then((r) => { invalidateCachePrefix('tasks_'); return r; }),
  remove:   (taskId)          => del(`/tasks/task/${taskId}`).then((r) => { invalidateCachePrefix('tasks_'); return r; }),
  comments: (taskId)          => get(`/tasks/task/${taskId}/comments`),
  addComment:(taskId, text)   => post(`/tasks/task/${taskId}/comments`, { text }),
  subtasks: (taskId)          => get(`/tasks/task/${taskId}/subtasks`),
  uploadAttachment: async (taskId, file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(BASE + `/tasks/task/${taskId}/attachment`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json?.message || 'Upload failed');
    }
    return res.json();
  },
};

/* DMs */
const dms = {
  send:          (recipientId, content) => post('/dms', { recipientId, content }),
  conversations: ()                     => get('/dms/conversations').then(res => res?.conversations || []),
  search:        (q)                    => get(`/dms/search?q=${encodeURIComponent(q)}`),
  messages:      (userId)               => get(`/dms/${userId}`),
};

/* Office */
const office = {
  messages: (pid)          => get(`/office/${pid}/messages`),
  send:     (pid, content) => post(`/office/${pid}/messages`, { content }),
  overview: (pid)          => get(`/office/${pid}/overview`),
  status:   (pid)          => get(`/office/${pid}/status`),
};

/* Notifications */
const notifications = {
  list:       ()             => get('/notifications'),
  unreadCount:()             => get('/notifications/unread-count'),
  markRead:   (id)           => patch(`/notifications/${id}/read`),
  markAllRead:()             => patch('/notifications/read-all'),
  remove:     (id)           => del(`/notifications/${id}`),
};

/* Time Tracking */
const time = {
  running:     ()            => get('/time/me/running'),
  start:       (taskId)      => post(`/time/task/${taskId}/start`),
  stop:        (entryId)     => post(`/time/${entryId}/stop`),
  pause:       (entryId)     => post(`/time/${entryId}/pause`),
  resume:      (entryId)     => post(`/time/${entryId}/resume`),
  entries:     (taskId)      => get(`/time/task/${taskId}/entries`),
  total:       (taskId)      => get(`/time/task/${taskId}/total`),
};

/* Analytics */
const analytics = {
  platform: () => get('/analytics/platform'),
  project:  (projectId) => get(`/analytics/project/${projectId}`),
};

/* Portfolio */
const portfolio = {
  me:           () => get('/portfolio/me'),
  stats:        () => get('/portfolio/me/stats'),
  public:       (userId) => fetch(BASE + `/portfolio/public/${userId}`).then((r) => r.json()).then((j) => j?.data ?? j),
  exportJson:   () => get('/portfolio/export/json'),
  exportMarkdown: async () => {
    const token = getToken();
    const res = await fetch(BASE + '/portfolio/export/markdown', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Export failed');
    return res.text();
  },
};

/* Submissions */
const submissions = {
  create:       (data) => post('/submissions', data),
  mine:         () => get('/submissions/user/submissions').then((r) => r?.submissions || r || []),
  get:          (id) => get(`/submissions/${id}`),
  adminQueue:   (status = 'pending') => get(`/submissions/admin/review?status=${status}`).then((r) => r?.submissions || []),
  aiReview:     (id) => post(`/submissions/${id}/ai-review`),
  approve:      (id) => post(`/submissions/${id}/approve`),
  reject:       (id, feedback) => post(`/submissions/${id}/reject`, { feedback }),
  humanReview:  (id, data) => post(`/submissions/${id}/human-review`, data),
};

/* Goals */
const goals = {
  list:         () => get('/goals').then((r) => r?.goals || []),
  create:       (data) => post('/goals', data),
  update:       (id, data) => patch(`/goals/${id}`, data),
  remove:       (id) => del(`/goals/${id}`),
  importLocal:  (goalsList) => post('/goals/import-local', { goals: goalsList }),
};

const API = {
  getToken, getUser, saveAuth, clearAuth, isLoggedIn,
  auth, profile, projects, tasks, dms, office, notifications, time,
  analytics, portfolio, submissions, goals,
};

export default API;
