import { useState } from 'react';
import { useToast } from '../lib/toast';
import API from '../lib/api';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(() => {
    const hasToken = new URLSearchParams(window.location.search).get('token');
    return hasToken ? 'reset' : 'request';
  });
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const toast = useToast();

  const urlToken = new URLSearchParams(window.location.search).get('token');

  function validateForm() {
    const errs = {};
    if (!password || password.length < 8) errs.password = 'Must be at least 8 characters';
    if (password !== confirmPassword) errs.confirm = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleRequest(e) {
    e.preventDefault();
    const email = new FormData(e.target).get('email');
    if (!email) return;
    setLoading(true);
    setEmailSent(email);
    try {
      await API.auth.forgotPw(email);
    } catch {}
    setStep('sent');
    setLoading(false);
  }

  async function handleReset(e) {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      await API.auth.resetPw(urlToken, password, confirmPassword);
      setStep('done');
    } catch (err) {
      toast.error(err.response?.message || err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      background: 'var(--bg)',
    }}>
      <div style={{
        background: 'var(--white)',
        borderRadius: 20,
        padding: 40,
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 4px 24px var(--shadow)',
      }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: -1, marginBottom: 28 }}>
          Team<span style={{ color: 'var(--green)' }}>Forge</span>
        </div>

        {step === 'request' && (
          <>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', marginBottom: 20, color: 'var(--green)' }}>
              <i className="fa-solid fa-lock" />
            </div>
            <h2 style={{ fontWeight: 800, fontSize: '1.25rem', margin: '0 0 6px', color: 'var(--text-primary)' }}>Forgot password?</h2>
            <p style={{ fontSize: '.88rem', color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.5 }}>Enter your email and we'll send you a reset link.</p>
            <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input name="email" type="email" className="form-input" placeholder="you@example.com" required autoFocus />
              </div>
              <button className="btn btn--primary" disabled={loading} style={{ width: '100%', padding: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <i className="fa-solid fa-circle-notch fa-spin" /> : null}
                Send Reset Link
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <a href="/app/login" style={{ fontSize: '.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <i className="fa-solid fa-arrow-left" /> Back to login
              </a>
            </div>
          </>
        )}

        {step === 'sent' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', margin: '0 auto 20px', color: 'var(--green)' }}>
              <i className="fa-regular fa-envelope" />
            </div>
            <h2 style={{ fontWeight: 800, fontSize: '1.2rem', margin: '0 0 8px', color: 'var(--text-primary)' }}>Check your inbox</h2>
            <p style={{ fontSize: '.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 4 }}>We sent a reset link to</p>
            <p style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--text-primary)', margin: '0 0 16px' }}>{emailSent}</p>
            <p style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>
              Didn't receive it? Check your spam folder or{' '}
              <button onClick={() => { setStep('request'); setEmailSent(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', fontWeight: 600, padding: 0, fontSize: '.82rem' }}>
                try again
              </button>
            </p>
            <div style={{ marginTop: 20 }}>
              <a href="/app/login" style={{ fontSize: '.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <i className="fa-solid fa-arrow-left" /> Back to login
              </a>
            </div>
          </div>
        )}

        {step === 'reset' && (
          <>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', marginBottom: 20, color: 'var(--green)' }}>
              <i className="fa-solid fa-key" />
            </div>
            <h2 style={{ fontWeight: 800, fontSize: '1.25rem', margin: '0 0 6px', color: 'var(--text-primary)' }}>Set new password</h2>
            <p style={{ fontSize: '.88rem', color: 'var(--text-secondary)', margin: '0 0 24px' }}>Must be at least 8 characters.</p>
            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">New password</label>
                <input
                  type="password"
                  className={`form-input${errors.password ? ' error' : ''}`}
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors({}); }}
                  required
                  autoFocus
                />
                {errors.password && <div className="form-error">{errors.password}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Confirm password</label>
                <input
                  type="password"
                  className={`form-input${errors.confirm ? ' error' : ''}`}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setErrors({}); }}
                  required
                />
                {errors.confirm && <div className="form-error">{errors.confirm}</div>}
              </div>
              <button className="btn btn--primary" disabled={loading} style={{ width: '100%', padding: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <i className="fa-solid fa-circle-notch fa-spin" /> : null}
                Reset Password
              </button>
            </form>
          </>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', margin: '0 auto 16px', color: 'var(--green)' }}>
              <i className="fa-solid fa-check" />
            </div>
            <h2 style={{ fontWeight: 800, fontSize: '1.2rem', margin: '0 0 8px', color: 'var(--text-primary)' }}>Password reset!</h2>
            <p style={{ fontSize: '.88rem', color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.5 }}>Your password has been updated. Sign in with your new password.</p>
            <a href="/app/login" className="btn btn--primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-arrow-right-to-bracket" /> Sign In
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
