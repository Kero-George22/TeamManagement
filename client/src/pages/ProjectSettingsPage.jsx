import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import { useToast } from '../lib/toast';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

function Switch({ checked, onChange, label, description }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)' }}>{label}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{description}</div>
      </div>
      <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: 40, height: 20 }}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
        <span style={{ 
          position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: checked ? 'var(--green)' : 'var(--border)', 
          transition: '.4s', borderRadius: 20 
        }}>
          <span style={{
            position: 'absolute', content: '""', height: 16, width: 16, left: 2, bottom: 2,
            backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
            transform: checked ? 'translateX(20px)' : 'translateX(0)'
          }}></span>
        </span>
      </label>
    </div>
  );
}

export default function ProjectSettingsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const proj = await API.projects.get(id);
      setProject(proj);
      const perms = await API.projects.getPermissions(id);
      setPermissions(perms);
    } catch (err) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePermissions() {
    setSaving(true);
    try {
      await API.projects.updatePermissions(id, permissions);
      toast.success('Permissions saved successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  }

  const handlePermChange = (key, value) => {
    setPermissions(prev => ({ ...prev, [key]: value }));
  };

  const handleRestrictedStatusToggle = (statusName) => {
    setPermissions(prev => {
      const current = prev.memberRestrictedStatuses || [];
      if (current.includes(statusName)) {
        return { ...prev, memberRestrictedStatuses: current.filter(s => s !== statusName) };
      } else {
        return { ...prev, memberRestrictedStatuses: [...current, statusName] };
      }
    });
  };

  if (loading) {
    return (
      <>
        <Topbar title="Project Settings" onBack={() => navigate(-1)} />
        <div className="card" style={{ padding: 16, margin: 20 }}>Loading...</div>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <Topbar title="Project Settings" onBack={() => navigate(-1)} />
        <div className="card" style={{ padding: 16, margin: 20 }}>Project not found</div>
      </>
    );
  }

  const isOwner = String(project.owner?._id || project.owner) === String(user?._id || user?.id);

  if (!isOwner) {
    return (
      <>
        <Topbar title="Project Settings" onBack={() => navigate(-1)} />
        <div className="card" style={{ padding: 16, margin: 20, color: 'var(--text-error)' }}>
          Only the project owner can access settings.
        </div>
      </>
    );
  }

  const allStatuses = project.taskStatuses || ['Todo', 'In-Progress', 'Review', 'Done', 'Approved'];

  return (
    <>
      <Topbar title={`${project.title} Settings`} onBack={() => navigate(-1)} />
      
      <div className="workspace-grid" style={{ maxWidth: 800, margin: '20px auto' }}>
        <section className="workspace-panel">
          <div className="workspace-header">
            <div>
              <h3 className="section-title" style={{ marginBottom: 4 }}>Member Permissions</h3>
              <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Configure what members are allowed to do in this project.</div>
            </div>
            <button className="btn btn--green" onClick={handleSavePermissions} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          <div style={{ padding: '0 20px 20px 20px' }}>
            <Switch 
              label="Edit Any Task" 
              description="Allow members to edit tasks that are not assigned to them."
              checked={!!permissions?.memberCanEditAnyTask}
              onChange={(val) => handlePermChange('memberCanEditAnyTask', val)}
            />
            <Switch 
              label="Delete Tasks" 
              description="Allow members to delete tasks."
              checked={!!permissions?.memberCanDeleteTask}
              onChange={(val) => handlePermChange('memberCanDeleteTask', val)}
            />
            <Switch 
              label="Change to Any Status" 
              description="Allow members to move tasks to any workflow status. If disabled, you can restrict specific statuses below."
              checked={permissions?.memberCanChangeToAnyStatus !== false}
              onChange={(val) => handlePermChange('memberCanChangeToAnyStatus', val)}
            />

            {permissions?.memberCanChangeToAnyStatus === false && (
              <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: 8, marginTop: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 12 }}>Restricted Statuses</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>Select which statuses members CANNOT move tasks to:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {allStatuses.map(status => {
                    const isRestricted = (permissions.memberRestrictedStatuses || []).includes(status);
                    return (
                      <label key={status} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card-bg)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={isRestricted} 
                          onChange={() => handleRestrictedStatusToggle(status)} 
                        />
                        <span style={{ fontSize: '0.85rem' }}>{status}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <Switch 
              label="Create Statuses" 
              description="Allow members to create new workflow statuses."
              checked={!!permissions?.memberCanCreateStatus}
              onChange={(val) => handlePermChange('memberCanCreateStatus', val)}
            />
            <Switch 
              label="Edit Statuses" 
              description="Allow members to edit existing workflow statuses."
              checked={!!permissions?.memberCanEditStatus}
              onChange={(val) => handlePermChange('memberCanEditStatus', val)}
            />
            <Switch 
              label="Delete Statuses" 
              description="Allow members to delete workflow statuses."
              checked={!!permissions?.memberCanDeleteStatus}
              onChange={(val) => handlePermChange('memberCanDeleteStatus', val)}
            />
            <Switch 
              label="Assign Others" 
              description="Allow members to assign tasks to other people (not just themselves)."
              checked={!!permissions?.memberCanAssignOthers}
              onChange={(val) => handlePermChange('memberCanAssignOthers', val)}
            />
          </div>
        </section>
      </div>
    </>
  );
}
