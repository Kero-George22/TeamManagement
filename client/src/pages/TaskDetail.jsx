import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { SpinnerWrap } from '../components/Spinner.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ScoreRing from '../components/ScoreRing.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../api/index.js';
import { timeAgo, priorityColor, gradeFromScore } from '../utils.js';

export default function TaskDetail() {
  const { taskId } = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const toast      = useToast();

  const [task,        setTask]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [submitModal, setSubmitModal] = useState(false);
  const [submitNotes, setSubmitNotes] = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/tasks/task/' + taskId);
      setTask(data.task || data);
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  async function claimTask() {
    setSubmitting(true);
    try {
      await api.post('/tasks/' + taskId + '/claim');
      toast.success('Task claimed!');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally { setSubmitting(false); }
  }

  async function submitTask() {
    setSubmitting(true);
    try {
      await api.post('/submissions', { taskId, notes: submitNotes });
      toast.success('Submitted for review!');
      setSubmitModal(false);
      setSubmitNotes('');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally { setSubmitting(false); }
  }

  async function requestReview() {
    setSubmitting(true);
    try {
      await api.post('/tasks/' + taskId + '/request-review');
      toast.success('Review requested!');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally { setSubmitting(false); }
  }

  if (loading) return <Layout><SpinnerWrap /></Layout>;
  if (!task)   return <Layout><EmptyState icon="🔍" text="Task not found" /></Layout>;

  const isAssigned = task.assignedTo && (task.assignedTo._id || task.assignedTo) === user?._id;
  const canClaim   = task.status === 'todo' && !task.assignedTo;
  const canSubmit  = isAssigned && (task.status === 'in-progress');
  const canReview  = isAssigned && task.status === 'in-progress';

  const score  = task.aiReview?.score ?? null;
  const grade  = score !== null ? gradeFromScore(score) : null;

  return (
    <Layout>
      <div className="page-header" style={{ marginBottom:24 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
      </div>

      {/* Main card */}
      <div style={{
        background:'var(--bg-card)',
        border:`1px solid var(--${task.priority === 'critical' ? 'red,--red' : 'border'})`,
        padding:'28px 32px',
        marginBottom:24,
        position:'relative',
        overflow:'hidden'
      }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
          background:`linear-gradient(90deg, ${{
            'todo':'#666', 'in-progress':'var(--cyan)', 'review':'var(--gold)', 'done':'var(--green)'
          }[task.status] || '#666'} , transparent)` }} />

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16, marginBottom:20 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(14px,2.5vw,22px)', fontWeight:900, letterSpacing:3, marginBottom:8 }}>
              {task.title}
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
              <StatusBadge status={task.status} />
              {task.priority && (
                <span style={{ fontFamily:'var(--font-mono)', fontSize:10, padding:'3px 10px', border:`1px solid ${priorityColor(task.priority)}`, color: priorityColor(task.priority) }}>
                  {task.priority.toUpperCase()}
                </span>
              )}
              {(task.skillArea||task.area) && <span className="badge-chip purple">{task.skillArea||task.area}</span>}
            </div>
            <div style={{ display:'flex', gap:16, fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-2)', flexWrap:'wrap' }}>
              <span>⚡ {task.xpReward || 0} XP Reward</span>
              {task.deadline && <span>⏰ Due {timeAgo(task.deadline)}</span>}
              {task.assignedTo && <span>👤 {task.assignedTo.username || task.assignedTo.name || 'Assigned'}</span>}
              <span>📅 {timeAgo(task.createdAt)}</span>
            </div>
          </div>

          {/* Score ring for reviewed tasks */}
          {score !== null && (
            <div style={{ textAlign:'center' }}>
              <ScoreRing score={score} size={80} />
              {grade && (
                <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:900,
                  color:{S:'var(--gold)',A:'var(--cyan)',B:'var(--green)',C:'#fff',D:'#f90',F:'var(--red)'}[grade] || '#fff',
                  marginTop:4 }}>
                  {grade}
                </div>
              )}
              <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-3)', letterSpacing:1 }}>AI SCORE</div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {canClaim && (
            <button className="btn btn-cyan" disabled={submitting} onClick={claimTask}>
              ⚡ Claim Task
            </button>
          )}
          {canSubmit && (
            <button className="btn btn-gold" onClick={() => setSubmitModal(true)}>
              📤 Submit Work
            </button>
          )}
          {canReview && task.status !== 'review' && (
            <button className="btn btn-outline btn-sm" disabled={submitting} onClick={requestReview}>
              🔍 Request Review
            </button>
          )}
        </div>
      </div>

      {/* Description / AI instructions */}
      {(task.description || task.instructions) && (
        <div className="card" style={{ marginBottom:20 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:10, letterSpacing:3, color:'var(--cyan)', marginBottom:14 }}>TASK DESCRIPTION</div>
          <div style={{ color:'var(--text-2)', lineHeight:1.9, fontSize:14, whiteSpace:'pre-wrap' }}>
            {task.description || task.instructions}
          </div>
        </div>
      )}

      {/* AI Instructions block */}
      {task.aiInstructions && (
        <div style={{ background:'var(--cyan-dim)', border:'1px solid var(--cyan)', padding:'20px 24px', marginBottom:20 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:9, letterSpacing:3, color:'var(--cyan)', marginBottom:12 }}>
            🤖 AI INSTRUCTIONS
          </div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--text-1)', lineHeight:1.9, whiteSpace:'pre-wrap' }}>
            {task.aiInstructions}
          </div>
        </div>
      )}

      {/* AI Review feedback */}
      {task.aiReview && (
        <div style={{ background:'rgba(255,215,0,0.05)', border:'1px solid var(--gold)', padding:'20px 24px', marginBottom:20 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:9, letterSpacing:3, color:'var(--gold)', marginBottom:12 }}>
            ⭐ AI REVIEW FEEDBACK
          </div>
          {task.aiReview.feedback && (
            <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--text-1)', lineHeight:1.9, marginBottom:16, whiteSpace:'pre-wrap' }}>
              {task.aiReview.feedback}
            </div>
          )}
          {task.aiReview.suggestions && (
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:9, letterSpacing:2, color:'var(--cyan)', marginBottom:8 }}>SUGGESTIONS</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-2)', lineHeight:1.8, whiteSpace:'pre-wrap' }}>
                {task.aiReview.suggestions}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submissions list */}
      {task.submissions && task.submissions.length > 0 && (
        <div className="card">
          <div style={{ fontFamily:'var(--font-display)', fontSize:10, letterSpacing:3, color:'var(--text-2)', marginBottom:16 }}>SUBMISSIONS</div>
          {task.submissions.map((s, i) => (
            <div key={s._id || i} style={{ borderBottom:'1px solid var(--border)', padding:'12px 0', lastChild:{ borderBottom:'none' } }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, flexWrap:'wrap', gap:8 }}>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-2)' }}>Submission {i + 1}</span>
                <div style={{ display:'flex', gap:8 }}>
                  <StatusBadge status={s.status || 'pending'} />
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-3)' }}>{timeAgo(s.createdAt)}</span>
                </div>
              </div>
              {s.notes && <div style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.7 }}>{s.notes}</div>}
              {s.score !== undefined && s.score !== null && (
                <div style={{ fontFamily:'var(--font-display)', fontSize:12, color:'var(--gold)', marginTop:8 }}>
                  Score: {s.score}/100
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Submit modal */}
      <Modal isOpen={submitModal} onClose={() => setSubmitModal(false)} title="SUBMIT WORK"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setSubmitModal(false)}>Cancel</button>
            <button className="btn btn-gold" disabled={submitting} onClick={submitTask}>
              {submitting ? 'SUBMITTING…' : '📤 Submit'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Notes / Summary</label>
          <textarea className="form-textarea" rows={5} value={submitNotes}
            placeholder="Describe what you did, any blockers, notes for reviewer…"
            onChange={e => setSubmitNotes(e.target.value)} />
        </div>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-3)', marginTop:8 }}>
          Your work will be sent for AI evaluation. XP will be awarded based on quality.
        </div>
      </Modal>
    </Layout>
  );
}
