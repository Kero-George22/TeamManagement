// Shared utility functions

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)   return 'just now';
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 30)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function statusClass(s) {
  return (s || '').toLowerCase().replace(/\s+/g, '-');
}

export function priorityColor(p) {
  const m = { high:'var(--red)', medium:'var(--gold)', low:'var(--green)' };
  return m[(p || '').toLowerCase()] || 'var(--text-2)';
}

export function levelColor(level) {
  const m = { Expert:'var(--gold)', Advanced:'var(--cyan)', Intermediate:'var(--purple)', Beginner:'var(--red)' };
  return m[level] || 'var(--text-2)';
}

export function levelPct(level) {
  const m = { Expert:100, Advanced:75, Intermediate:50, Beginner:25 };
  return m[level] || 0;
}

export function gradeFromScore(score) {
  if (score >= 95) return 'S';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function levelFromScore(score) {
  if (score >= 85) return 'Expert';
  if (score >= 70) return 'Advanced';
  if (score >= 50) return 'Intermediate';
  return 'Beginner';
}

export function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
