/* ============================================================
   JOBXP — API UTILITY
   Centralised fetch wrapper. All pages import this.
============================================================ */
const API = (() => {
  const BASE = '';

  function token() { return localStorage.getItem('jxp_token'); }

  async function request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const t = token();
    if (t) headers['Authorization'] = 'Bearer ' + t;

    const opts = { method, headers };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(BASE + path, opts);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { message: text }; }

    if (!res.ok) {
      const err = new Error(data.message || 'Request failed');
      err.status = res.status;
      err.data   = data;
      throw err;
    }
    return data;
  }

  return {
    get:    (path)        => request('GET',    path),
    post:   (path, body)  => request('POST',   path, body),
    put:    (path, body)  => request('PUT',    path, body),
    del:    (path)        => request('DELETE', path),
  };
})();
