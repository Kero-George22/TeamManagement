import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../lib/toast';
import API from '../lib/api';
import Cropper from 'react-easy-crop';

const ROLES = [
  { id: 'Developer', icon: 'fa-code' },
  { id: 'Designer', icon: 'fa-pen-nib' },
  { id: 'Product Manager', icon: 'fa-list-check' },
  { id: 'Student', icon: 'fa-graduation-cap' },
  { id: 'Other', icon: 'fa-user' }
];

const CATEGORIES = [
  { id: 'Web Development', icon: 'fa-globe', color: '#3b82f6' },
  { id: 'Mobile Development', icon: 'fa-mobile-screen', color: '#8b5cf6' },
  { id: 'UI/UX Design', icon: 'fa-palette', color: '#ec4899' },
  { id: 'DevOps & Cloud', icon: 'fa-cloud', color: '#06b6d4' },
  { id: 'AI & Machine Learning', icon: 'fa-brain', color: '#f59e0b' },
  { id: 'Data Science', icon: 'fa-chart-bar', color: '#a855f7' },
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
  const [submitting, setSubmitting] = useState(false);

  // Profile data
  const [role, setRole] = useState(user?.role || '');
  const [username, setUsername] = useState(user?.username || '');
  const [usernameError, setUsernameError] = useState('');
  const [headline, setHeadline] = useState(user?.headline || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [skills, setSkills] = useState(user?.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [interests, setInterests] = useState(user?.interests || []);

  // Project data
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');

  // Invites
  const [inviteEmails, setInviteEmails] = useState('');

  // Avatar crop states
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropFileUrl, setCropFileUrl] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/app/login', { replace: true });
    } else if (user.hasCompletedOnboarding) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [user, navigate]);

  if (!user) return null;

  const totalSteps = 5;

  function nextStep() {
    if (step === 1 && !role) { toast.error('Please select a role'); return; }
    if (step === 2) {
      if (!username.trim()) { setUsernameError('Display name is required'); return; }
      setUsernameError('');
    }
    if (step < totalSteps) setStep(s => s + 1);
  }

  function prevStep() {
    if (step > 1) setStep(s => s - 1);
  }

  // Avatar logic
  function handleAvatarSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFileUrl(URL.createObjectURL(file));
    setZoom(1); setCrop({ x: 0, y: 0 });
    setCropModalOpen(true);
    e.target.value = null;
  }
  const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), []);
  
  async function getCroppedImg(imageSrc, pixelCrop) {
    const image = new Image(); image.src = imageSrc;
    await new Promise(res => (image.onload = res));
    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width; canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
    return new Promise(res => canvas.toBlob(blob => res(new File([blob], 'avatar.jpg', { type: 'image/jpeg' })), 'image/jpeg'));
  }

  async function handleCropSave() {
    try {
      const croppedFile = await getCroppedImg(cropFileUrl, croppedAreaPixels);
      setAvatarFile(croppedFile);
      setAvatarPreview(URL.createObjectURL(croppedFile));
      setCropModalOpen(false);
    } catch (err) { toast.error('Failed to crop image'); }
  }

  // Skills & Interests
  function addSkill(e) {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      const s = skillInput.trim();
      if (!skills.includes(s)) setSkills(p => [...p, s]);
      setSkillInput('');
    }
  }
  function toggleInterest(catId) {
    setInterests(p => p.includes(catId) ? p.filter(i => i !== catId) : [...p, catId]);
  }

  // Final Submit
  async function finishOnboarding() {
    setSubmitting(true);
    try {
      // 1. Upload Avatar
      let avatarUrl = user.avatar || null;
      if (avatarFile) {
        const avatarRes = await API.profile.uploadAvatar(avatarFile);
        avatarUrl = (avatarRes?.user || avatarRes)?.avatar || avatarUrl;
      }
      
      // 2. Update Profile & complete onboarding
      const updatedProfile = await API.profile.update({
        username: username.trim(),
        role,
        headline,
        bio,
        skills,
        interests,
        hasCompletedOnboarding: true
      });
      const normalizedUser = updatedProfile?.user || updatedProfile;
      if (avatarUrl) normalizedUser.avatar = avatarUrl;
      updateUser(normalizedUser);

      // 3. Create Project if provided
      if (projectName.trim()) {
        try {
          await API.projects.create({
            title: projectName.trim(),
            description: projectDesc.trim() || 'My first project',
            category: interests[0] || 'Web Development',
            isPrivate: true
          });
        } catch (err) {
          console.error('Failed to create initial project', err);
        }
      }

      // 4. Invite Teammates (UI mock for now)
      if (inviteEmails.trim()) {
        toast.success('Invitations queued successfully!');
      }

      toast.success('Welcome to SyncUp!');
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to complete setup');
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

        {/* Step 1: Welcome & Role Selection */}
        {step === 1 && (
          <div className="onboard-step">
            <div className="onboard-icon-wrap"><i className="fa-solid fa-hand-wave" /></div>
            <h1 className="onboard-title">Welcome to SyncUp</h1>
            <p className="onboard-desc">To personalize your experience, what is your primary role?</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
              {ROLES.map(r => (
                <button
                  key={r.id}
                  className={`role-btn ${role === r.id ? 'active' : ''}`}
                  onClick={() => setRole(r.id)}
                >
                  <i className={`fa-solid ${r.icon}`} />
                  {r.id}
                </button>
              ))}
            </div>
            
            <button className="btn btn--primary btn--lg" onClick={nextStep} disabled={!role} style={{ marginTop: 32, width: '100%' }}>
              Continue <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        )}

        {/* Step 2: Name, Avatar, Skills & Interests */}
        {step === 2 && (
          <div className="onboard-step">
            <h2 className="onboard-title">Setup your Profile</h2>
            <p className="onboard-desc">This is how your team will see you.</p>

            <div className="onboard-avatar-section">
              <div className="onboard-avatar-wrap" onClick={() => fileInputRef.current?.click()}>
                {avatarPreview || user.avatar ? (
                  <img src={avatarPreview || user.avatar} alt="Avatar" className="onboard-avatar-img" />
                ) : (
                  <div className="onboard-avatar-placeholder"><i className="fa-solid fa-camera" /></div>
                )}
                <div className="onboard-avatar-overlay"><i className="fa-solid fa-camera" /></div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarSelect} />
            </div>

            <div className="form-group">
              <label className="form-label">Display Name *</label>
              <input className={`form-input ${usernameError ? 'input--error' : ''}`} value={username} onChange={e => { setUsername(e.target.value); setUsernameError(''); }} placeholder="e.g. Ahmed Ali" autoFocus />
              {usernameError && <div className="form-error">{usernameError}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Headline / Title</label>
              <input className="form-input" value={headline} onChange={e => setHeadline(e.target.value)} placeholder={`e.g. Senior ${role || 'Developer'}`} />
            </div>

            <div className="form-group">
              <label className="form-label">Skills</label>
              <input className="form-input" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={addSkill} placeholder="Type a skill and press Enter" />
              {skills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {skills.map(s => <SkillTag key={s} label={s} onRemove={l => setSkills(p => p.filter(x => x !== l))} />)}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Interests</label>
              <div className="onboard-categories">
                {CATEGORIES.map(cat => (
                  <button key={cat.id} className={`onboard-cat-btn ${interests.includes(cat.id) ? 'active' : ''}`} onClick={() => toggleInterest(cat.id)}>
                    <i className={`fa-solid ${cat.icon}`} style={{ color: interests.includes(cat.id) ? cat.color : '' }} />
                    {cat.id}
                  </button>
                ))}
              </div>
            </div>

            <div className="onboard-step-actions">
              <button className="btn btn--ghost" onClick={prevStep}>Back</button>
              <button className="btn btn--primary" onClick={nextStep}>Continue <i className="fa-solid fa-arrow-right" /></button>
            </div>
          </div>
        )}

        {/* Step 3: Create First Project */}
        {step === 3 && (
          <div className="onboard-step">
            <div className="onboard-icon-wrap"><i className="fa-solid fa-rocket" /></div>
            <h2 className="onboard-title">Start your First Project</h2>
            <p className="onboard-desc">Create a workspace to start organizing your tasks and team.</p>

            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input className="form-input" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. SyncUp V2" autoFocus />
            </div>
            
            <div className="form-group">
              <label className="form-label">Description (Optional)</label>
              <textarea className="form-input" value={projectDesc} onChange={e => setProjectDesc(e.target.value)} rows={3} placeholder="What is this project about?" />
            </div>

            <div className="onboard-step-actions">
              <button className="btn btn--ghost" onClick={prevStep}>Back</button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn--outline" onClick={nextStep}>Skip for now</button>
                <button className="btn btn--primary" onClick={nextStep} disabled={!projectName.trim()}>Continue <i className="fa-solid fa-arrow-right" /></button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Quick Tutorial */}
        {step === 4 && (
          <div className="onboard-step">
            <h2 className="onboard-title">How SyncUp Works</h2>
            <p className="onboard-desc">Master the platform in 3 simple steps.</p>
            
            <div className="tutorial-carousel">
               <div className="tutorial-item">
                 <div className="t-icon"><i className="fa-solid fa-folder-tree" /></div>
                 <h3>1. Organize Projects</h3>
                 <p>Break down your work into projects, boards, and tasks. Keep everything centralized.</p>
               </div>
               <div className="tutorial-item">
                 <div className="t-icon"><i className="fa-solid fa-robot" /></div>
                 <h3>2. Leverage AI</h3>
                 <p>Use Gemini AI to generate tasks, write code reviews, and plan your sprints instantly.</p>
               </div>
               <div className="tutorial-item">
                 <div className="t-icon"><i className="fa-solid fa-comments" /></div>
                 <h3>3. Collaborate Real-time</h3>
                 <p>Chat in the Project Office, mention teammates, and get live notifications.</p>
               </div>
            </div>

            <div className="onboard-step-actions" style={{ marginTop: 32 }}>
              <button className="btn btn--ghost" onClick={prevStep}>Back</button>
              <button className="btn btn--primary" onClick={nextStep}>Got it, let's go! <i className="fa-solid fa-arrow-right" /></button>
            </div>
          </div>
        )}

        {/* Step 5: Invite Teammates */}
        {step === 5 && (
          <div className="onboard-step">
            <div className="onboard-icon-wrap"><i className="fa-solid fa-user-plus" /></div>
            <h2 className="onboard-title">Invite your Team</h2>
            <p className="onboard-desc">SyncUp is better with friends. Send them an invite link to join your workspace.</p>

            <div className="form-group">
              <label className="form-label">Email Addresses (comma separated)</label>
              <textarea 
                className="form-input" 
                value={inviteEmails} 
                onChange={e => setInviteEmails(e.target.value)} 
                rows={3} 
                placeholder="ahmed@example.com, sarah@example.com" 
              />
            </div>

            <div className="onboard-step-actions" style={{ marginTop: 32 }}>
              <button className="btn btn--ghost" onClick={prevStep} disabled={submitting}>Back</button>
              <button className="btn btn--primary" onClick={finishOnboarding} disabled={submitting}>
                {submitting ? <><i className="fa-solid fa-circle-notch fa-spin" /> Saving...</> : 'Complete Setup & Enter App'}
              </button>
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
              <Cropper image={cropFileUrl} crop={crop} zoom={zoom} aspect={1} cropShape="round" onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
              <i className="fa-solid fa-minus" style={{ color: 'var(--text-muted)' }} />
              <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={e => setZoom(Number(e.target.value))} style={{ flex: 1 }} />
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
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%); padding: 20px;
        }
        .onboard-card {
          width: 100%; max-width: 520px; background: #fff; border-radius: 24px; padding: 40px;
          box-shadow: 0 4px 24px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.04);
        }
        .onboard-progress { display: flex; align-items: center; gap: 8px; margin-bottom: 32px; position: relative; }
        .onboard-progress-bar { position: absolute; top: 50%; left: 0; right: 0; height: 3px; background: #e2e8f0; border-radius: 99px; transform: translateY(-50%); z-index: 0; }
        .onboard-progress-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6); border-radius: 99px; transition: width .4s ease; }
        .onboard-step-dot { position: relative; z-index: 1; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .8rem; font-weight: 700; background: #e2e8f0; color: #94a3b8; transition: all .3s; }
        .onboard-step-dot.active { background: #3b82f6; color: #fff; box-shadow: 0 0 0 4px rgba(59,130,246,.15); }
        .onboard-step-dot.done { background: #22c55e; color: #fff; }
        .onboard-step { display: flex; flex-direction: column; align-items: center; animation: fadeSlideIn .35s ease; width: 100%; }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .onboard-icon-wrap { width: 72px; height: 72px; background: linear-gradient(135deg, rgba(59,130,246,.12), rgba(139,92,246,.12)); border-radius: 24px; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 20px; color: #3b82f6; }
        .onboard-title { margin: 0 0 8px; font-size: 1.8rem; font-weight: 800; text-align: center; color: var(--text-primary); }
        .onboard-desc { margin: 0 0 24px; color: var(--text-secondary); text-align: center; line-height: 1.6; font-size: .95rem; }
        .form-group { width: 100%; margin-bottom: 16px; text-align: left; }
        .form-label { display: block; margin-bottom: 6px; font-weight: 700; font-size: .85rem; color: var(--text-primary); }
        .form-input { width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: 10px; font-size: .9rem; outline: none; transition: border-color .15s; background: var(--bg); color: var(--text-primary); box-sizing: border-box; }
        .form-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.1); }
        .form-input.input--error { border-color: #ef4444; }
        .form-error { color: #ef4444; font-size: .8rem; font-weight: 600; margin-top: 4px; }
        .onboard-step-actions { display: flex; alignItems: center; justify-content: space-between; width: 100%; margin-top: 20px; gap: 12px; }
        
        /* Roles */
        .role-btn { padding: 16px; border: 2px solid var(--border); border-radius: 16px; background: #fff; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 10px; font-weight: 600; color: var(--text-secondary); transition: all .2s; }
        .role-btn:hover { border-color: #cbd5e1; background: var(--bg); }
        .role-btn.active { border-color: #3b82f6; background: rgba(59,130,246,.05); color: #3b82f6; }
        .role-btn i { font-size: 1.5rem; }

        /* Categories */
        .onboard-categories { display: flex; flex-wrap: wrap; gap: 8px; }
        .onboard-cat-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 10px; border: 1px solid var(--border); background: #fff; font-size: .8rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all .15s; }
        .onboard-cat-btn:hover { border-color: #cbd5e1; background: var(--bg); }
        .onboard-cat-btn.active { border-color: #3b82f6; background: rgba(59,130,246,.1); color: #3b82f6; }

        /* Avatar */
        .onboard-avatar-section { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 20px; }
        .onboard-avatar-wrap { position: relative; width: 100px; height: 100px; border-radius: 50%; cursor: pointer; overflow: hidden; border: 3px dashed var(--border); transition: all .2s; }
        .onboard-avatar-wrap:hover { border-color: #3b82f6; }
        .onboard-avatar-img { width: 100%; height: 100%; object-fit: cover; }
        .onboard-avatar-placeholder { width: 100%; height: 100%; background: var(--bg); display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 1.5rem; }
        .onboard-avatar-overlay { position: absolute; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.2rem; opacity: 0; transition: opacity .2s; }
        .onboard-avatar-wrap:hover .onboard-avatar-overlay { opacity: 1; }

        /* Tutorial */
        .tutorial-carousel { display: flex; flex-direction: column; gap: 16px; width: 100%; }
        .tutorial-item { padding: 16px; background: var(--bg); border-radius: 16px; display: flex; flex-direction: column; gap: 6px; text-align: left; }
        .tutorial-item .t-icon { width: 40px; height: 40px; background: rgba(59,130,246,.1); color: #3b82f6; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 4px; }
        .tutorial-item h3 { margin: 0; font-size: 1rem; color: var(--text-primary); }
        .tutorial-item p { margin: 0; font-size: .85rem; color: var(--text-secondary); line-height: 1.5; }

        /* Crop Modal */
        .onboard-crop-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .onboard-crop-modal { background: #fff; border-radius: 20px; padding: 24px; width: 100%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,.15); }
      `}</style>
    </div>
  );
}
