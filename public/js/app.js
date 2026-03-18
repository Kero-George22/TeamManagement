/* ============================================================
   JOBXP — AUTH & SHARED UI UTILITIES
   Every page imports this after api.js
============================================================ */

/* ---- Auth helpers ---- */
const Auth = {
  save(token, user) {
    localStorage.setItem('jxp_token', token);
    localStorage.setItem('jxp_user', JSON.stringify(user));
  },
  token()  { return localStorage.getItem('jxp_token'); },
  user()   { return JSON.parse(localStorage.getItem('jxp_user') || 'null'); },
  clear()  { localStorage.removeItem('jxp_token'); localStorage.removeItem('jxp_user'); },
  isLoggedIn() { return !!this.token(); },

  require() {
    if (!this.isLoggedIn()) { window.location.href = '/login.html'; return false; }
    return true;
  },
  redirectIfLoggedIn() {
    if (this.isLoggedIn()) { window.location.href = '/dashboard.html'; }
  },

  async logout() {
    try { await API.post('/auth/logout'); } catch (_) {}
    this.clear();
    window.location.href = '/login.html';
  }
};

/* ---- Toast notifications ---- */
const Toast = (() => {
  let container;
  function ensure() {
    if (!container) {
      container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
      }
    }
  }
  function show(msg, type = 'info', duration = 3500) {
    ensure();
    const icons = { success:'✓', error:'✕', info:'◈' };
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span class="toast-icon">${icons[type]||'◈'}</span><span>${msg}</span>`;
    container.appendChild(t);
    setTimeout(() => {
      t.classList.add('fade-out');
      setTimeout(() => t.remove(), 320);
    }, duration);
  }
  return {
    success: (m, d) => show(m, 'success', d),
    error:   (m, d) => show(m, 'error',   d),
    info:    (m, d) => show(m, 'info',    d),
  };
})();

/* ---- Top nav injection ---- */
function injectNav(activePage = '') {
  const user = Auth.user();
  if (!user) return;

  const links = [
    { href: '/dashboard.html',  label: 'Dashboard' },
    { href: '/projects.html',   label: 'Projects' },
    { href: '/leaderboard.html',label: 'Ranks' },
    { href: '/assessment.html', label: 'Assess' },
    { href: '/portfolio.html',  label: 'Portfolio' },
    { href: '/office.html',     label: 'Office' },
  ];

  const linksHTML = links.map(l =>
    `<a href="${l.href}" class="tn-link ${activePage === l.label ? 'active' : ''}">${l.label}</a>`
  ).join('');

  const xpPct = Math.round(((user.totalXP || 0) % 1000) / 10);

  const nav = document.createElement('nav');
  nav.className = 'topnav';
  nav.id = 'topnav';
  nav.innerHTML = `
    <a href="/dashboard.html" class="tn-logo">
      <div class="tn-hex">XP</div>
      <span class="tn-brand">JOB<b>XP</b></span>
    </a>
    <div class="tn-center">${linksHTML}</div>
    <div class="tn-right">
      <div class="tn-xp">
        <span>XP</span>
        <span class="tn-xp-val">${(user.totalXP || 0).toLocaleString()}</span>
      </div>
      <div class="tn-lvl">LVL ${user.level || 1}</div>
      <div class="tn-avatar" id="tn-avatar-btn">${user.avatar || '👤'}
        <div class="tn-dropdown" id="tn-dropdown">
          <a href="/profile.html">⚙ Profile</a>
          <a href="/portfolio.html">📋 Portfolio</a>
          <a href="/assessment.html">🎯 Assessment</a>
          <div class="tn-dropdown-sep"></div>
          <a href="#" id="tn-logout-btn">⏻ Logout</a>
        </div>
      </div>
      <button class="tn-mobile-toggle" id="tn-mobile-btn">☰</button>
    </div>
  `;
  document.body.prepend(nav);

  /* Mobile overlay */
  const overlay = document.createElement('div');
  overlay.className = 'mobile-nav-overlay';
  overlay.id = 'mobile-nav';
  overlay.innerHTML = links.map(l => `<a href="${l.href}">${l.label}</a>`).join('')
    + '<a href="/profile.html">Profile</a>'
    + '<a href="#" id="mobile-logout">Logout</a>';
  document.body.appendChild(overlay);

  /* Toast container */
  if (!document.getElementById('toast-container')) {
    const tc = document.createElement('div');
    tc.id = 'toast-container';
    document.body.appendChild(tc);
  }

  /* Events */
  document.getElementById('tn-avatar-btn').addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('tn-dropdown').classList.toggle('open');
  });
  document.addEventListener('click', () => document.getElementById('tn-dropdown')?.classList.remove('open'));

  document.getElementById('tn-logout-btn').addEventListener('click', e => {
    e.preventDefault(); Auth.logout();
  });
  document.getElementById('tn-mobile-btn').addEventListener('click', () => {
    document.getElementById('mobile-nav').classList.toggle('open');
  });
  document.getElementById('mobile-logout')?.addEventListener('click', e => {
    e.preventDefault(); Auth.logout();
  });

  /* Refresh user data in background */
  API.get('/profile/me').then(data => {
    const u = data.user || data;
    const storedUser = { ...Auth.user(), ...u };
    localStorage.setItem('jxp_user', JSON.stringify(storedUser));
  }).catch(() => {});
}

/* ---- XP bar auto-init ---- */
function initXpBars() {
  document.querySelectorAll('.xp-fill[data-w]').forEach(el => {
    el.style.setProperty('--w', el.dataset.w + '%');
  });
}
document.addEventListener('DOMContentLoaded', initXpBars);

/* ---- Score ring ---- */
function setScoreRing(el, score) {
  if (!el) return;
  el.style.setProperty('--pct', score + '%');
  const val = el.querySelector('.score-ring-val');
  if (val) val.textContent = score;
  const color = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--gold)' : 'var(--red)';
  el.style.background = `conic-gradient(${color} ${score}%, rgba(255,255,255,0.04) 0%)`;
  if (val) val.style.color = color;
}

/* ---- Skill label helper ---- */
function skillLabel(area, data) {
  if (!data || !data[area]) return 'Not Assessed';
  return data[area].level || 'Not Assessed';
}

/* ---- Status class helper ---- */
function statusClass(s) {
  const map = {
    'Todo': 'status-todo', 'In-Progress': 'status-inprogress',
    'Review': 'status-review', 'Done': 'status-done',
    'active': 'status-active', 'completed': 'status-completed',
    'paused': 'status-paused'
  };
  return map[s] || 'status-todo';
}

/* ---- Priority class helper ---- */
function priorityClass(p) {
  return p === 'High' ? 'high' : p === 'Medium' ? 'medium' : 'low';
}

/* ---- Relative time ---- */
function timeAgo(date) {
  const d = new Date(date), now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  return Math.floor(diff/86400) + 'd ago';
}

/* ---- URL param helper ---- */
function qp(name) { return new URLSearchParams(window.location.search).get(name); }

/* ---- Modal helpers ---- */
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
document.addEventListener('click', e => {
  if (e.target.matches('[data-modal-close]')) closeModal(e.target.dataset.modalClose);
  if (e.target.matches('.modal-overlay')) closeModal(e.target.id);
});
