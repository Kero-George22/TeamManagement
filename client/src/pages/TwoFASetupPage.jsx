import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../lib/toast';
import API from '../lib/api';

const pageStyles = {
  shell: {
    minHeight: '100dvh',
    padding: '24px',
    background:
      'radial-gradient(circle at top left, rgba(34,197,94,.14), transparent 32%), radial-gradient(circle at top right, rgba(59,130,246,.12), transparent 28%), linear-gradient(180deg, #f7faf8 0%, #eef4ef 100%)',
    color: '#0f172a',
  },
  container: {
    maxWidth: 1120,
    margin: '0 auto',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    borderRadius: 999,
    border: '1px solid rgba(17,24,39,.08)',
    background: 'rgba(255,255,255,.95)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 10px 28px rgba(15,23,42,.06)',
    color: '#0f172a',
    fontWeight: 600,
    transition: 'transform .16s ease, box-shadow .16s ease',
  },
  card: {
    position: 'relative',
    marginTop: 18,
    overflow: 'hidden',
    borderRadius: 28,
    border: '1px solid rgba(15,23,42,.08)',
    background: 'rgba(255,255,255,.96)',
    backdropFilter: 'blur(16px)',
    boxShadow: '0 24px 70px rgba(15,23,42,.10)',
    color: '#0f172a',
  },
  cardGlow: {
    position: 'absolute',
    inset: 'auto -80px -100px auto',
    width: 260,
    height: 260,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59,130,246,.13) 0%, rgba(59,130,246,0) 68%)',
    pointerEvents: 'none',
  },
  hero: {
    padding: '32px 32px 20px',
    borderBottom: '1px solid rgba(15,23,42,.06)',
  },
  eyebrow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 12px',
    borderRadius: 999,
    background: 'rgba(34,197,94,.12)',
    color: '#166534',
    fontSize: '.78rem',
    fontWeight: 700,
    letterSpacing: '.03em',
    textTransform: 'uppercase',
  },
  headline: {
    marginTop: 18,
    fontSize: 'clamp(2rem, 4vw, 3.2rem)',
    lineHeight: 1.05,
    letterSpacing: '-0.04em',
    color: '#0f172a',
    fontWeight: 800,
  },
  subhead: {
    marginTop: 12,
    maxWidth: 720,
    fontSize: '1rem',
    lineHeight: 1.7,
    color: '#475569',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    marginTop: 24,
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    borderRadius: 18,
    background: '#fff',
    border: '1px solid rgba(15,23,42,.06)',
    boxShadow: '0 10px 22px rgba(15,23,42,.04)',
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(34,197,94,.12)',
    color: '#15803d',
    flexShrink: 0,
  },
  content: {
    padding: 32,
  },
  sectionGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 1.05fr) minmax(320px, .95fr)',
    gap: 24,
    alignItems: 'start',
  },
  sectionCard: {
    height: '100%',
    padding: 24,
    borderRadius: 24,
    border: '1px solid rgba(15,23,42,.08)',
    background: 'linear-gradient(180deg, rgba(255,255,255,.95), rgba(248,250,252,.96))',
    boxShadow: '0 14px 34px rgba(15,23,42,.06)',
  },
  step: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 12px',
    borderRadius: 999,
    background: 'rgba(59,130,246,.10)',
    color: '#1d4ed8',
    fontSize: '.78rem',
    fontWeight: 700,
    letterSpacing: '.02em',
  },
  sectionTitle: {
    marginTop: 14,
    fontSize: '1.1rem',
    fontWeight: 800,
    color: '#0f172a',
  },
  sectionText: {
    marginTop: 8,
    fontSize: '.98rem',
    lineHeight: 1.65,
    color: '#475569',
  },
  qrShell: {
    marginTop: 20,
    display: 'inline-flex',
    padding: 18,
    borderRadius: 24,
    background: 'linear-gradient(180deg, #fff, #f8fafc)',
    border: '1px solid rgba(15,23,42,.08)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.8), 0 16px 30px rgba(15,23,42,.05)',
  },
  qrFrame: {
    display: 'grid',
    placeItems: 'center',
    padding: 12,
    borderRadius: 18,
    background: '#fff',
  },
  form: {
    marginTop: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  label: {
    display: 'block',
    marginBottom: 8,
    fontSize: '.88rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 16,
    border: '1px solid rgba(15,23,42,.12)',
    background: '#fff',
    color: '#0f172a',
    fontSize: '1rem',
    boxShadow: '0 1px 0 rgba(255,255,255,.75) inset',
  },
  codeInput: {
    width: '100%',
    padding: '16px 18px',
    borderRadius: 18,
    border: '1px solid rgba(15,23,42,.12)',
    background: 'linear-gradient(180deg, #273244, #111827)',
    color: '#fff',
    fontSize: '1.5rem',
    letterSpacing: '0.65rem',
    textAlign: 'center',
    fontVariantNumeric: 'tabular-nums',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 12px 24px rgba(15,23,42,.16)',
  },
  primaryButton: {
    width: '100%',
    padding: '14px 18px',
    borderRadius: 16,
    border: 'none',
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    color: '#fff',
    fontSize: '.98rem',
    fontWeight: 800,
    boxShadow: '0 14px 26px rgba(37,99,235,.24)',
  },
  notice: {
    marginBottom: 22,
    padding: 16,
    borderRadius: 18,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    background: 'linear-gradient(180deg, rgba(240,253,244,.98), rgba(220,252,231,.98))',
    color: '#14532d',
    border: '1px solid rgba(34,197,94,.16)',
  },
  backupCard: {
    marginTop: 28,
    paddingTop: 24,
    borderTop: '1px solid rgba(15,23,42,.08)',
  },
  backupGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
    gap: 12,
    marginTop: 18,
  },
  backupCode: {
    padding: '12px 14px',
    borderRadius: 14,
    background: '#fff',
    border: '1px solid rgba(15,23,42,.08)',
    fontFamily: 'var(--mono)',
    fontSize: '.98rem',
    letterSpacing: '.08em',
    textAlign: 'center',
    color: '#0f172a',
  },
  actionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 18,
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 15px',
    borderRadius: 14,
    border: '1px solid rgba(15,23,42,.10)',
    background: '#fff',
    color: '#0f172a',
    fontWeight: 700,
    boxShadow: '0 8px 18px rgba(15,23,42,.05)',
  },
};

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
    el.setAttribute('download', 'syncup-backup-codes.txt');
    el.style.display = 'none';
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div style={pageStyles.shell}>
      <div style={pageStyles.container}>
        <button
          onClick={() => navigate('/app/profile')}
          style={pageStyles.backButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 14px 28px rgba(15,23,42,.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = pageStyles.backButton.boxShadow;
          }}
        >
          <i className="fa-solid fa-arrow-left" /> Back to Profile
        </button>

        <div style={pageStyles.card}>
          <div style={pageStyles.cardGlow} aria-hidden="true" />
          <div style={pageStyles.hero}>
            <div style={pageStyles.eyebrow}>
              <i className="fa-solid fa-shield-halved" /> Account Security
            </div>
            <h1 style={pageStyles.headline}>Two-Factor Authentication</h1>
            <p style={pageStyles.subhead}>
              Secure your account with an extra layer of protection. Set up an authenticator app and save your backup codes before you finish.
            </p>

            <div style={pageStyles.stats}>
              <div style={pageStyles.stat}>
                <div style={pageStyles.statIcon}>
                  <i className="fa-solid fa-qrcode" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Fast setup</div>
                  <div style={{ fontSize: '.88rem', color: '#475569' }}>Scan the QR code once</div>
                </div>
              </div>
              <div style={pageStyles.stat}>
                <div style={{ ...pageStyles.statIcon, background: 'rgba(59,130,246,.12)', color: '#1d4ed8' }}>
                  <i className="fa-solid fa-lock" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Stronger login</div>
                  <div style={{ fontSize: '.88rem', color: '#475569' }}>Add a second verification step</div>
                </div>
              </div>
              <div style={pageStyles.stat}>
                <div style={{ ...pageStyles.statIcon, background: 'rgba(249,115,22,.12)', color: '#c2410c' }}>
                  <i className="fa-solid fa-key" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Recovery ready</div>
                  <div style={{ fontSize: '.88rem', color: '#475569' }}>Keep backup codes safe</div>
                </div>
              </div>
            </div>
          </div>

          <div style={pageStyles.content}>
            {user?.twoFA?.enabled ? (
              <div style={{ display: 'grid', gap: 18 }}>
                <div style={pageStyles.notice}>
                  <i className="fa-solid fa-shield-check" style={{ fontSize: '1.4rem', marginTop: 2 }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: 4 }}>2FA is currently enabled.</strong>
                    <div style={{ fontSize: '.95rem', lineHeight: 1.6, color: '#14532d' }}>Your account is protected with an authenticator app.</div>
                  </div>
                </div>

                <div style={pageStyles.sectionCard}>
                  <div style={pageStyles.step}>
                    <i className="fa-solid fa-circle-check" /> Active protection
                  </div>
                  <h3 style={pageStyles.sectionTitle}>Disable 2FA</h3>
                  <p style={pageStyles.sectionText}>
                    To turn off 2FA, enter your password and a current authenticator code.
                  </p>

                  <form onSubmit={handleDisable} style={pageStyles.form}>
                    <div>
                      <label className="form-label" style={pageStyles.label}>Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="form-input"
                        style={pageStyles.input}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label" style={pageStyles.label}>Authenticator Code</label>
                      <input
                        type="text"
                        value={disableToken}
                        onChange={e => setDisableToken(e.target.value.replace(/\D/g, ''))}
                        maxLength={6}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        className="form-input"
                        style={{ ...pageStyles.input, letterSpacing: '.22em', fontVariantNumeric: 'tabular-nums' }}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn--danger"
                      disabled={disabling}
                      style={{
                        ...pageStyles.primaryButton,
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        boxShadow: '0 14px 26px rgba(220,38,38,.24)',
                        cursor: disabling ? 'progress' : 'pointer',
                        opacity: disabling ? 0.85 : 1,
                      }}
                    >
                      {disabling ? 'Disabling...' : 'Disable 2FA'}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 28 }}>
                {setupData && (
                  <div style={pageStyles.sectionGrid}>
                    <div style={pageStyles.sectionCard}>
                      <div style={pageStyles.step}>
                        <i className="fa-solid fa-mobile-screen-button" /> Step 1
                      </div>
                      <h3 style={pageStyles.sectionTitle}>Scan QR Code</h3>
                      <p style={pageStyles.sectionText}>
                        Open Google Authenticator, Authy, or another authenticator app and scan the code below.
                      </p>
                      <div style={pageStyles.qrShell}>
                        <div style={pageStyles.qrFrame}>
                          <QRCodeSVG value={setupData} size={210} />
                        </div>
                      </div>
                    </div>

                    <div style={pageStyles.sectionCard}>
                      <div style={pageStyles.step}>
                        <i className="fa-solid fa-keyboard" /> Step 2
                      </div>
                      <h3 style={pageStyles.sectionTitle}>Enter Verification Code</h3>
                      <p style={pageStyles.sectionText}>
                        Type the 6-digit code from your authenticator app to activate 2FA.
                      </p>

                      <form onSubmit={handleEnable} style={pageStyles.form}>
                        <div>
                          <label className="form-label" style={pageStyles.label}>6-digit code</label>
                          <input
                            type="text"
                            value={token}
                            onChange={e => setToken(e.target.value.replace(/\D/g, ''))}
                            maxLength={6}
                            placeholder="000000"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            style={pageStyles.codeInput}
                            required
                          />
                          <div style={{ marginTop: 10, fontSize: '.84rem', lineHeight: 1.5, color: '#64748b' }}>
                            Codes rotate every 30 seconds. Enter the current one shown in your app.
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={token.length !== 6 || verifying}
                          style={{
                            ...pageStyles.primaryButton,
                            opacity: token.length === 6 ? 1 : 0.55,
                            cursor: token.length === 6 && !verifying ? 'pointer' : 'not-allowed',
                          }}
                        >
                          {verifying ? 'Verifying...' : 'Enable 2FA'}
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {backupCodes.length > 0 && (
                  <div style={{ ...pageStyles.sectionCard, ...pageStyles.backupCard }}>
                    <div style={pageStyles.step}>
                      <i className="fa-solid fa-file-shield" /> Step 3
                    </div>
                    <h3 style={pageStyles.sectionTitle}>Save Backup Codes</h3>
                    <p style={pageStyles.sectionText}>
                      If you lose access to your authenticator app, these backup codes let you log in once each. Store them somewhere safe.
                    </p>
                    <div style={pageStyles.backupGrid}>
                      {backupCodes.map((c, i) => (
                        <div key={i} style={pageStyles.backupCode}>{c}</div>
                      ))}
                    </div>
                    <div style={pageStyles.actionRow}>
                      <button onClick={copyCodes} style={pageStyles.secondaryButton}>
                        <i className="fa-regular fa-copy" /> Copy All
                      </button>
                      <button onClick={downloadCodes} style={pageStyles.secondaryButton}>
                        <i className="fa-solid fa-download" /> Download .txt
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
