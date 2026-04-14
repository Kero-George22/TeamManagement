import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from './Avatar';
import Badge from './Badge';
import { fmtDate } from '../../lib/utils';
import API from '../../lib/api';
import { useToast } from '../../lib/toast';

const PCOL = { Low: 'green', Medium: 'yellow', High: 'pink' };
const SCOL = { Todo: 'gray', 'In-Progress': 'blue', Review: 'yellow', Done: 'green', Approved: 'purple' };
const PDOT = { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444' };

export default function TaskSidePanel({ task, onClose, isOwner, isMember, userId, projectId, onTaskUpdate }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [subtasks, setSubtasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');

  // Fetch related data
  useEffect(() => {
    if (task?._id) {
      API.tasks.subtasks(task._id).then(res => setSubtasks(res || [])).catch(() => {});
      API.tasks.comments(task._id).then(res => setComments(res || [])).catch(() => {});
    }
  }, [task?._id]);

  if (!task) return null;

  const isAssignee = (task.assignedTo?._id || task.assignedTo) === userId;

  async function changeStatus(newStatus) {
    setLoading(true);
    const oldStatus = task.status;
    // Optimistic update
    onTaskUpdate?.({ ...task, status: newStatus });
    try {
      await API.tasks.update(task._id, { status: newStatus });
      toast.success(`Status → "${newStatus}"`);
    } catch (e) {
      toast.error(e.message);
      onTaskUpdate?.({ ...task, status: oldStatus });
    } finally {
      setLoading(false);
    }
  }

  function renderStatusAction() {
    const s = task.status;

    // Owner actions on Done tasks
    if (isOwner && s === 'Done') {
      return (
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn--green" disabled={loading} onClick={() => changeStatus('Approved')} style={{ flex: 1 }}>
            <i className="fa-solid fa-check-double" /> Approve Task
          </button>
          <button className="btn btn--outline" disabled={loading} onClick={() => changeStatus('In-Progress')} style={{ flex: 1 }}>
            <i className="fa-solid fa-rotate-left" /> Send Back
          </button>
        </div>
      );
    }

    // Assignee actions
    if (isAssignee) {
      if (s === 'Todo') return <button className="btn btn--primary" disabled={loading} onClick={() => changeStatus('In-Progress')} style={{ width: '100%' }}><i className="fa-solid fa-play" /> Start Task</button>;
      if (s === 'In-Progress') return <button className="btn btn--green" disabled={loading} onClick={() => changeStatus('Done')} style={{ width: '100%' }}><i className="fa-solid fa-check" /> Mark as Done</button>;
      if (s === 'Done') return <button className="btn btn--ghost" disabled style={{ width: '100%', opacity: 0.6 }}><i className="fa-solid fa-hourglass-half" /> Waiting for Approval</button>;
    }

    if (s === 'Approved') return <div style={{ textAlign: 'center', color: 'var(--green)', fontWeight: 600, padding: 10 }}><i className="fa-solid fa-circle-check" /> Task Approved</div>;
    return null;
  }

  async function handleAddComment(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!commentText.trim()) return;
      try {
        const updatedComments = await API.tasks.addComment(task._id, commentText);
        setComments(updatedComments);
        setCommentText('');
        toast.success('Comment added');
      } catch (err) { toast.error(err.message); }
    }
  }

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <aside className="task-panel">
        {/* Header */}
        <div className="task-panel__header">
          <button className="icon-btn" onClick={onClose} aria-label="Close"><i className="fa-solid fa-xmark" /></button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="icon-btn" onClick={() => { onClose(); navigate(`/app/task/${task._id}?project=${projectId || task.project}`); }} aria-label="Open full page"><i className="fa-solid fa-up-right-and-down-left-from-center" /></button>
          </div>
        </div>

        {/* Title */}
        <div className="task-panel__title-area">
          <div className={`task-circle ${task.status === 'Done' || task.status === 'Approved' ? 'task-circle--done' : ''}`}>
            {(task.status === 'Done' || task.status === 'Approved') && <i className="fa-solid fa-check" />}
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 4 }}>{task.title}</h2>
            <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
              {task.status === 'Done' || task.status === 'Approved' ? 'Completed' : 'Click to mark complete'}
            </span>
          </div>
        </div>

        <div className="task-panel__divider" />

        {/* Meta Fields */}
        <div className="task-panel__fields">
          <div className="task-panel__field">
            <span className="task-panel__label">Assignee</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {task.assignedTo ? <><Avatar user={task.assignedTo} size="sm" /> <span style={{ fontWeight: 500, fontSize: '.875rem' }}>{task.assignedTo?.username || task.assignedTo?.email?.split('@')[0] || 'User'}</span></> : <span style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>Unassigned</span>}
            </div>
          </div>
          <div className="task-panel__field">
            <span className="task-panel__label">Due date</span>
            <span style={{ fontWeight: 500, fontSize: '.875rem', color: task.deadline && new Date(task.deadline) < new Date() ? '#ef4444' : 'inherit' }}>{task.deadline ? fmtDate(task.deadline) : 'No deadline'}</span>
          </div>
          <div className="task-panel__field">
            <span className="task-panel__label">Priority</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: PDOT[task.priority] || '#9ca3af' }} />
              <span style={{ fontWeight: 500, fontSize: '.875rem' }}>{task.priority}</span>
            </div>
          </div>
          <div className="task-panel__field">
            <span className="task-panel__label">Status</span>
            <Badge variant={SCOL[task.status]}>{task.status}</Badge>
          </div>
          <div className="task-panel__field">
            <span className="task-panel__label">Role</span>
            <span className="chip">{task.assignedRole}</span>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <>
            <div className="task-panel__divider" />
            <div className="task-panel__section">
              <h4 className="task-panel__section-title">Description</h4>
              <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{task.description}</p>
            </div>
          </>
        )}

        {/* AI Instructions */}
        {task.aiInstructions && (
          <>
            <div className="task-panel__divider" />
            <div className="task-panel__section">
              <h4 className="task-panel__section-title"><i className="fa-solid fa-robot" style={{ color: 'var(--green)', marginRight: 6 }} />AI Instructions</h4>
              <div style={{ background: 'var(--green-bg)', borderLeft: '4px solid var(--green)', borderRadius: 10, padding: 14, fontSize: '.82rem', lineHeight: 1.6 }}>{task.aiInstructions}</div>
            </div>
          </>
        )}

        {/* Subtasks */}
        {subtasks.length > 0 && (
          <>
             <div className="task-panel__divider" />
             <div className="task-panel__section">
                <h4 className="task-panel__section-title"><i className="fa-solid fa-code-branch" style={{ marginRight: 6 }} />Subtasks</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {subtasks.map(s => (
                    <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', padding: '6px 10px', background: '#f8fafc', borderRadius: 8 }}>
                       <div className={`task-circle ${s.status === 'Done' || s.status === 'Approved' ? 'task-circle--done' : ''}`} style={{ width: 14, height: 14 }}>
                         {(s.status === 'Done' || s.status === 'Approved') && <i className="fa-solid fa-check" style={{ fontSize: '.4rem' }} />}
                       </div>
                       <span style={{ flex: 1, fontWeight: 500 }}>{s.title}</span>
                       <Badge variant={SCOL[s.status]} style={{ fontSize: '.6rem' }}>{s.status}</Badge>
                    </div>
                  ))}
                </div>
             </div>
          </>
        )}

        {/* Comments / Activity Feed */}
        <div className="task-panel__divider" />
        <div className="task-panel__section">
           <h4 className="task-panel__section-title"><i className="fa-solid fa-comment" style={{ marginRight: 6 }} />Activity</h4>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14, maxHeight: 200, overflowY: 'auto' }}>
             {comments.length === 0 ? (
               <div style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>No comments yet.</div>
             ) : (
               comments.map(c => (
                 <div key={c._id} style={{ display: 'flex', gap: 10 }}>
                   <Avatar user={c.user} size="sm" />
                   <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 12, flex: 1 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                       <span style={{ fontSize: '.8rem', fontWeight: 600 }}>{c.user?.username || c.user?.email || 'User'}</span>
                       <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>{fmtDate(c.postedAt)}</span>
                     </div>
                     <p style={{ fontSize: '.85rem', margin: 0, color: 'var(--text-primary)' }}>{c.text}</p>
                   </div>
                 </div>
               ))
             )}
           </div>

           <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
             <Avatar user={{ username: 'Me' }} size="sm" />
             <textarea 
               className="form-input" 
               style={{ flex: 1, minHeight: 40, fontSize: '.85rem', padding: '8px 12px' }} 
               placeholder="Write a comment... (Press Enter to post)"
               value={commentText}
               onChange={e => setCommentText(e.target.value)}
               onKeyDown={handleAddComment}
             />
           </div>
        </div>

        {/* Status Action */}
        <div style={{ marginTop: 'auto', padding: '20px 0 0' }}>
          {renderStatusAction()}
        </div>
      </aside>
    </>
  );
}
