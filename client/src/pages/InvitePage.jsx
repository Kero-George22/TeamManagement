import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { useToast } from '../lib/toast';

export default function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [project, setProject] = useState(null);
  
  const [selectedRole, setSelectedRole] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function fetchInvite() {
      if (!API.isLoggedIn()) {
        toast.error('You must be logged in to view an invite.');
        navigate('/app/login');
        return;
      }

      try {
        const proj = await API.projects.getProjectByInviteToken(token);
        setProject(proj);
        if (proj.rolesRequired && proj.rolesRequired.length > 0) {
          const availableRoles = proj.rolesRequired.filter(r => (r.totalSlots - (r.filledSlots || 0)) > 0);
          if (availableRoles.length > 0) {
            setSelectedRole(availableRoles[0].roleName);
          } else if (proj.rolesRequired.length > 0) {
            setSelectedRole(proj.rolesRequired[0].roleName);
          }
        }
      } catch (err) {
        setError(err.message || 'Invalid or expired invite link.');
      } finally {
        setLoading(false);
      }
    }

    fetchInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleJoin(e) {
    e.preventDefault();
    if (!selectedRole) {
      toast.error('Please select a role to join as.');
      return;
    }
    
    setJoining(true);
    try {
      const result = await API.projects.joinViaInvite(token, selectedRole);
      toast.success(result?.message || 'Successfully joined the project!');
      if (result?.project?._id || result?.projectId) {
        navigate(`/app/project/${result.project?._id || result.projectId}`);
      } else if (project?._id) {
        navigate(`/app/project/${project._id}`);
      } else {
        navigate('/app/projects');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to join project using this invite link.');
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <div className="card" style={{ padding: '16px 20px', fontWeight: 700 }}>
          Loading invite details...
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <div className="card" style={{ padding: '24px 32px', textAlign: 'center', maxWidth: 400 }}>
          <h3 style={{ marginBottom: 8 }}>Invalid Invite Link</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>{error}</p>
          <button className="btn btn--primary" onClick={() => navigate('/app/dashboard')}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const availableRoles = project.rolesRequired?.filter(r => (r.totalSlots - (r.filledSlots || 0)) > 0) || [];

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
      <div className="card" style={{ padding: '32px', maxWidth: 450, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 style={{ marginBottom: 8 }}>You've been invited!</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            You've been invited to join <strong>{project.title}</strong>.
          </p>
        </div>

        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Join as Role</label>
            <select 
              className="form-input" 
              value={selectedRole} 
              onChange={e => setSelectedRole(e.target.value)}
              required
            >
              {availableRoles.length === 0 && <option value="" disabled>No available roles</option>}
              {availableRoles.map(role => (
                <option key={role.roleName} value={role.roleName}>
                  {role.roleName}
                </option>
              ))}
            </select>
          </div>

          <button 
            type="submit" 
            className="btn btn--primary" 
            style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
            disabled={joining || availableRoles.length === 0}
          >
            {joining ? 'Joining...' : 'Accept Invite & Join'}
          </button>

          <button 
            type="button" 
            className="btn btn--outline" 
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => navigate('/app/projects')}
            disabled={joining}
          >
            Decline
          </button>
        </form>
      </div>
    </div>
  );
}
