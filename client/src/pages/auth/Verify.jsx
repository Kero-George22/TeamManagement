import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../api/index.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function Verify() {
  const navigate = useNavigate();
  const toast    = useToast();
  const [params] = useSearchParams();
  const email    = params.get('email') || '';
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/verify', { token: token.trim() });
      toast.success('Email verified! You can now sign in.');
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="portal-wrap grid-bg">
      <div className="portal-box fade-up">
        <div className="portal-logo">
          <div className="portal-hex">✉</div>
          <div className="portal-title">VERIFY EMAIL</div>
          <div className="portal-sub">{email ? `CODE SENT TO ${email.toUpperCase()}` : 'ENTER YOUR VERIFICATION CODE'}</div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Verification Token</label>
            <input className="form-input" required placeholder="Paste your token here"
              value={token} onChange={e => setToken(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-cyan btn-full" disabled={loading}>
            {loading ? 'VERIFYING...' : '✓ Verify Account'}
          </button>
        </form>

        <div style={{ textAlign:'center', marginTop:20, fontFamily:'var(--font-mono)', fontSize:11 }}>
          <Link to="/login" style={{ color:'var(--text-2)' }}>← Back to login</Link>
        </div>
      </div>
    </div>
  );
}
