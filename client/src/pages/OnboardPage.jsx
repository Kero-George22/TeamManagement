import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../lib/toast';
import API from '../lib/api';
import Cropper from 'react-easy-crop';

const CATEGORIES = [
  { id: 'Web Development', icon: 'fa-globe', color: '#3b82f6' },
  { id: 'Mobile Development', icon: 'fa-mobile-screen', color: '#8b5cf6' },
  { id: 'UI/UX Design', icon: 'fa-palette', color: '#ec4899' },
  { id: 'DevOps & Cloud', icon: 'fa-cloud', color: '#06b6d4' },
  { id: 'AI & Machine Learning', icon: 'fa-brain', color: '#f59e0b' },
  { id: 'Cybersecurity', icon: 'fa-shield-halved', color: '#22c55e' },
  { id: 'Blockchain', icon: 'fa-link', color: '#f97316' },
  { id: 'Data Science', icon: 'fa-chart-bar', color: '#a855f7' },
  { id: 'Game Development', icon: 'fa-gamepad', color: '#ef4444' },
  { id: 'Open Source', icon: 'fa-code', color: '#14b8a6' },
];

function SkillTag({ label, onRemove }) {
  return (
    <span className="skill-tag">
      {label}
      <button onClick={() => onRemove(label)}>&times;</button>
      <style>{`.skill-tag { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; background: rgba(59,130,246,.08); color: #3b82f6; border-radius: 8px; font-size: .8rem; font-weight: 600; } .skill-tag button { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 1rem; line-height: 1; padding: 0; opacity: .6; } .skill-tag button:hover { opacity: 1; }`}</style>
    </span>
  );
}

