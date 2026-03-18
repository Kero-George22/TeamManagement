import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/index.js';
import { useToast } from '../../context/ToastContext.jsx';

function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', 'var(--red)', 'var(--gold)', 'var(--cyan)', 'var(--green)'];

export default function Register() {
  const navigate = useNavigate();
  const toast    = useToast();
  const [form, setForm]     = useState({ username: '', email: '', password: '', confirm: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(form.password);

  function onChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (strength < 2) { setError('Password is too weak.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/signup', {
        username: form.username,
        email:    form.email,
        password: form.password,
      });
      toast.success('Account created! Check your email to verify.');
      navigate(`/verify?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="portal-wrap grid-bg">
      <div className="portal-box fade-up">
        <div className="portal-logo">
          <div className="portal-hex">XP</div>
          <div className="portal-title">JOIN JOBXP</div>
          <div className="portal-sub">CREATE YOUR HERO ACCOUNT</div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input name="username" className="form-input" required
              placeholder="HeroName" value={form.username} onChange={onChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input name="email" type="email" className="form-input" required
              placeholder="hero@arena.com" value={form.email} onChange={onChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input name="password" type="password" className="form-input" required minLength={8}
              placeholder="Min 8 characters" value={form.password} onChange={onChange} />
            {form.password && (
              <div>
                <div className="pw-strength">
                  <div className="pw-strength-bar" style={{
                    width: (strength / 4 * 100) + '%',
                    background: STRENGTH_COLORS[strength],
                  }} />
                </div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color: STRENGTH_COLORS[strength], marginTop:4 }}>
                  {STRENGTH_LABELS[strength]}
                </div>
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input name="confirm" type="password" className="form-input" required
              placeholder="••••••••" value={form.confirm} onChange={onChange} />
            {form.confirm && form.confirm !== form.password && (
              <div className="form-error show">Passwords do not match</div>
            )}
          </div>
          <button type="submit" className="btn btn-cyan btn-full" disabled={loading}>
            {loading ? 'REGISTERING...' : '⚡ CREATE ACCOUNT'}
          </button>
        </form>

        <div className="auth-divider">OR CONTINUE WITH</div>
        <div style={{ display:'flex', gap:10, marginBottom:20 }}>
          <a href="/auth/google" className="btn-social btn-social-google">
            <svg width="16" height="16" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.2 30.2 0 24 0 14.6 0 6.6 5.4 2.8 13.2l7.9 6.1C12.5 13.1 17.8 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.9 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.9c-.6 3-2.3 5.5-4.9 7.2l7.7 6c4.5-4.2 7.2-10.3 7.2-17.2z"/>
              <path fill="#FBBC05" d="M10.7 28.6A14.7 14.7 0 0 1 9.5 24c0-1.6.3-3.1.7-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.5 10.8l8.2-6.2z"/>
              <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.6l-7.7-6c-2.1 1.4-4.8 2.2-7.8 2.2-6.2 0-11.5-3.6-13.3-9l-8.2 6.3C6.6 42.6 14.6 48 24 48z"/>
            </svg>
            Google
          </a>
          <a href="/auth/github" className="btn-social btn-social-github">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.1.82-.26.82-.57v-2c-3.34.72-4.04-1.6-4.04-1.6-.54-1.38-1.33-1.75-1.33-1.75-1.08-.74.08-.72.08-.72 1.2.08 1.83 1.23 1.83 1.23 1.06 1.82 2.8 1.3 3.47.99.1-.77.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.68.83.57A12.01 12.01 0 0 0 24 12C24 5.37 18.63 0 12 0z"/>
            </svg>
            GitHub
          </a>
        </div>

        <div style={{ textAlign:'center', fontFamily:'var(--font-mono)', fontSize:11 }}>
          Already have an account? <Link to="/login" style={{ color:'var(--cyan)' }}>Sign In →</Link>
        </div>
      </div>
    </div>
  );
}
