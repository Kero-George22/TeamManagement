/* ── TeamForge API Client (ES Module) ─────── */

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
};

/* Projects */
const projects = {
  list:          ()             => get('/projects').then(res => res?.projects || []),
  create:        (data)         => post('/projects', data),
  get:           (id)           => get(`/projects/${id}`),
  update:        (id, data)     => put(`/projects/${id}`, data),
  remove:        (id)           => del(`/projects/${id}`),
  members:       (id)           => get(`/projects/${id}/members`),
  requestJoin:   (id, roleName) => post(`/projects/${id}/join`, { roleName }),
  joinRequests:  (id)           => get(`/projects/${id}/join-requests`),
  handleRequest: (pid, rid, st) => patch(`/projects/${pid}/join-requests/${rid}`, { status: st }),
  joinViaInvite: (token)        => post(`/projects/invite/${token}/join`),
};

/* Tasks */
const tasks = {
  list:     (projectId)       => get(`/tasks/${projectId}`),
  dashboardOverview: ()       => get('/tasks/dashboard/overview'),
  create:   (projectId, data) => post(`/tasks/${projectId}`, data),
  generate: (projectId)       => post(`/tasks/${projectId}/generate`),
  get:      (taskId)          => get(`/tasks/task/${taskId}`),
  update:   (taskId, data)    => put(`/tasks/task/${taskId}`, data),
  status:   (taskId, status)  => patch(`/tasks/task/${taskId}/status`, { status }),
  remove:   (taskId)          => del(`/tasks/task/${taskId}`),
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

const API = {
  getToken, getUser, saveAuth, clearAuth, isLoggedIn,
  auth, profile, projects, tasks, dms, office,
};

export default API;
