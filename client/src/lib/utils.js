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
