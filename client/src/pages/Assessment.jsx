import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout.jsx';
import { SpinnerWrap } from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ScoreRing from '../components/ScoreRing.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../api/index.js';
import { gradeFromScore, timeAgo } from '../utils.js';

const AREAS = [
  { id:'frontend',         label:'Frontend',          icon:'🎨', desc:'HTML, CSS, JS, React' },
  { id:'backend',          label:'Backend',            icon:'⚙️', desc:'Node, APIs, DBs' },
  { id:'devops',           label:'DevOps',             icon:'🚀', desc:'Docker, CI/CD, Cloud' },
  { id:'mobile',           label:'Mobile',             icon:'📱', desc:'React Native, Flutter' },
  { id:'machine-learning', label:'Machine Learning',   icon:'🤖', desc:'ML, AI, Data Science' },
];

const GRADE_COLOR = { S:'var(--gold)', A:'var(--cyan)', B:'var(--green)', C:'#fff', D:'#f90', F:'#f44' };

export default function Assessment() {
  const toast = useToast();

  const [view,       setView]       = useState('picker');   // picker | quiz | result | history
  const [area,       setArea]       = useState(null);
  const [questions,  setQuestions]  = useState([]);
  const [current,   setCurrent]    = useState(0);
  const [answers,   setAnswers]    = useState([]);
  const [sessionId, setSessionId]  = useState(null);
  const [result,    setResult]     = useState(null);
  const [history,   setHistory]    = useState([]);
  const [loading,   setLoading]    = useState(false);
  const [histLoaded,setHistLoaded] = useState(false);

  async function startAssessment(a) {
    setArea(a);
    setLoading(true);
    try {
      const [qData, sesData] = await Promise.all([
        api.get('/assessments/questions/' + a.id),
        api.post('/assessments/start', { skillArea: a.id }),
      ]);
      setQuestions(qData.questions || qData || []);
      setSessionId(sesData.sessionId || sesData._id || null);
      setAnswers([]);
      setCurrent(0);
      setView('quiz');
    } catch (err) {
      toast.error(err.message);
      setView('picker');
    } finally { setLoading(false); }
  }

  function selectAnswer(idx) {
    const newAnswers = [...answers];
    newAnswers[current] = idx;
    setAnswers(newAnswers);

    // Auto-advance to next after short delay
    if (current < questions.length - 1) {
      setTimeout(() => setCurrent(c => c + 1), 350);
    }
  }

  async function submitQuiz() {
    setLoading(true);
    try {
      const data = await api.post('/assessments/submit', {
        sessionId,
        skillArea: area.id,
        answers: questions.map((q, i) => ({
          questionId: q._id || q.id || i,
          answer: answers[i] ?? null,
          selectedOption: answers[i] ?? null,
        })),
      });
      setResult(data.result || data);
      setView('result');
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  }

  async function loadHistory() {
    if (histLoaded) { setView('history'); return; }
    setLoading(true);
    try {
      const data = await api.get('/assessments/history');
      setHistory(data.assessments || data || []);
      setHistLoaded(true);
      setView('history');
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  }

  const q         = questions[current];
  const answered  = answers.filter(a => a !== undefined).length;
  const progress  = questions.length ? (answered / questions.length) * 100 : 0;

  /* ======================== PICKER ======================== */
  if (view === 'picker') return (
    <Layout>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(14px,2.5vw,22px)', fontWeight:900, letterSpacing:4, marginBottom:8 }}>
          📊 SKILL ASSESSMENT
        </div>
        <div style={{ color:'var(--text-2)', fontFamily:'var(--font-mono)', fontSize:12 }}>
          Choose a skill area to test your knowledge and earn XP.
        </div>
      </div>

      {loading ? <SpinnerWrap /> : (
        <div className="grid-3" style={{ marginBottom:28 }}>
          {AREAS.map(a => (
            <button key={a.id} className="card"
              style={{ cursor:'pointer', border:'1px solid var(--border)', textAlign:'left', padding:24, background:'var(--bg-card)', transition:'all .2s' }}
              onClick={() => startAssessment(a)}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--cyan)'; e.currentTarget.style.boxShadow='0 0 16px var(--cyan-dim)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.boxShadow='none'; }}>
              <div style={{ fontSize:32, marginBottom:10 }}>{a.icon}</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, letterSpacing:2, marginBottom:6 }}>{a.label}</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-3)' }}>{a.desc}</div>
            </button>
          ))}
        </div>
      )}

      <button className="btn btn-outline btn-sm" onClick={loadHistory}>📜 View History</button>
    </Layout>
  );

  /* ========================= QUIZ ========================= */
  if (view === 'quiz') return (
    <Layout>
      {/* Progress bar */}
      <div style={{ height:3, background:'var(--bg-3)', marginBottom:28 }}>
        <div style={{ height:'100%', width: progress + '%', background:'var(--cyan)', transition:'width .3s' }} />
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:10, letterSpacing:3, color:'var(--text-2)' }}>
          {area?.icon} {area?.label.toUpperCase()} ASSESSMENT
        </div>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-2)' }}>
          {current + 1} / {questions.length}
        </div>
      </div>

      {q && (
        <div className="card" style={{ marginBottom:20, padding:'28px 32px' }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:9, letterSpacing:3, color:'var(--cyan)', marginBottom:16 }}>
            QUESTION {current + 1}
          </div>
          <div style={{ fontSize:15, lineHeight:1.8, marginBottom:24, color:'var(--text-1)' }}>
            {q.question || q.text}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {(q.options || []).map((opt, idx) => {
              const selected = answers[current] === idx;
              return (
                <button key={idx}
                  className={`quiz-option ${selected ? 'selected' : ''}`}
                  style={{
                    background: selected ? 'var(--cyan-dim)' : 'var(--bg-3)',
                    border: `1px solid ${selected ? 'var(--cyan)' : 'var(--border)'}`,
                    color: selected ? 'var(--cyan)' : 'var(--text-1)',
                    padding:'12px 18px', textAlign:'left', cursor:'pointer',
                    fontFamily:'var(--font-mono)', fontSize:13, lineHeight:1.6,
                    transition:'all .15s',
                  }}
                  onClick={() => selectAnswer(idx)}>
                  <span style={{ marginRight:10 }}>{String.fromCharCode(65 + idx)}.</span>{opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display:'flex', gap:10, justifyContent:'space-between' }}>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost btn-sm" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>← Prev</button>
          <button className="btn btn-outline btn-sm" disabled={current === questions.length - 1} onClick={() => setCurrent(c => c + 1)}>Next →</button>
        </div>
        {answered === questions.length && (
          <button className="btn btn-cyan" disabled={loading} onClick={submitQuiz}>
            {loading ? 'Submitting…' : '📤 Submit Assessment'}
          </button>
        )}
      </div>

      <div style={{ marginTop:16, display:'flex', flexWrap:'wrap', gap:6 }}>
        {questions.map((_, i) => (
          <div key={i}
            style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center',
              background: i === current ? 'var(--cyan)' : answers[i] !== undefined ? 'var(--green-dim)' : 'var(--bg-3)',
              border: `1px solid ${i === current ? 'var(--cyan)' : answers[i] !== undefined ? 'var(--green)' : 'var(--border)'}`,
              color: i === current ? '#000' : answers[i] !== undefined ? 'var(--green)' : 'var(--text-3)',
              fontFamily:'var(--font-mono)', fontSize:10, cursor:'pointer' }}
            onClick={() => setCurrent(i)}>
            {i + 1}
          </div>
        ))}
      </div>
    </Layout>
  );

  /* ======================== RESULT ======================== */
  if (view === 'result' && result) {
    const score = result.score ?? result.totalScore ?? 0;
    const grade = gradeFromScore(score);
    const gc    = GRADE_COLOR[grade] || '#fff';
    return (
      <Layout>
        <div style={{ maxWidth:480, margin:'48px auto', textAlign:'center' }}>
          <ScoreRing score={score} size={120} />
          <div style={{ fontFamily:'var(--font-display)', fontSize:72, fontWeight:900, color: gc, margin:'16px 0 0', lineHeight:1 }}>
            {grade}
          </div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--text-2)', marginBottom:6 }}>
            {score.toFixed(1)} / 100
          </div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:11, letterSpacing:3, color:'var(--text-3)', marginBottom:24, textTransform:'uppercase' }}>
            {area?.label} Assessment Complete
          </div>
          {result.xpEarned > 0 && (
            <div style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--gold)', marginBottom:20 }}>
              +{result.xpEarned} XP EARNED
            </div>
          )}
          {result.feedback && (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', padding:20, textAlign:'left', marginBottom:20 }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:9, letterSpacing:3, color:'var(--cyan)', marginBottom:10 }}>🤖 AI FEEDBACK</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-2)', lineHeight:1.8 }}>{result.feedback}</div>
            </div>
          )}
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="btn btn-cyan" onClick={() => setView('picker')}>Try Another Area</button>
            <button className="btn btn-outline" onClick={loadHistory}>View History</button>
          </div>
        </div>
      </Layout>
    );
  }

  /* ======================== HISTORY ======================== */
  if (view === 'history') return (
    <Layout>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:16, letterSpacing:3 }}>📜 ASSESSMENT HISTORY</div>
        <button className="btn btn-ghost btn-sm" onClick={() => setView('picker')}>← Start New</button>
      </div>
      {loading ? <SpinnerWrap /> : history.length === 0
        ? <EmptyState icon="📊" text="No assessments yet" sub="Take your first assessment to get started" />
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {history.map(h => {
              const s  = h.score ?? h.totalScore ?? 0;
              const g  = gradeFromScore(s);
              const gc = GRADE_COLOR[g] || '#fff';
              const a  = AREAS.find(x => x.id === (h.skillArea || h.area));
              return (
                <div key={h._id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', padding:'16px 20px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:900, color: gc, width:44, textAlign:'center' }}>{g}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:12, letterSpacing:2, marginBottom:4 }}>
                      {a?.icon || '📊'} {a?.label || (h.skillArea || 'Assessment')}
                    </div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-3)' }}>{timeAgo(h.createdAt)}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color: gc }}>{s.toFixed(1)}</div>
                    {h.xpEarned > 0 && <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--gold)' }}>+{h.xpEarned} XP</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </Layout>
  );

  return <Layout><SpinnerWrap /></Layout>;
}
