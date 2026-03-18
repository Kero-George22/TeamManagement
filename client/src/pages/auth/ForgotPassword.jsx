import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/index.js';

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('');
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="portal-wrap grid-bg">
      <div className="portal-box fade-up">
        <div className="portal-logo">
          <div className="portal-hex">🔑</div>
          <div className="portal-title">RESET ACCESS</div>
          <div className="portal-sub">ENTER YOUR EMAIL TO RESET PASSWORD</div>
        </div>

        {error   && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">Reset link sent! Check your inbox.</div>}

        {!success && (
          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" required
                placeholder="hero@arena.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-cyan btn-full" disabled={loading}>
              {loading ? 'SENDING...' : '⚡ Send Reset Link'}
            </button>
          </form>
        )}

        <div style={{ textAlign:'center', marginTop:20, fontFamily:'var(--font-mono)', fontSize:11 }}>
          <Link to="/login" style={{ color:'var(--text-2)' }}>← Back to login</Link>
        </div>
      </div>
    </div>
  );
}
