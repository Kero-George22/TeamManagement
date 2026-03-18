import React from 'react';

const STATUS_MAP = {
  todo:         'status-todo',
  'in-progress':'status-in-progress',
  review:       'status-review',
  done:         'status-done',
  active:       'status-active',
  paused:       'status-paused',
  completed:    'status-completed',
  cancelled:    'status-cancelled',
};

export default function StatusBadge({ status }) {
  const cls = STATUS_MAP[status?.toLowerCase()] || 'status-todo';
  return (
    <span className={`status-badge ${cls}`}>
      {status || 'unknown'}
    </span>
  );
}
