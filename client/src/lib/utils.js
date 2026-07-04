export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function daysLeft(startDate, durationDays) {
  if (!startDate || !durationDays) return '—';
  const end = new Date(startDate);
  end.setDate(end.getDate() + durationDays);
  const diff = Math.ceil((end - Date.now()) / 86400000);
  return diff > 0 ? `${diff} Days Left` : 'Overdue';
}

export function projectProgress(startDate, durationDays) {
  if (!startDate || !durationDays) return 0;
  const start = new Date(startDate).getTime();
  const end   = start + durationDays * 86400000;
  const now   = Date.now();
  if (now <= start) return 0;
  if (now >= end)   return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

export const CATEGORY_COLORS = {
  'Software Development': '#3b82f6',
  'Web Development': '#06b6d4',
  'Mobile Development': '#8b5cf6',
  'Data Science & AI': '#10b981',
  'DevOps & Cloud': '#f97316',
  'Cybersecurity': '#ef4444',
  'Blockchain': '#f59e0b',
  'IoT & Hardware': '#64748b',
  'Game Development': '#ec4899',
  'UI/UX Design': '#dc2626',
  'Business & Marketing': '#eab308',
  'Finance & Accounting': '#84cc16',
  'Engineering': '#14b8a6',
  'Education & Training': '#6366f1',
  'Healthcare': '#f43f5e',
  'E-commerce': '#0ea5e9',
  'Social Impact': '#22c55e',
  'Research & Development': '#8b5cf6',
  'Other': '#94a3b8',
};

export function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || '#94a3b8';
}
