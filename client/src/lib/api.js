/* ── SyncUp API Client (ES Module) ─────── */
import { getCache, setCache, invalidateCachePrefix } from './cache.js';

const BASE = '/api/v1';

const getToken = () => null; // Now handled via httpOnly cookies
const getUser  = () => {
  try {
    return JSON.parse(localStorage.getItem('tf_user') || localStorage.getItem('jxp_user') || 'null');
  }
  catch { return null; }
};

const saveAuth = (data) => {
  if (data?.user) {
    localStorage.setItem('tf_user', JSON.stringify(data.user));
    localStorage.removeItem('jxp_user');
  }
};

const clearAuth = () => {
  localStorage.removeItem('tf_user');
  localStorage.removeItem('jxp_user');
};

const isLoggedIn = () => !!getUser();

/* core fetch */
let onUnauthorized = () => { window.location.href = '/login'; };
export const setOnUnauthorized = (fn) => { onUnauthorized = fn; };

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => { refreshSubscribers.push(cb); };
const onRefreshed = (accessToken) => { refreshSubscribers.map(cb => cb(accessToken)); refreshSubscribers = []; };

const request = async (method, path, body = null, isRetry = false) => {
  const headers = { 'Content-Type': 'application/json' };
  // Token is now sent automatically via httpOnly cookie


  const opts = { method, headers, credentials: 'include' };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(BASE + path, opts);

  if (res.status === 401 && !isRetry && path !== '/auth/login' && path !== '/auth/refresh') {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(BASE + '/auth/refresh', { method: 'POST', credentials: 'include' });
        const json = await refreshRes.json().catch(() => ({}));
        
        if (!refreshRes.ok) {
          throw new Error('Refresh failed');
        }
        
        isRefreshing = false;
        onRefreshed();
      } catch (err) {
        isRefreshing = false;
        clearAuth();
        onUnauthorized();
        throw new Error('Session expired');
      }
    }
    
    // Wait until refresh is done, then retry the request
    return new Promise((resolve) => {
      subscribeTokenRefresh(() => {
        resolve(request(method, path, body, true));
      });
    });
  }

  if (res.status === 401) {
    clearAuth();
    onUnauthorized();
    throw new Error('Session expired');
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
  signup:      (email, password)    => post('/auth/signup',  { email, password }),
  verify:      (token)              => post('/auth/verify',  { token }),
  login:       (email, password)    => post('/auth/login',   { email, password }),
  googleLogin: (idToken)            => post('/auth/google',  { idToken }),
  logout:      ()                   => post('/auth/logout'),
  forgotPw:    (email)              => post('/auth/forgot-password', { email }),
  resetPw:     (token, newPassword, confirmPassword) => post('/auth/reset-password',  { token, newPassword, confirmPassword }),
  changePw:    (oldPassword, newPw) => post('/auth/change-password', { oldPassword, newPassword: newPw }),
  verify2FA:   (tempToken, code)    => post('/auth/verify-2fa', { tempToken, code }),
  setup2FA:    ()                   => post('/auth/2fa/setup'),
  enable2FA:   (code)               => post('/auth/2fa/enable', { token: code }),
  disable2FA:  (password, code)     => post('/auth/2fa/disable', { password, token: code }),
};

/* Profile */
const profile = {
  me:           ()         => get('/profile/me'),
  update:       (data)     => put('/profile/me', data),
  user:         (userId)   => get(`/profile/${userId}`),
  public:       (userId)   => get(`/profile/public/${userId}`),
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch(BASE + '/profile/me/avatar', { method: 'POST', body: formData, credentials: 'include' });
    if (res.status === 401) { clearAuth(); onUnauthorized(); return; }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `Request failed (${res.status})`);
    return json?.data ?? json;
  },
};

/* Projects */
const PROJECTS_CACHE_KEY = 'projects_list';
const PROJECTS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const PROJECTS_STALE_TTL = 60 * 60 * 1000; // 1 hour - serve stale data while refreshing

