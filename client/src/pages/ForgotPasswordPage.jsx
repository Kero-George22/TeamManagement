import { useState } from 'react';
import { useToast } from '../lib/toast';
import API from '../lib/api';

export default function ForgotPasswordPage() {
  const [step, setStep]   = useState('request'); // request | reset | done
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // Check for token in URL
  const urlToken = new URLSearchParams(window.location.search).get('token');
  if (urlToken && step === 'request') { setStep('reset'); }

  async function handleRequest(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await API.auth.forgotPw(new FormData(e.target).get('email'));
    } catch {}
    setStep('reset');
    setLoading(false);
  }

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.target);
    try {
      await API.auth.resetPw(fd.get('token'), fd.get('password'));
      setStep('done');
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <div style={{ background: 'var(--white)', borderRadius: 'var(--card-radius)', padding: 40, width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,.12)', margin: 20 }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: -1, marginBottom: 28 }}>
          Job<span style={{ color: 'var(--green)' }}>XP</span>
        </div>

        {step === 'request' && (
          <>
            <h2 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 6 }}>Forgot Password?</h2>
            <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 24 }}>Enter your email and we'll send you a reset link.</p>
            <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input name="email" type="email" className="form-input" placeholder="you@example.com" required />
              </div>
              <button className="btn btn--green" disabled={loading} style={{ width: '100%', padding: 13 }}>
                {loading ? <span className="spinner" /> : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}

        {step === 'reset' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <i className="fa-regular fa-envelope-open" style={{ fontSize: '2.5rem', color: 'var(--green)', marginBottom: 12, display: 'block' }} />
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 6 }}>Check your inbox</h2>
              <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)' }}>Paste the reset token from your email below.</p>
            </div>
            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Reset Token</label>
                <input name="token" className="form-input" placeholder="Paste token here" required defaultValue={urlToken || ''} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input name="password" type="password" className="form-input" placeholder="Min 8 characters" required />
              </div>
              <button className="btn btn--green" disabled={loading} style={{ width: '100%', padding: 13 }}>
                {loading ? <span className="spinner" /> : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: '3rem', color: 'var(--green)', marginBottom: 16, display: 'block' }} />
            <h2 style={{ fontWeight: 800, marginBottom: 8 }}>Password Reset!</h2>
            <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 24 }}>You can now sign in with your new password.</p>
            <a href="/app/login" className="btn btn--primary" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>Go to Sign In</a>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/app/login" style={{ fontSize: '.82rem', color: 'var(--green)', fontWeight: 600 }}>
            <i className="fa-solid fa-arrow-left" /> Back to login
          </a>
        </div>
      </div>
    </div>
  );
}
