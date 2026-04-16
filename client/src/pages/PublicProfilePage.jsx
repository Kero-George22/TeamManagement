import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../lib/api';
import Topbar from '../components/layout/Topbar';
import Avatar from '../components/ui/Avatar';
import { fmtDate } from '../lib/utils';

export default function PublicProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        setLoading(true);
        const data = await API.profile.public(userId);
        if (isMounted) {
          setProfile(data?.user || data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'Could not load profile.');
          console.error(err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <>
        <Topbar title="Profile" />
        <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
          <div className="card skeleton" style={{ height: 300, maxWidth: 700, margin: '0 auto' }} />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Topbar title="Profile Error" />
        <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
          <div
            className="card"
            style={{
              maxWidth: 700,
              margin: '0 auto',
              borderLeft: '4px solid var(--red)',
              padding: 24,
            }}
          >
            <div style={{ color: 'var(--red)', fontWeight: 600, marginBottom: 8 }}>
              Error Loading Profile
            </div>
            <p style={{ color: 'var(--text-muted)' }}>{error}</p>
          </div>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Topbar title="Profile Not Found" />
        <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
          <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              User profile not found.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title={`${profile.username}'s Profile`} />
      <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
          {/* Header with Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 28 }}>
            <Avatar user={profile} size="xl" />
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0' }}>
                {profile.username}
              </h1>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Joined {fmtDate(profile.createdAt)}
                </p>
                {profile.lastSeen && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Last active {fmtDate(profile.lastSeen)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bio Section */}
          {profile.bio && (
            <div
              style={{
                marginBottom: 28,
                padding: 20,
                background: 'var(--bg)',
                borderRadius: 'var(--sm-radius)',
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>About</h3>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                {profile.bio}
              </p>
            </div>
          )}

          {/* Send Message Button */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <button
              onClick={() =>
                navigate(`/app/messages?user=${profile.id || profile._id}`)
              }
              className="btn btn--primary"
              style={{ width: '100%' }}
            >
              <i className="fa-solid fa-paper-plane" style={{ marginRight: 8 }} />
              Send Message
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