const projects = {
  list:          ()             => {
    const cached = getCache(PROJECTS_CACHE_KEY);
    if (cached) {
      // Stale-while-revalidate: return cached data immediately, refresh in background
      get('/projects').then(res => {
        const data = res?.projects || [];
        setCache(PROJECTS_CACHE_KEY, data, PROJECTS_CACHE_TTL);
      }).catch(() => {});
      return Promise.resolve(cached);
    }
    return get('/projects').then(res => {
      const data = res?.projects || [];
      setCache(PROJECTS_CACHE_KEY, data, PROJECTS_CACHE_TTL);
      return data;
    });
  },
  explore:       (params = {})  => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') qs.set(k, v);
    });
    const q = qs.toString();
    return get(`/projects/explore${q ? `?${q}` : ''}`);
  },
  create:        (data)         => post('/projects', data).then((r) => { invalidateCachePrefix('projects'); return r; }),
  get:           (id)           => get(`/projects/${id}`),
  update:        (id, data)     => put(`/projects/${id}`, data).then((r) => { invalidateCachePrefix('projects'); return r; }),
  remove:        (id)           => del(`/projects/${id}`).then((r) => { invalidateCachePrefix('projects'); return r; }),
  members:       (id)           => get(`/projects/${id}/members`),
  removeMember:  (pid, uid)     => del(`/projects/${pid}/members/${uid}`).then((r) => { invalidateCachePrefix('projects'); return r; }),
  requestJoin:   (id, roleName) => post(`/projects/${id}/join`, { roleName }),
  joinRequests:  (id)           => get(`/projects/${id}/join-requests`),
  handleRequest: (pid, rid, action) => patch(`/projects/${pid}/join-requests/${rid}`, { action }),
  getProjectByInviteToken: (token) => get(`/projects/invite/${token}`),
  joinViaInvite: (token, roleName) => post(`/projects/invite/${token}/join`, { roleName }),
  like:          (id)           => post(`/projects/${id}/like`),
  bookmark:      (id)           => post(`/projects/${id}/bookmark`),
};

/* Tasks */
const TASKS_CACHE_KEY = 'tasks_dashboard';
const TASKS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const TASKS_STALE_TTL = 15 * 60 * 1000; // 15 minutes - serve stale data while refreshing

