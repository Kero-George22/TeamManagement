import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../lib/toast';
import API from '../lib/api';
import Topbar from '../components/layout/Topbar';
import Badge from '../components/ui/Badge';
import { fmtDate } from '../lib/utils';

const PCOL = { Low: 'green', Medium: 'blue', High: 'pink' };
const SCOL = { 'Recently assigned': 'gray', 'Do today': 'blue', 'Do next week': 'yellow', 'Do later': 'orange', 'Approved': 'purple', 'Todo': 'gray', 'In-Progress': 'blue', 'Review': 'yellow', 'Done': 'green' };

export default function TaskPage() {
  const { id: taskId } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const projectId = params.get('project');
  const { user } = useAuth();
  const toast = useToast();
  const [task, setTask] = useState(null);
  const [subType, setSubType] = useState('text');
  const [uploading, setUploading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    (async () => {
      try { const t = await API.tasks.get(taskId); setTask(t); setSubType(t.submissionType || 'text'); } catch { toast.error('Failed to load task'); }
    })();
  }, [taskId]);

  const isAssigned = task && Array.isArray(task.assignedTo) && task.assignedTo.some(u => (u._id || u) === user?._id);
  const isUnassigned = task && (!task.assignedTo || task.assignedTo.length === 0);
  const canEdit = isAssigned || isUnassigned;

  async function updateStatus(status) {
    try { await API.tasks.status(taskId, status); setTask({ ...task, status }); toast.success(`Status → "${status}"`); } catch (e) { toast.error(e.message); }
  }

  async function submitWork() {
    const payload = {
      taskId,
      submissionType: subType,
    };
    if (subType === 'text') payload.submittedWork = document.getElementById('sub-text')?.value.trim();
    else payload.repoLink = document.getElementById('sub-link')?.value.trim();
    if (task.attachments) payload.attachments = task.attachments;
    try {
      const sub = await API.submissions.create(payload);
      setTask({ ...task, status: 'Review', ...(sub || {}) });
      toast.success('Work submitted for review!');
    } catch (e) { toast.error(e.message); }
  }

  async function handleAttachmentUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await API.tasks.uploadAttachment(taskId, file);
      setTask({ ...task, attachments: res?.data?.attachments || [] });
      toast.success('File uploaded!');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleAttachmentDeleteClick(attachmentId) {
    setConfirmDeleteId(attachmentId);
  }

  async function confirmAttachmentDelete() {
    if (!confirmDeleteId) return;
    const attachmentId = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      const res = await API.tasks.removeAttachment(taskId, attachmentId);
      setTask({ ...task, attachments: res?.attachments || [] });
      toast.success('Attachment removed');
    } catch (err) {
      toast.error(err.message || 'Failed to remove attachment');
    }
  }

  function getFileIcon(type) {
    if (!type) return 'fa-file';
    if (type.startsWith('image/')) return 'fa-file-image';
    if (type.includes('pdf')) return 'fa-file-pdf';
    if (type.includes('zip') || type.includes('compressed')) return 'fa-file-zipper';
    if (type.includes('text') || type.includes('json')) return 'fa-file-code';
    if (type.includes('word')) return 'fa-file-word';
    return 'fa-file';
  }

  function formatSize(bytes) {
    if (!bytes) return 'Unknown size';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  if (!task) return <><Topbar title="Task" /><div className="skeleton" style={{ height: 100, borderRadius: 'var(--card-radius)' }} /></>;

  return (
    <>
      <Topbar title={task.title} />

      {/* Header */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Badge variant={SCOL[task.status]}>{task.status}</Badge>
              <Badge variant={PCOL[task.priority]}>{task.priority} Priority</Badge>
              <span className="chip"><i className="fa-solid fa-person" /> {task.assignedRole}</span>
            </div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 6 }}>{task.title}</h1>
            <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)' }}>{task.description}</p>
          </div>
          {projectId && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => navigate(`/app/project/${projectId}`, { state: { from: location.pathname + location.search } })}
            >
              <i className="fa-solid fa-arrow-left" /> Back to Project
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {task.aiInstructions && (
            <div className="card">
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><i className="fa-solid fa-robot" style={{ color: 'var(--green)' }} /> AI Instructions</h3>
              <div style={{ background: 'var(--green-bg)', borderLeft: '4px solid var(--green)', borderRadius: 12, padding: 16, fontSize: '.875rem', color: '#166534', lineHeight: 1.6 }}>{task.aiInstructions}</div>
            </div>
          )}

          {canEdit && (
            <div className="card">
              <h3 className="section-title">Update Status</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <select value={task.status} onChange={e => updateStatus(e.target.value)}
                  style={{ appearance: 'none', padding: '7px 14px', borderRadius: 99, border: '1.5px solid var(--border)', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer', background: 'var(--white)', fontFamily: 'inherit' }}>
                  {['Todo', 'In-Progress', 'Review', 'Done', 'Approved'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          {canEdit && (
            <div className="card">
              <h3 className="section-title">Submit Work</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Submission Type</label>
                  <select className="form-input" value={subType} onChange={e => setSubType(e.target.value)} style={{ maxWidth: 200 }}>
                    <option value="text">Text / Notes</option>
                    <option value="link">Link (GitHub / URL)</option>
                  </select>
                </div>
                {subType === 'text'
                  ? <div className="form-group"><label className="form-label">Your Work</label><textarea id="sub-text" className="form-input" rows={5} placeholder="Describe what you built…" defaultValue={task.submittedWork || ''} /></div>
                  : <div className="form-group"><label className="form-label">Repository / Resource Link</label><input id="sub-link" className="form-input" type="url" placeholder="https://github.com/…" defaultValue={task.repoLink || ''} /></div>
                }
                <button className="btn btn--primary" onClick={submitWork} style={{ alignSelf: 'flex-start' }}><i className="fa-solid fa-upload" /> Submit</button>
              </div>
            </div>
          )}

          {canEdit && (
            <div className="card">
              <h3 className="section-title">Attachments</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                
                {task.attachments && task.attachments.length > 0 && (
                  <div className="attachment-list">
                    {task.attachments.map(att => (
                      <div key={att._id} className="attachment-item">
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="attachment-info" style={{ textDecoration: 'none', flex: 1 }}>
                          <i className={`fa-solid ${getFileIcon(att.type)} attachment-icon`} />
                          <div className="attachment-details">
                            <span className="attachment-name" title={att.name}>{att.name}</span>
                            <span className="attachment-size">{formatSize(att.size)}</span>
                          </div>
                        </a>
                        <button className="attachment-delete" onClick={() => handleAttachmentDeleteClick(att._id)} title="Remove file">
                          <i className="fa-solid fa-xmark" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {(task.attachments || []).length < 5 ? (
                  <label className="btn btn--secondary" style={{ cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1, alignSelf: 'flex-start' }}>
                    <i className="fa-solid fa-paperclip" /> {uploading ? 'Uploading...' : `Upload File (${(task.attachments || []).length}/5)`}
                    <input type="file" onChange={handleAttachmentUpload} disabled={uploading} style={{ display: 'none' }} />
                  </label>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Maximum of 5 attachments reached.</div>
                )}
              </div>
            </div>
          )}

          {task.aiReview && (
            <div className="card">
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><i className="fa-solid fa-star" style={{ color: 'var(--yellow)' }} /> AI Review</h3>
              <div style={{ background: 'var(--blue-bg)', borderLeft: '4px solid var(--blue)', borderRadius: 12, padding: 16, fontSize: '.875rem', color: '#1e3a8a', lineHeight: 1.6 }}>{task.aiReview}</div>
              {task.aiRating !== undefined && <div style={{ marginTop: 12, fontSize: '.875rem', color: 'var(--text-secondary)' }}>Rating: <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{task.aiRating}/100</strong></div>}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <h3 className="section-title">Task Details</h3>
            {[['Status', <Badge variant={SCOL[task.status]}>{task.status}</Badge>],
              ['Priority', <Badge variant={PCOL[task.priority]}>{task.priority}</Badge>],
              ['Role', task.assignedRole],
              ['Deadline', task.deadline ? fmtDate(task.deadline) : 'No deadline'],
              ['Assigned To', Array.isArray(task.assignedTo) && task.assignedTo.length > 0 ? task.assignedTo.map(u => u.username || u.email?.split('@')[0]).join(', ') : 'Unassigned'],
              ['Created', fmtDate(task.createdAt)],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
                <span style={{ fontWeight: 600, fontSize: '.9rem' }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Custom Fields */}
          {task.customFields && Object.keys(task.customFields).length > 0 && (
            <div className="card">
              <h3 className="section-title"><i className="fa-solid fa-tags" style={{ marginRight: 8 }} />Custom Fields</h3>
              {Object.entries(task.customFields).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{key}</span>
                  {canEdit ? (
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '2px 8px', fontSize: '.85rem', maxWidth: 140, textAlign: 'right' }}
                      defaultValue={String(val || '')}
                      onBlur={async (e) => {
                        const newFields = { ...task.customFields, [key]: e.target.value };
                        try {
                          await API.tasks.update(taskId, { customFields: newFields });
                          setTask({ ...task, customFields: newFields });
                        } catch (err) { toast.error(err.message); }
                      }}
                    />
                  ) : (
                    <span style={{ fontWeight: 600, fontSize: '.9rem' }}>{String(val || '—')}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {projectId && <a href={`/app/office/${projectId}`} className="btn btn--ghost" style={{ width: '100%' }}><i className="fa-solid fa-comments" /> Project Office</a>}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="modal-overlay open" onClick={() => setConfirmDeleteId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal__header">
              <h2 className="modal__title">Confirm Deletion</h2>
              <button className="modal__close" onClick={() => setConfirmDeleteId(null)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div style={{ padding: '20px 24px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Are you sure you want to remove this attachment? This action cannot be undone.
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn--secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button className="btn btn--danger" style={{ background: 'var(--red)', color: 'white' }} onClick={confirmAttachmentDelete}>
                <i className="fa-solid fa-trash" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
