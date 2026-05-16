import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '24px 40px', alignItems: 'center' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-1px' }}>
          Team<span style={{ color: 'var(--green)' }}>Forge</span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link to="/app/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, padding: '8px 16px' }}>Sign In</Link>
          <Link to="/app/login" className="btn btn--green" style={{ textDecoration: 'none' }}>Get Started</Link>
        </div>
      </header>

      {/* Hero */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 20px' }}>
        <h1 style={{ fontSize: '4.5rem', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1.1, marginBottom: 24, maxWidth: 800 }}>
          Build Teams Around <br/> <span style={{ color: 'var(--green)' }}>Great Project Ideas</span>
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: 600, marginBottom: 40, lineHeight: 1.6 }}>
          Share your idea, find the right collaborators, and manage delivery with AI-assisted workflows.
        </p>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link to="/app/login" className="btn btn--green" style={{ fontSize: '1.1rem', padding: '16px 32px', borderRadius: 12, textDecoration: 'none' }}>Start Building Free</Link>
          <a href="#features" className="btn btn--outline" style={{ fontSize: '1.1rem', padding: '16px 32px', borderRadius: 12, textDecoration: 'none' }}>View Features</a>
        </div>

        {/* Hero Image Mock */}
        <div style={{ marginTop: 80, width: '100%', maxWidth: 1000, height: 500, background: 'var(--sidebar-bg)', borderRadius: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 48, background: '#1a1f24', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56' }}/>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }}/>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f' }}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 300px', height: '100%', paddingTop: 48 }}>
             <div style={{ background: '#12161a', borderRight: '1px solid rgba(255,255,255,0.05)' }}></div>
             <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ width: 200, height: 32, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}></div>
                <div style={{ display: 'flex', gap: 16 }}>
                   <div style={{ width: '30%', height: 100, background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}></div>
                   <div style={{ width: '30%', height: 100, background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}></div>
                   <div style={{ width: '30%', height: 100, background: 'rgba(34,197,94,0.1)', border: '1px solid var(--green)', borderRadius: 12 }}></div>
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: 12, marginTop: 16 }}></div>
             </div>
             <div style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', padding: 24 }}>
                <div style={{ width: '100%', height: 200, background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}></div>
             </div>
          </div>
        </div>
      </main>

      {/* Features */}
      <section id="features" style={{ padding: '100px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 48 }}>Everything you need</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, maxWidth: 1000, width: '100%' }}>
          {[
            { icon: 'fa-trello', title: 'Kanban Boards', desc: 'Drag and drop your way to success with interactive task management.' },
            { icon: 'fa-users', title: 'Team Finder', desc: 'Discover projects and find collaborators by role and category.' },
            { icon: 'fa-comment', title: 'Office Chat', desc: 'Instantly communicate with team members through realtime channels.' }
          ].map(f => (
            <div key={f.title} style={{ padding: 32, background: 'var(--white)', borderRadius: 24, border: '1px solid var(--border)' }}>
               <i className={`fa-brands ${f.icon} fa-solid`} style={{ fontSize: '2rem', color: 'var(--green)', marginBottom: 20 }} />
               <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 12 }}>{f.title}</h3>
               <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '40px', borderTop: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="auth-panel__logo" style={{ marginBottom: 16, fontSize: '1.2rem', fontWeight: 800 }}>Team<span style={{color:'var(--green)'}}>Forge</span></div>
        <p>&copy; 2026 TeamForge. All rights reserved.</p>
      </footer>
    </div>
  );
}
