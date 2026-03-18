import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/index.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function ResetPassword() {
  const navigate = useNavigate();
  const toast    = useToast();
  const [params] = useSearchParams();
  const [form, setForm]   = useState({ token: params.get('token') || '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function onChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token: form.token, newPassword: form.newPassword });
      toast.success('Password reset! You can now sign in.');
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="portal-wrap grid-bg">
      <div className="portal-box fade-up">
        <div className="portal-logo">
          <div className="portal-hex">🔒</div>
          <div className="portal-title">NEW PASSWORD</div>
          <div className="portal-sub">SET YOUR NEW CREDENTIALS</div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Reset Token</label>
            <input name="token" className="form-input" required
              placeholder="Paste your reset token" value={form.token} onChange={onChange} />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input name="newPassword" type="password" className="form-input" required minLength={8}
              placeholder="Min 8 characters" value={form.newPassword} onChange={onChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input name="confirm" type="password" className="form-input" required
              placeholder="••••••••" value={form.confirm} onChange={onChange} />
            {form.confirm && form.confirm !== form.newPassword && (
              <div className="form-error show">Passwords do not match</div>
            )}
          </div>
          <button type="submit" className="btn btn-cyan btn-full" disabled={loading}>
            {loading ? 'RESETTING...' : '🔒 Reset Password'}
          </button>
        </form>

        <div style={{ textAlign:'center', marginTop:20, fontFamily:'var(--font-mono)', fontSize:11 }}>
          <Link to="/login" style={{ color:'var(--text-2)' }}>← Back to login</Link>
        </div>
      </div>
    </div>
  );
}
