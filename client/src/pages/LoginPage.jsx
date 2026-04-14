import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../lib/toast';
import API from '../lib/api';

export default function LoginPage() {
  const [tab, setTab]       = useState('login');
  const [showVerify, setShowVerify] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, isLoggedIn } = useAuth();
  const toast    = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  if (isLoggedIn) return null;

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.target);
      const data = await API.auth.login(fd.get('email'), fd.get('password'));
      login(data);
      toast.success('Logged in! Redirecting…');
      setTimeout(() => navigate('/app/dashboard'), 600);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.target);
      await API.auth.signup(fd.get('email'), fd.get('password'));
      setShowVerify(true);
      toast.success('Account created! Check your email.');
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  async function handleVerify(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await API.auth.verify(fd.get('token'));
      toast.success('Email verified! Sign in now.');
      setShowVerify(false);
      setTab('login');
    } catch (err) { toast.error(err.message); }
  }

  const [showPw, setShowPw] = useState({});
  const togglePw = (id) => setShowPw(p => ({ ...p, [id]: !p[id] }));

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <div className="auth-wrapper">
        {/* Left brand */}
        <div className="auth-panel">
          <div className="auth-panel__logo">Team<span>Forge</span></div>
          <div>
            <p className="auth-panel__tagline">Build with the right team.<br />Ship work that matters.</p>
            <p className="auth-panel__sub">Collaborate, plan, and execute projects with AI-assisted task workflows.</p>
            <div className="auth-panel__dots">
              <div className="auth-panel__dot auth-panel__dot--active" />
              <div className="auth-panel__dot" />
              <div className="auth-panel__dot" />
            </div>
          </div>
        </div>

        {/* Right form */}
        <div className="auth-form-panel">
          <div className="auth-tabs">
            <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setShowVerify(false); }}>Sign In</button>
            <button className={`auth-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => { setTab('signup'); setShowVerify(false); }}>Sign Up</button>
          </div>

          {/* Login */}
          {tab === 'login' && !showVerify && (
            <form className="auth-form" onSubmit={handleLogin}>
              <div><h2 className="auth-title">Welcome back</h2><p className="auth-sub">Sign in to your TeamForge account</p></div>
              <button type="button" className="btn btn--outline" style={{ width: '100%', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--sidebar-bg)', color: 'var(--white)', borderColor: 'var(--border)' }}>
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{ width: 18 }} />
                Sign in with Google
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
                <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Or continue with email</span>
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input name="email" type="email" className="form-input" placeholder="you@example.com" required autoComplete="email" />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input name="password" type={showPw.login ? 'text' : 'password'} className="form-input" placeholder="••••••••" required autoComplete="current-password" />
                  <button type="button" onClick={() => togglePw('login')} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <i className={`fa-regular ${showPw.login ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <a href="/app/forgot-password" style={{ fontSize: '.8rem', color: 'var(--green)', fontWeight: 600 }}>Forgot password?</a>
              </div>
              <button className="btn btn--primary" disabled={loading} style={{ width: '100%', padding: 13 }}>
                {loading ? <span className="spinner" /> : 'Sign In'}
              </button>
            </form>
          )}

          {/* Signup */}
          {tab === 'signup' && !showVerify && (
            <form className="auth-form" onSubmit={handleSignup}>
              <div><h2 className="auth-title">Create account</h2><p className="auth-sub">Join TeamForge — it's free</p></div>
              <button type="button" className="btn btn--outline" style={{ width: '100%', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--sidebar-bg)', color: 'var(--white)', borderColor: 'var(--border)' }}>
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{ width: 18 }} />
                Sign up with Google
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
                <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Or continue with email</span>
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input name="email" type="email" className="form-input" placeholder="you@example.com" required autoComplete="email" />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input name="password" type={showPw.signup ? 'text' : 'password'} className="form-input" placeholder="Min 8 characters" required autoComplete="new-password" />
                  <button type="button" onClick={() => togglePw('signup')} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <i className={`fa-regular ${showPw.signup ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
              </div>
              <button className="btn btn--green" disabled={loading} style={{ width: '100%', padding: 13 }}>
                {loading ? <span className="spinner" /> : 'Create Account'}
              </button>
            </form>
          )}

          {/* Verify */}
          {showVerify && (
            <form className="auth-form" onSubmit={handleVerify} style={{ textAlign: 'center', padding: '20px 0' }}>
              <i className="fa-regular fa-envelope-open" style={{ fontSize: '3rem', color: 'var(--green)', marginBottom: 16, display: 'block' }} />
              <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Check your inbox</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '.875rem', marginBottom: 24 }}>Paste your verification token below.</p>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">Verification Token</label>
                <input name="token" className="form-input" placeholder="Paste token here" required />
              </div>
              <button className="btn btn--green" style={{ width: '100%', marginTop: 12 }}>Verify Email</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
