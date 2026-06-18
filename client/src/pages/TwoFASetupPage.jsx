import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../lib/toast';
import API from '../lib/api';

export default function TwoFASetupPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [setupData, setSetupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  
  // For disabling
  const [password, setPassword] = useState('');
  const [disableToken, setDisableToken] = useState('');
  const [disabling, setDisabling] = useState(false);

  useEffect(() => {
    if (user?.twoFA?.enabled) {
      setLoading(false);
      return;
    }

    async function loadSetup() {
      try {
        const res = await API.auth.setup2FA();
        setSetupData(res.uri);
        setBackupCodes(res.backupCodes || []);
      } catch (err) {
        toast.error(err.message || 'Failed to start 2FA setup');
      } finally {
        setLoading(false);
      }
    }
    loadSetup();
  }, [user, toast]);

  async function handleEnable(e) {
    e.preventDefault();
    if (token.length !== 6) return;
    setVerifying(true);
    try {
      await API.auth.enable2FA(token);
      toast.success('Two-factor authentication enabled successfully!');
      updateUser({ twoFA: { enabled: true } });
    } catch (err) {
      toast.error(err.message || 'Invalid code');
    } finally {
      setVerifying(false);
    }
  }

  async function handleDisable(e) {
    e.preventDefault();
    if (!password || !disableToken) return;
    setDisabling(true);
    try {
      await API.auth.disable2FA(password, disableToken);
      toast.success('Two-factor authentication disabled.');
      updateUser({ twoFA: { enabled: false } });
      setPassword('');
      setDisableToken('');
    } catch (err) {
      toast.error(err.message || 'Failed to disable 2FA');
    } finally {
      setDisabling(false);
    }
  }

  const copyCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast.success('Backup codes copied to clipboard');
  };

  const downloadCodes = () => {
    const el = document.createElement('a');
    el.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(backupCodes.join('\n')));
    el.setAttribute('download', 'teamforge-backup-codes.txt');
    el.style.display = 'none';
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6" style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <button className="btn btn--ghost mb-6" onClick={() => navigate('/app/profile')}>
        <i className="fa-solid fa-arrow-left" /> Back to Profile
      </button>

      <div className="card p-8" style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>Two-Factor Authentication</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
          Secure your account with an extra layer of protection.
        </p>

        {user?.twoFA?.enabled ? (
          <div>
            <div style={{ padding: 16, background: '#f0fdf4', color: '#166534', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
              <i className="fa-solid fa-shield-check" style={{ fontSize: '1.5rem' }} />
              <div>
                <strong>2FA is currently enabled.</strong>
                <div style={{ fontSize: '0.9rem' }}>Your account is protected.</div>
              </div>
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>Disable 2FA</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              To turn off 2FA, please enter your password and a current authenticator code.
            </p>
            <form onSubmit={handleDisable} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-input" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0' }} required />
              </div>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Authenticator Code</label>
                <input type="text" value={disableToken} onChange={e => setDisableToken(e.target.value)} maxLength={6} className="form-input" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0' }} required />
              </div>
              <button type="submit" className="btn btn--danger" disabled={disabling} style={{ padding: '10px', background: '#ef4444', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                {disabling ? 'Disabling...' : 'Disable 2FA'}
              </button>
            </form>
          </div>
        ) : (
          <div>
            {setupData && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>1. Scan QR Code</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Use an authenticator app like Google Authenticator or Authy to scan this QR code.
                  </p>
                  <div style={{ padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, display: 'inline-block' }}>
                    <QRCodeSVG value={setupData} size={200} />
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>2. Enter Code</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Enter the 6-digit code from your app to verify setup.
                  </p>
                  <form onSubmit={handleEnable}>
                    <input 
                      type="text" 
                      value={token} 
                      onChange={e => setToken(e.target.value.replace(/\D/g, ''))} 
                      maxLength={6} 
                      placeholder="000000"
                      style={{ width: '100%', padding: '12px 16px', fontSize: '1.5rem', letterSpacing: '8px', textAlign: 'center', borderRadius: 8, border: '2px solid #e2e8f0', marginBottom: 16 }}
                      required
                    />
                    <button type="submit" disabled={token.length !== 6 || verifying} style={{ width: '100%', padding: '12px', background: '#3b82f6', color: '#fff', borderRadius: 8, border: 'none', fontWeight: 600, cursor: token.length === 6 ? 'pointer' : 'not-allowed', opacity: token.length === 6 ? 1 : 0.6 }}>
                      {verifying ? 'Verifying...' : 'Enable 2FA'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {backupCodes.length > 0 && (
              <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>3. Save Backup Codes</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                  If you lose access to your authenticator app, you can use these backup codes to log in. Each code can only be used once. <strong>Keep them safe!</strong>
                </p>
                <div style={{ background: '#f8fafc', padding: 24, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontFamily: 'monospace', fontSize: '1.1rem', marginBottom: 20 }}>
                    {backupCodes.map((c, i) => (
                      <div key={i}>{c}</div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={copyCodes} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>
                      <i className="fa-regular fa-copy" style={{ marginRight: 6 }} /> Copy All
                    </button>
                    <button onClick={downloadCodes} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>
                      <i className="fa-solid fa-download" style={{ marginRight: 6 }} /> Download .txt
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
