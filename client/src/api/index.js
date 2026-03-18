// Centralised API client — injects JWT automatically
const BASE = '';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  const token = localStorage.getItem('jxp_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 401 → clear auth and reload to login
  if (res.status === 401) {
    localStorage.removeItem('jxp_token');
    localStorage.removeItem('jxp_user');
    window.location.href = '/login';
    throw new ApiError('Unauthorized', 401);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      data.message || data.error || `Request failed (${res.status})`,
      res.status
    );
  }

  // Unwrap standard API envelope: { success, message, data: <payload> }
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return data.data;
  }
  return data;
}

const api = {
  get:    (path)         => request('GET',    path),
  post:   (path, body)   => request('POST',   path, body),
  put:    (path, body)   => request('PUT',    path, body),
  delete: (path)         => request('DELETE', path),
  patch:  (path, body)   => request('PATCH',  path, body),

  // Raw fetch with blob output (for file downloads)
  download: async (path) => {
    const token = localStorage.getItem('jxp_token');
    const res = await fetch(BASE + path, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(data.message || 'Download failed', res.status);
    }
    return res.blob();
  },
};

export default api;

// Auth helpers
export const Auth = {
  save(token, user) {
    localStorage.setItem('jxp_token', token);
    localStorage.setItem('jxp_user', JSON.stringify(user));
  },
  token: () => localStorage.getItem('jxp_token'),
  user:  () => {
    try { return JSON.parse(localStorage.getItem('jxp_user') || 'null'); }
    catch { return null; }
  },
  clear() {
    localStorage.removeItem('jxp_token');
    localStorage.removeItem('jxp_user');
  },
  isLoggedIn: () => !!localStorage.getItem('jxp_token'),
  updateUser(patch) {
    const u = Auth.user();
    if (u) localStorage.setItem('jxp_user', JSON.stringify({ ...u, ...patch }));
  },
};
