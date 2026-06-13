import { Link } from 'react-router-dom';
import React, { useState } from 'react';

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState(null);

  const faqs = [
    { q: "Is TeamForge really free?", a: "Yes! Our Free plan gives you everything you need to manage your first project, up to 3 team members and 5 AI reviews per month." },
    { q: "Can I use my own domain?", a: "Custom domains are available on the Team plan. You can map your portfolio or project pages directly." },
    { q: "How does the AI Review work?", a: "TeamForge uses Google's Gemini AI to analyze code and written submissions against your task requirements, scoring them 0-100 and providing actionable feedback." },
    { q: "Can I cancel my subscription anytime?", a: "Absolutely. You can cancel your Pro or Team subscription at any time from your billing dashboard. No questions asked." }
  ];

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <header style={{ 
        display: 'flex', justifyContent: 'space-between', padding: '24px 40px', alignItems: 'center',
        position: 'sticky', top: 0, background: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(12px)', zIndex: 100,
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-1px' }}>
          Team<span style={{ color: 'var(--green)' }}>Forge</span>
        </div>
        <nav style={{ display: 'flex', gap: '32px', display: 'none', '@media(minWidth: 768px)': { display: 'flex' } }}>
          <a href="#features" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>Features</a>
          <a href="#pricing" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>Pricing</a>
          <a href="#testimonials" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>Testimonials</a>
          <a href="#faq" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>FAQ</a>
        </nav>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link to="/login" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
          <Link to="/login" className="btn btn--green" style={{ textDecoration: 'none', borderRadius: '8px', fontWeight: 600 }}>Get Started</Link>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '120px 20px 80px', position: 'relative', overflow: 'hidden' }}>
        
        {/* Background Gradients */}
        <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '100vw', height: '100vw', background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(0,0,0,0) 50%)', zIndex: 0, pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 900 }}>
          <div style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(34,197,94,0.1)', color: 'var(--green)', borderRadius: '24px', fontWeight: 600, fontSize: '0.9rem', marginBottom: 24, border: '1px solid rgba(34,197,94,0.2)' }}>
            ✨ Introducing AI Task Generation
          </div>
          <h1 style={{ fontSize: '5rem', fontWeight: 800, letterSpacing: '-2.5px', lineHeight: 1.05, marginBottom: 32 }}>
            The ultimate OS for <br/> <span style={{ color: 'var(--green)', backgroundImage: 'linear-gradient(to right, #22c55e, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Modern SaaS Teams</span>
          </h1>
          <p style={{ fontSize: '1.3rem', color: 'var(--text-secondary)', maxWidth: 650, margin: '0 auto 48px', lineHeight: 1.6 }}>
            Recruit talent, generate AI tasks, track time, and review submissions—all in one place. TeamForge replaces Jira, Slack, and GitHub PRs for agile teams.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <Link to="/login" className="btn btn--green" style={{ fontSize: '1.2rem', padding: '18px 40px', borderRadius: 12, textDecoration: 'none', fontWeight: 600, boxShadow: '0 8px 32px rgba(34,197,94,0.3)' }}>Start Building Free</Link>
            <a href="#features" className="btn btn--outline" style={{ fontSize: '1.2rem', padding: '18px 40px', borderRadius: 12, textDecoration: 'none', fontWeight: 600, background: 'rgba(255,255,255,0.05)' }}>Book a Demo</a>
          </div>
          <p style={{ marginTop: 24, color: 'var(--text-muted)', fontSize: '0.9rem' }}>No credit card required. Free forever plan available.</p>
        </div>

        {/* Hero Dashboard Mockup */}
        <div style={{ marginTop: 80, width: '100%', maxWidth: 1100, height: 600, background: 'var(--sidebar-bg)', borderRadius: 24, boxShadow: '0 32px 120px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden', zIndex: 1 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 48, background: '#111', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56' }}/>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }}/>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f' }}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 300px', height: '100%', paddingTop: 48 }}>
             <div style={{ background: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.05)', padding: 24 }}>
                <div style={{ width: '80%', height: 24, background: 'rgba(255,255,255,0.1)', borderRadius: 4, marginBottom: 32 }}></div>
                {[...Array(6)].map((_, i) => <div key={i} style={{ width: '100%', height: 32, background: 'rgba(255,255,255,0.03)', borderRadius: 6, marginBottom: 12 }}></div>)}
             </div>
             <div style={{ padding: 40, background: '#111' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
                   <div style={{ width: 250, height: 32, background: 'rgba(255,255,255,0.1)', borderRadius: 6 }}></div>
                   <div style={{ width: 100, height: 32, background: 'var(--green)', borderRadius: 6, opacity: 0.8 }}></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                   {[...Array(3)].map((_, i) => (
                     <div key={i} style={{ background: '#1a1a1a', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.05)', height: 400 }}>
                        <div style={{ width: '50%', height: 20, background: 'rgba(255,255,255,0.1)', borderRadius: 4, marginBottom: 16 }}></div>
                        {[...Array(3)].map((_, j) => <div key={j} style={{ width: '100%', height: 80, background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 12 }}></div>)}
                     </div>
                   ))}
                </div>
             </div>
             <div style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', padding: 24, background: '#0a0a0a' }}>
                <div style={{ width: '100%', height: 150, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, marginBottom: 24 }}></div>
                <div style={{ width: '100%', height: 300, background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}></div>
             </div>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" style={{ padding: '120px 20px', background: '#0a0a0a' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: 16 }}>Everything you need to ship faster</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: 64, maxWidth: 600, margin: '0 auto 64px' }}>
            A complete suite of tools designed specifically for modern software development teams.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 32 }}>
            {[
              { icon: 'fa-robot', title: 'AI Task Generation', desc: 'Describe your project and let Gemini AI automatically generate role-specific tasks, subtasks, and acceptance criteria.' },
              { icon: 'fa-check-double', title: 'Automated Code Review', desc: 'Submit your PR links. Our AI reviews the code against task requirements and provides a 0-100 quality score instantly.' },
              { icon: 'fa-chalkboard-user', title: 'Kanban & Sprints', desc: 'Visualize your workflow with drag-and-drop boards, track story points, and manage sprint cycles efficiently.' },
              { icon: 'fa-comments', title: 'Real-time Office', desc: 'Say goodbye to Slack context-switching. Every project has a dedicated realtime chat room and DM system.' },
              { icon: 'fa-clock', title: 'Native Time Tracking', desc: 'Start a timer directly on tasks. Track billable hours and generate automatic timesheets for your team.' },
              { icon: 'fa-user-astronaut', title: 'Public Portfolios', desc: 'Every approved submission automatically builds a beautiful, exportable public portfolio to showcase your work.' }
            ].map(f => (
              <div key={f.title} style={{ padding: 40, background: '#111', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                 <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                   <i className={`fa-solid ${f.icon}`} style={{ fontSize: '1.8rem', color: 'var(--green)' }} />
                 </div>
                 <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 12 }}>{f.title}</h3>
                 <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '1.05rem' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ padding: '120px 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: 16 }}>Simple, transparent pricing</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: 64 }}>Start for free, upgrade when you need more power.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32, alignItems: 'center' }}>
            
            {/* Free Tier */}
            <div style={{ padding: 40, background: '#111', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Hobby</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Perfect for solo devs and side projects.</p>
              <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: 32 }}>$0<span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 500 }}>/mo</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {['1 Project', 'Up to 3 Members', '5 AI Reviews / month', '100MB Storage', 'Community Support'].map(feature => (
                  <li key={feature} style={{ display: 'flex', alignItems: 'center', gap: 12 }}><i className="fa-solid fa-check" style={{ color: 'var(--green)' }}></i> {feature}</li>
                ))}
              </ul>
              <Link to="/login" className="btn btn--outline" style={{ width: '100%', padding: '16px', borderRadius: 12, textAlign: 'center', display: 'block', textDecoration: 'none' }}>Get Started Free</Link>
            </div>

            {/* Pro Tier */}
            <div style={{ padding: 40, background: '#1a1f24', borderRadius: 24, border: '2px solid var(--green)', textAlign: 'left', position: 'relative', transform: 'scale(1.05)' }}>
              <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'var(--green)', color: '#000', padding: '4px 16px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700 }}>MOST POPULAR</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Pro</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>For professional teams shipping products.</p>
              <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: 32 }}>$12<span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 500 }}>/mo</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {['10 Projects', 'Up to 15 Members', '50 AI Reviews / month', '5GB Storage', 'Priority Support', 'Advanced Analytics'].map(feature => (
                  <li key={feature} style={{ display: 'flex', alignItems: 'center', gap: 12 }}><i className="fa-solid fa-check" style={{ color: 'var(--green)' }}></i> {feature}</li>
                ))}
              </ul>
              <Link to="/login" className="btn btn--green" style={{ width: '100%', padding: '16px', borderRadius: 12, textAlign: 'center', display: 'block', textDecoration: 'none' }}>Start 14-Day Trial</Link>
            </div>

            {/* Team Tier */}
            <div style={{ padding: 40, background: '#111', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Team</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>For scaling organizations and agencies.</p>
              <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: 32 }}>$29<span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 500 }}>/mo</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {['Unlimited Projects', 'Unlimited Members', 'Unlimited AI Reviews', '25GB Storage', 'Custom Roles', 'Custom Domains'].map(feature => (
                  <li key={feature} style={{ display: 'flex', alignItems: 'center', gap: 12 }}><i className="fa-solid fa-check" style={{ color: 'var(--green)' }}></i> {feature}</li>
                ))}
              </ul>
              <Link to="/login" className="btn btn--outline" style={{ width: '100%', padding: '16px', borderRadius: 12, textAlign: 'center', display: 'block', textDecoration: 'none' }}>Contact Sales</Link>
            </div>

          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" style={{ padding: '100px 20px', background: '#0a0a0a' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 64 }}>Loved by engineering teams</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
             {[
               { quote: "TeamForge replaced Jira and Slack for us. The AI task generation alone saves my PM 10 hours a week.", name: "Sarah J.", role: "CTO @ TechFlow" },
               { quote: "The automated code reviews are incredibly accurate. It's like having a senior engineer review every PR instantly.", name: "Mark D.", role: "Lead Developer" },
               { quote: "I built my entire freelance portfolio using TeamForge's export feature. Clients love the transparency.", name: "Elena R.", role: "Freelance Designer" }
             ].map((t, i) => (
               <div key={i} style={{ padding: 40, background: '#111', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
                  <div style={{ color: 'var(--green)', fontSize: '1.5rem', marginBottom: 24 }}><i className="fa-solid fa-quote-left"></i></div>
                  <p style={{ fontSize: '1.1rem', lineHeight: 1.6, marginBottom: 32, fontStyle: 'italic' }}>"{t.quote}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}></div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{t.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t.role}</div>
                    </div>
                  </div>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" style={{ padding: '120px 20px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 48, textAlign: 'center' }}>Frequently asked questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
             {faqs.map((faq, i) => (
               <div key={i} style={{ background: '#111', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                 <button 
                   onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                   style={{ width: '100%', padding: 24, background: 'none', border: 'none', color: 'var(--text)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 600, textAlign: 'left' }}
                 >
                   {faq.q}
                   <i className={`fa-solid fa-chevron-${activeFaq === i ? 'up' : 'down'}`} style={{ color: 'var(--text-muted)' }}></i>
                 </button>
                 {activeFaq === i && (
                   <div style={{ padding: '0 24px 24px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                     {faq.a}
                   </div>
                 )}
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '64px 40px 40px', borderTop: '1px solid var(--border)', background: '#0a0a0a' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 48, marginBottom: 64 }}>
           <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-1px', marginBottom: 16 }}>
                Team<span style={{ color: 'var(--green)' }}>Forge</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>The ultimate OS for modern software teams to plan, build, and ship faster.</p>
           </div>
           <div>
              <h4 style={{ fontWeight: 700, marginBottom: 24 }}>Product</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <li><a href="#features" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Features</a></li>
                <li><a href="#pricing" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Pricing</a></li>
                <li><Link to="/explore" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Explore Projects</Link></li>
              </ul>
           </div>
           <div>
              <h4 style={{ fontWeight: 700, marginBottom: 24 }}>Company</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <li><a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>About</a></li>
                <li><a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Blog</a></li>
                <li><a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Contact</a></li>
              </ul>
           </div>
           <div>
              <h4 style={{ fontWeight: 700, marginBottom: 24 }}>Legal</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <li><Link to="/terms" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Terms of Service</Link></li>
                <li><Link to="/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Privacy Policy</Link></li>
                <li><Link to="/cookies" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Cookie Policy</Link></li>
                <li><Link to="/aup" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Acceptable Use</Link></li>
              </ul>
           </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
           <p>&copy; {new Date().getFullYear()} TeamForge. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