export default function OnboardPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropFileUrl, setCropFileUrl] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [bio, setBio] = useState('');
  const [headline, setHeadline] = useState('');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [interests, setInterests] = useState([]);

  // If already has username, redirect to dashboard
  useEffect(() => {
    if (!user) {
      navigate('/app/login', { replace: true });
    } else if (user.username) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [user, navigate]);

  if (!user) return null;

  const totalSteps = 3;

  function nextStep() {
    if (step === 1) { setStep(2); return; }
    if (step === 2) {
      if (!username.trim()) { setUsernameError('You need a name to continue'); return; }
      setUsernameError('');
      setStep(3);
    }
  }

  function prevStep() {
    if (step > 1) setStep(s => s - 1);
  }

  function handleAvatarSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCropFileUrl(url);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setCropModalOpen(true);
    e.target.value = null;
  }

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  async function getCroppedImg(imageSrc, pixelCrop) {
    const image = new Image();
    image.src = imageSrc;
    await new Promise(resolve => (image.onload = resolve));
    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' })), 'image/jpeg');
    });
  }

  async function handleCropSave() {
    try {
      const croppedFile = await getCroppedImg(cropFileUrl, croppedAreaPixels);
      setAvatarFile(croppedFile);
      setAvatarPreview(URL.createObjectURL(croppedFile));
      setCropModalOpen(false);
    } catch (err) {
      toast.error('Failed to crop image');
    }
  }

  function removeAvatar() {
    setAvatarFile(null);
    setAvatarPreview(null);
  }

  function addSkill(e) {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      const s = skillInput.trim();
      if (!skills.includes(s)) setSkills(prev => [...prev, s]);
      setSkillInput('');
    }
  }

  function removeSkill(label) {
    setSkills(prev => prev.filter(s => s !== label));
  }

  function toggleInterest(catId) {
    setInterests(prev => prev.includes(catId) ? prev.filter(i => i !== catId) : [...prev, catId]);
  }

  async function finishOnboarding() {
    if (!username.trim()) { setUsernameError('Username is required'); setStep(2); return; }
    setSubmitting(true);
    try {
      let avatarUrl = user.avatar || null;
      if (avatarFile) {
        const avatarRes = await API.profile.uploadAvatar(avatarFile);
        avatarUrl = (avatarRes?.user || avatarRes)?.avatar || avatarUrl;
      }
      const updated = await API.profile.update({
        username: username.trim(),
        ...(headline && { headline }),
        ...(bio && { bio }),
        ...(skills.length > 0 && { skills }),
      });
      const normalized = updated?.user || updated;
      if (avatarUrl && avatarUrl !== normalized.avatar) normalized.avatar = avatarUrl;
      updateUser(normalized);
      toast.success('Welcome to TeamForge!');
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="onboard-page">
      <div className="onboard-card">
        {/* Progress */}
        <div className="onboard-progress">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`onboard-step-dot ${i + 1 <= step ? 'active' : ''} ${i + 1 < step ? 'done' : ''}`}>
              {i + 1 < step ? <i className="fa-solid fa-check" /> : i + 1}
            </div>
          ))}
          <div className="onboard-progress-bar">
            <div className="onboard-progress-fill" style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }} />
          </div>
        </div>

        {/* ── Step 1: Welcome ────────────────────────── */}
        {step === 1 && (
          <div className="onboard-step">
            <div className="onboard-icon-wrap">
              <i className="fa-solid fa-hand-wave" />
            </div>
            <h1 className="onboard-title">Welcome to TeamForge</h1>
            <p className="onboard-desc">
              The platform where teams build together. Create projects, assign tasks,
              track progress, and collaborate in real time — all in one place.
            </p>
            <div className="onboard-features">
              {[
                { icon: 'fa-list-check', text: 'Task & Project Management' },
                { icon: 'fa-users', text: 'Team Collaboration' },
                { icon: 'fa-chart-line', text: 'Progress Analytics' },
                { icon: 'fa-message', text: 'Real-time Communication' },
              ].map(f => (
                <div key={f.icon} className="onboard-feature-item">
                  <span className="onboard-feature-icon"><i className={`fa-solid ${f.icon}`} /></span>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
            <button className="btn btn--primary btn--lg" onClick={nextStep} style={{ marginTop: 28, width: '100%' }}>
              Get Started <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        )}

        {/* ── Step 2: Name + Photo ───────────────────── */}
        {step === 2 && (
          <div className="onboard-step">
            <h2 className="onboard-title" style={{ fontSize: '1.5rem' }}>What should we call you?</h2>
            <p className="onboard-desc">Choose a display name and optionally add a profile photo.</p>

            <div className="onboard-avatar-section">
              <div className="onboard-avatar-wrap" onClick={() => fileInputRef.current?.click()}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="onboard-avatar-img" />
                ) : user.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="onboard-avatar-img" />
                ) : (
                  <div className="onboard-avatar-placeholder">
                    <i className="fa-solid fa-camera" />
                  </div>
                )}
                <div className="onboard-avatar-overlay">
                  <i className="fa-solid fa-camera" />
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarSelect} />
              {avatarPreview && (
                <button className="onboard-remove-avatar" onClick={removeAvatar}>
                  <i className="fa-solid fa-xmark" /> Remove
                </button>
              )}
            </div>

            <div className="form-group" style={{ width: '100%' }}>
              <label className="form-label">Display Name *</label>
              <input
                className={`form-input ${usernameError ? 'input--error' : ''}`}
                placeholder="e.g. Ahmed Ali"
                value={username}
                onChange={e => { setUsername(e.target.value); setUsernameError(''); }}
                autoFocus
                maxLength={50}
              />
              {usernameError && <div className="form-error">{usernameError}</div>}
            </div>

            <div className="onboard-step-actions">
              <button className="btn btn--ghost" onClick={prevStep}>Back</button>
              <button className="btn btn--primary" onClick={nextStep}>
                Continue <i className="fa-solid fa-arrow-right" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Skills & Interests (Optional) ──── */}
        {step === 3 && (
          <div className="onboard-step">
            <h2 className="onboard-title" style={{ fontSize: '1.5rem' }}>Tell us about yourself</h2>
            <p className="onboard-desc">Add your skills and interests — or skip and do this later.</p>

            <div className="form-group" style={{ width: '100%' }}>
              <label className="form-label">Headline</label>
              <input
                className="form-input"
                placeholder="e.g. Full-Stack Developer"
                value={headline}
                onChange={e => setHeadline(e.target.value)}
                maxLength={120}
              />
            </div>

            <div className="form-group" style={{ width: '100%' }}>
              <label className="form-label">Bio</label>
              <textarea
                className="form-input"
                placeholder="Write a short bio about yourself..."
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                maxLength={1000}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group" style={{ width: '100%' }}>
              <label className="form-label">Skills</label>
              <input
                className="form-input"
                placeholder="Type a skill and press Enter"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={addSkill}
              />
              {skills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {skills.map(s => <SkillTag key={s} label={s} onRemove={removeSkill} />)}
                </div>
              )}
            </div>

            <div className="form-group" style={{ width: '100%' }}>
              <label className="form-label">Interested Categories</label>
              <div className="onboard-categories">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    className={`onboard-cat-btn ${interests.includes(cat.id) ? 'active' : ''}`}
                    onClick={() => toggleInterest(cat.id)}
                    style={interests.includes(cat.id) ? { borderColor: cat.color, background: `${cat.color}10`, color: cat.color } : {}}
                  >
                    <i className={`fa-solid ${cat.icon}`} />
                    {cat.id}
                  </button>
                ))}
              </div>
            </div>

            <div className="onboard-step-actions">
              <button className="btn btn--ghost" onClick={prevStep}>Back</button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn--outline" onClick={finishOnboarding} disabled={submitting}>
                  Skip
                </button>
                <button className="btn btn--primary" onClick={finishOnboarding} disabled={submitting}>
                  {submitting ? <><i className="fa-solid fa-circle-notch fa-spin" /> Saving...</> : 'Complete Setup'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Crop Modal */}
      {cropModalOpen && (
        <div className="onboard-crop-overlay" onClick={() => setCropModalOpen(false)}>
          <div className="onboard-crop-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700 }}>Crop your photo</h3>
            <div style={{ position: 'relative', width: '100%', height: 280, background: '#000', borderRadius: 12, overflow: 'hidden' }}>
              <Cropper
                image={cropFileUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
              <i className="fa-solid fa-minus" style={{ color: 'var(--text-muted)' }} />
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <i className="fa-solid fa-plus" style={{ color: 'var(--text-muted)' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn--ghost" onClick={() => setCropModalOpen(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleCropSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .onboard-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
          padding: 20px;
        }
        .onboard-card {
          width: 100%;
          max-width: 480px;
          background: #fff;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 4px 24px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.04);
        }
        /* Progress */
        .onboard-progress {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 32px;
          position: relative;
        }
        .onboard-progress-bar {
          position: absolute;
          top: 50%; left: 0; right: 0;
          height: 3px;
          background: #e2e8f0;
          border-radius: 99px;
          transform: translateY(-50%);
          z-index: 0;
        }
        .onboard-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          border-radius: 99px;
          transition: width .4s ease;
        }
        .onboard-step-dot {
          position: relative;
          z-index: 1;
          width: 32px; height: 32px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: .8rem; font-weight: 700;
          background: #e2e8f0;
          color: #94a3b8;
          transition: all .3s;
        }
        .onboard-step-dot.active {
          background: #3b82f6;
          color: #fff;
          box-shadow: 0 0 0 4px rgba(59,130,246,.15);
        }
        .onboard-step-dot.done {
          background: #22c55e;
          color: #fff;
        }
        /* Step content */
        .onboard-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: fadeSlideIn .35s ease;
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .onboard-icon-wrap {
          width: 72px; height: 72px;
          background: linear-gradient(135deg, rgba(59,130,246,.12), rgba(139,92,246,.12));
          border-radius: 24px;
          display: flex; align-items: center; justify-content: center;
          font-size: 2rem;
          margin-bottom: 20px;
          color: #3b82f6;
        }
        .onboard-title {
          margin: 0 0 8px;
          font-size: 1.8rem;
          font-weight: 800;
          text-align: center;
          color: var(--text-primary);
        }
        .onboard-desc {
          margin: 0 0 24px;
          color: var(--text-secondary);
          text-align: center;
          line-height: 1.6;
          font-size: .95rem;
        }
        .onboard-features {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }
        .onboard-feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: var(--bg);
          border-radius: 12px;
          font-size: .88rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .onboard-feature-icon {
          width: 32px; height: 32px;
          background: rgba(59,130,246,.08);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: #3b82f6;
          font-size: .85rem;
          flex-shrink: 0;
        }
        /* Avatar */
        .onboard-avatar-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        .onboard-avatar-wrap {
          position: relative;
          width: 100px; height: 100px;
          border-radius: 50%;
          cursor: pointer;
          overflow: hidden;
          border: 3px dashed var(--border);
          transition: all .2s;
        }
        .onboard-avatar-wrap:hover { border-color: #3b82f6; }
        .onboard-avatar-img {
          width: 100%; height: 100%;
          object-fit: cover;
        }
        .onboard-avatar-placeholder {
          width: 100%; height: 100%;
          background: var(--bg);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-muted);
          font-size: 1.5rem;
        }
        .onboard-avatar-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,.4);
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          font-size: 1.2rem;
          opacity: 0;
          transition: opacity .2s;
        }
        .onboard-avatar-wrap:hover .onboard-avatar-overlay { opacity: 1; }
        .onboard-remove-avatar {
          background: none;
          border: none;
          color: #ef4444;
          font-size: .78rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        /* Form fields */
        .form-group { margin-bottom: 16px; }
        .form-label { display: block; margin-bottom: 6px; font-weight: 700; font-size: .85rem; color: var(--text-primary); }
        .form-input { width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: 10px; font-size: .9rem; outline: none; transition: border-color .15s; background: var(--bg); color: var(--text-primary); box-sizing: border-box; }
        .form-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.1); }
        .form-input.input--error { border-color: #ef4444; }
        .form-error { color: #ef4444; font-size: .8rem; font-weight: 600; margin-top: 4px; }
        .onboard-step-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-top: 20px;
          gap: 12px;
        }
        /* Categories */
        .onboard-categories {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .onboard-cat-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: #fff;
          font-size: .8rem;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all .15s;
        }
        .onboard-cat-btn:hover { border-color: #cbd5e1; background: var(--bg); }
        /* Crop modal */
        .onboard-crop-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .onboard-crop-modal {
          background: #fff;
          border-radius: 20px;
          padding: 24px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 20px 60px rgba(0,0,0,.15);
        }
        @media (max-width: 480px) {
          .onboard-card { padding: 24px; border-radius: 16px; }
          .onboard-title { font-size: 1.3rem; }
        }
      `}</style>
    </div>
  );
}
