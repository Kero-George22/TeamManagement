import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../lib/toast';
import API from '../lib/api';

const GOOGLE_CLIENT_ID = '934607695812-n0omi6fdbfn8rb2v3503n9t1jp89e7fe.apps.googleusercontent.com';

export default function LoginPage() {
  const [tab, setTab]       = useState('login');
  const [showVerify, setShowVerify] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, isLoggedIn } = useAuth();
  const toast    = useToast();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState({});
  const togglePw = (id) => setShowPw(p => ({ ...p, [id]: !p[id] }));

  useEffect(() => {
    if (isLoggedIn) {
      const u = API.getUser();
      if (u && !u.username) {
        navigate('/app/onboard', { replace: true });
      } else {
        navigate('/app/dashboard', { replace: true });
      }
    }
  }, [isLoggedIn, navigate]);

  const handleGoogleCredential = useCallback(async (response) => {
    const idToken = response.credential;
    if (!idToken) return;
    setGoogleLoading(true);
    try {
      const data = await API.auth.googleLogin(idToken);
      login(data);
      toast.success('Signed in with Google!');
      setTimeout(() => {
        if (!data.user.username) {
          navigate('/app/onboard', { replace: true });
        } else {
          navigate('/app/dashboard', { replace: true });
        }
      }, 600);
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  }, [login, navigate, toast]);

  useEffect(() => {
    if (!window.google) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
    });
    
    // Render the official Google button
    const btnContainer = document.getElementById('google-btn-container');
    if (btnContainer) {
      window.google.accounts.id.renderButton(btnContainer, {
        theme: 'outline',
        size: 'large',
        text: tab === 'signup' ? 'signup_with' : 'signin_with',
        width: 320 // matches our typical form width
      });
    }
  }, [handleGoogleCredential, tab]);

  if (isLoggedIn) return null;

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

  const [tempToken, setTempToken] = useState(null);
  const [twoFACode, setTwoFACode] = useState('');
  
  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.target);
      const data = await API.auth.login(fd.get('email'), fd.get('password'));
      
      if (data.requires2FA) {
        setTempToken(data.tempToken);
        setTab('2fa');
        return;
      }
      
      login(data);
      toast.success('Logged in! Redirecting…');
      setTimeout(() => {
        if (!data.user.username) navigate('/app/onboard', { replace: true });
        else navigate('/app/dashboard', { replace: true });
      }, 600);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  async function handleVerify2FA(e) {
    e.preventDefault();
    if (twoFACode.length !== 6) return;
    setLoading(true);
    try {
      const data = await API.auth.verify2FA(tempToken, twoFACode);
      login(data);
      toast.success('Logged in successfully!');
      setTimeout(() => {
        if (!data.user.username) navigate('/app/onboard', { replace: true });
        else navigate('/app/dashboard', { replace: true });
      }, 600);
    } catch (err) {
      toast.error(err.message || 'Invalid 2FA code');
    } finally {
      setLoading(false);
    }
  }


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
              <div id="google-btn-container" style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', opacity: googleLoading ? 0.7 : 1, pointerEvents: googleLoading ? 'none' : 'auto' }}></div>
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
              <div id="google-btn-container" style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', opacity: googleLoading ? 0.7 : 1, pointerEvents: googleLoading ? 'none' : 'auto' }}></div>
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

          {/* 2FA Verification */}
          {tab === '2fa' && (
            <form className="auth-form" onSubmit={handleVerify2FA} style={{ textAlign: 'center', padding: '20px 0' }}>
              <i className="fa-solid fa-shield-halved" style={{ fontSize: '3rem', color: 'var(--green)', marginBottom: 16, display: 'block' }} />
              <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Two-Factor Authentication</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '.875rem', marginBottom: 24 }}>Enter the 6-digit code from your authenticator app.</p>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">Authenticator Code</label>
                <input 
                  type="text"
                  value={twoFACode}
                  onChange={e => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                  className="form-input" 
                  placeholder="000000" 
                  required 
                  style={{ letterSpacing: '5px', textAlign: 'center', fontSize: '1.25rem', fontWeight: 600 }} 
                  maxLength={6} 
                />
              </div>
              <button className="btn btn--green" disabled={loading || twoFACode.length !== 6} style={{ width: '100%', marginTop: 12 }}>
                {loading ? <span className="spinner" /> : 'Verify Code'}
              </button>
              <div style={{ marginTop: 16 }}>
                <button type="button" onClick={() => setTab('login')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Verify */}
          {showVerify && (
            <form className="auth-form" onSubmit={handleVerify} style={{ textAlign: 'center', padding: '20px 0' }}>
              <i className="fa-regular fa-envelope-open" style={{ fontSize: '3rem', color: 'var(--green)', marginBottom: 16, display: 'block' }} />
              <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Check your inbox</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '.875rem', marginBottom: 24 }}>Enter the 6-digit verification code we sent you.</p>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">Verification Code</label>
                <input name="token" className="form-input" placeholder="123456" required style={{ letterSpacing: '5px', textAlign: 'center', fontSize: '1.25rem', fontWeight: 600 }} maxLength={6} />
              </div>
              <button className="btn btn--green" style={{ width: '100%', marginTop: 12 }}>Verify Email</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