const tasks = {
  list:     (projectId)       => get(`/tasks/${projectId}`).then((r) => { invalidateCachePrefix('tasks'); return r; }),
  board:    (projectId)       => get(`/tasks/${projectId}/board`),
  dashboardOverview: ({ force = false } = {})       => {
    const cached = force ? null : getCache(TASKS_CACHE_KEY);
    if (cached) {
      // Stale-while-revalidate: return cached data immediately, refresh in background
      get('/tasks/dashboard/overview').then((r) => {
        setCache(TASKS_CACHE_KEY, r, TASKS_CACHE_TTL);
      }).catch(() => {});
      return Promise.resolve(cached);
    }
    return get('/tasks/dashboard/overview').then((r) => {
      setCache(TASKS_CACHE_KEY, r, TASKS_CACHE_TTL);
      return r;
    });
  },
  create:   (projectId, data) => post(`/tasks/${projectId}`, data).then((r) => { invalidateCachePrefix('tasks'); return r; }),
  generate: (projectId)       => post(`/tasks/${projectId}/generate`).then((r) => { invalidateCachePrefix('tasks'); return r; }),
  get:      (taskId)          => get(`/tasks/task/${taskId}`),
  update:   (taskId, data)    => put(`/tasks/task/${taskId}`, data).then((r) => { invalidateCachePrefix('tasks'); return r; }),
  status:   (taskId, status)  => patch(`/tasks/task/${taskId}/status`, { status }).then((r) => { invalidateCachePrefix('tasks'); return r; }),
  remove:   (taskId)          => del(`/tasks/task/${taskId}`).then((r) => { invalidateCachePrefix('tasks'); return r; }),
  comments: (taskId)          => get(`/tasks/task/${taskId}/comments`),
  addComment:(taskId, text)   => post(`/tasks/task/${taskId}/comments`, { text }),
  subtasks: (taskId)          => get(`/tasks/task/${taskId}/subtasks`),
  uploadAttachment: async (taskId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(BASE + `/tasks/task/${taskId}/attachment`, {
      method: 'POST',
      credentials: 'include',
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
  send:          (receiverId, content) => post('/dms', { receiverId, content }),
  conversations: ()                     => get('/dms/conversations').then(res => res?.conversations || []),
  unreadCount:   ()                     => get('/dms/conversations').then(res => res?.unreadTotal || 0),
  search:        (q)                    => get(`/dms/search?q=${encodeURIComponent(q)}`),
  messages:      (userId)               => get(`/dms/${userId}`).then(res => res?.messages || []),
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
    const res = await fetch(BASE + '/portfolio/export/markdown', {
      credentials: 'include',
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
const GOALS_CACHE_KEY = 'goals_list';
const GOALS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const GOALS_STALE_TTL = 15 * 60 * 1000; // 15 minutes - serve stale data while refreshing

const goals = {
  list:         () => {
    const cached = getCache(GOALS_CACHE_KEY);
    if (cached) {
      // Stale-while-revalidate: return cached data immediately, refresh in background
      get('/goals').then((r) => {
        const data = r?.goals || [];
        setCache(GOALS_CACHE_KEY, data, GOALS_CACHE_TTL);
      }).catch(() => {});
      return Promise.resolve(cached);
    }
    return get('/goals').then((r) => {
      const data = r?.goals || [];
      setCache(GOALS_CACHE_KEY, data, GOALS_CACHE_TTL);
      return data;
    });
  },
  create:       (data) => post('/goals', data).then((r) => { invalidateCachePrefix('goals'); return r; }),
  update:       (id, data) => patch(`/goals/${id}`, data).then((r) => { invalidateCachePrefix('goals'); return r; }),
  remove:       (id) => del(`/goals/${id}`).then((r) => { invalidateCachePrefix('goals'); return r; }),
  importLocal:  (goalsList) => post('/goals/import-local', { goals: goalsList }).then((r) => { invalidateCachePrefix('goals'); return r; }),
};

/* AI */
const ai = {
  usage: () => get('/ai/usage'),
  chat: (projectId, message, history) => post('/ai/chat', { projectId, message, history }),
  analyzeProject: (projectId) => post(`/projects/${projectId}/ai-analysis`),
  generateTaskInstructions: (taskId) => post(`/tasks/task/${taskId}/ai-instructions`),
};

/* Admin */
const admin = {
  stats:         () => get('/admin/stats'),
  users:         () => get('/admin/users'),
  toggleBan:     (id) => put(`/admin/users/${id}/ban`),
  deleteUser:    (id) => del(`/admin/users/${id}`),
  projects:      () => get('/admin/projects'),
  deleteProject: (id) => del(`/admin/projects/${id}`),
};

/* Team Features */
const teamFeatures = {
  // Polls
  createPoll: (projectId, data) => post(`/team-features/${projectId}/polls`, data),
  getPolls: (projectId) => get(`/team-features/${projectId}/polls`),
  votePoll: (projectId, pollId, optionId) => post(`/team-features/${projectId}/polls/${pollId}/vote`, { optionId }),

  // Suggestions
  createSuggestion: (projectId, data) => post(`/team-features/${projectId}/suggestions`, data),
  getSuggestions: (projectId) => get(`/team-features/${projectId}/suggestions`),
  voteSuggestion: (projectId, suggestionId, type) => patch(`/team-features/${projectId}/suggestions/${suggestionId}/vote`, { type }),
  updateSuggestionStatus: (projectId, suggestionId, status) => patch(`/team-features/${projectId}/suggestions/${suggestionId}/status`, { status }),

  // Decisions
  createDecision: (projectId, data) => post(`/team-features/${projectId}/decisions`, data),
  getDecisions: (projectId) => get(`/team-features/${projectId}/decisions`),

  // Instructions
  createInstruction: (projectId, data) => post(`/team-features/${projectId}/instructions`, data),
  getInstructions: (projectId) => get(`/team-features/${projectId}/instructions`),

  // Notes
  createNote: (data) => post('/team-features/notes', data),
  getNotes: (projectId) => get(`/team-features/notes${projectId ? `?projectId=${projectId}` : ''}`),
  deleteNote: (noteId) => del(`/team-features/notes/${noteId}`),
};

const API = {
  getToken, getUser, saveAuth, clearAuth, isLoggedIn,
  auth, profile, projects, tasks, dms, office, notifications, time,
  analytics, portfolio, submissions, goals, ai, admin, teamFeatures
};

export default API;
