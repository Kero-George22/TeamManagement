import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const FEATURES = [
  { icon:'⚔️', tag:'Quests',    name:'REAL PROJECTS',  cls:'',  num:'01',
    desc:'Join live projects across multiple roles. Work on real tasks — not tutorials. Build things that matter and add them directly to your verified portfolio.' },
  { icon:'🤖', tag:'AI Boss',   name:'AI MANAGER',     cls:'g', num:'02',
    desc:'Gemini-powered AI assigns tasks, reviews your submissions on a 0–100 scale, and gives detailed feedback that helps you level up every sprint.' },
  { icon:'🏆', tag:'Ranking',   name:'LEADERBOARD',    cls:'p', num:'03',
    desc:'Compete globally. XP for every completed task, every badge, every perfect review. Your rank is pure proof of skill — no inflation.' },
  { icon:'🎯', tag:'Testing',   name:'SKILL ASSESS',   cls:'',  num:'04',
    desc:'Take AI-generated assessments to unlock your class: Beginner, Intermediate, Advanced, or Expert across Frontend, Backend, DevOps, and more.' },
  { icon:'📋', tag:'Portfolio', name:'AUTO PORTFOLIO',  cls:'g', num:'05',
    desc:'Every completed task auto-builds your verified portfolio. Share your XP score, badges, and project history — zero resume writing required.' },
  { icon:'🏢', tag:'Hub',       name:'VIRTUAL OFFICE', cls:'p', num:'06',
    desc:"Real-time team collaboration, AI manager announcements, sprint updates, and direct messaging — all inside your project's virtual office." },
];

const STEPS = [
  { n:'01', title:'CREATE HERO',  desc:'Register, verify your email, and take your first skill assessment to unlock your starting class and base XP score.' },
  { n:'02', title:'JOIN QUEST',   desc:'Browse live projects, pick your role, and join a team. The AI manager will generate personalized tasks for your skill level.' },
  { n:'03', title:'CLAIM & BUILD',desc:'Claim tasks from your queue, do real work, and submit your results. Speed and quality both influence your final XP reward.' },
  { n:'04', title:'EARN & GROW',  desc:'The AI reviews your work (0–100), awards XP, unlocks badges, and updates your portfolio automatically. Level up, repeat.' },
];

const SKILLS = [
  { icon:'⚡', name:'FRONTEND',  sub:'React · Vue · CSS · UX',  pips:[1,1,1,0] },
  { icon:'🔧', name:'BACKEND',   sub:'Node · APIs · DBs · Auth', pips:[1,1,0,0] },
  { icon:'🌐', name:'FULLSTACK', sub:'End-to-end systems',       pips:[1,1,1,1] },
  { icon:'🚀', name:'DEVOPS',    sub:'CI/CD · Docker · Cloud',   pips:[1,0,0,0] },
  { icon:'🧠', name:'DATA SCI',  sub:'ML · Analytics · Python',  pips:[1,1,0,0] },
];

const LB_ROWS = [
  { rank:'👑', avatar:'⚡', name:'SHADOWDEV', level:'LVL 24 · FullStack Expert',   xp:'48,200 XP', gold:true },
  { rank:'02', avatar:'🔥', name:'CYPH3R',    level:'LVL 21 · Backend Advanced',   xp:'39,750 XP', gold:false },
  { rank:'03', avatar:'🎯', name:'NULLPTR',   level:'LVL 19 · DevOps Expert',      xp:'31,400 XP', gold:false },
  { rank:'04', avatar:'💎', name:'AXIOM_X',   level:'LVL 17 · Frontend Expert',    xp:'26,800 XP', gold:false },
  { rank:'05', avatar:'🌐', name:'VEXEN_404', level:'LVL 15 · FullStack Advanced', xp:'22,100 XP', gold:false },
];

const XP_SKILLS = [
  { name:'FRONTEND', lvl:'Expert',       w:92, style:{} },
  { name:'BACKEND',  lvl:'Advanced',     w:75, style:{} },
  { name:'DEVOPS',   lvl:'Intermediate', w:50, style:{ background:'linear-gradient(90deg,var(--gold),var(--purple))' } },
  { name:'DATA SCI', lvl:'Beginner',     w:28, style:{ background:'linear-gradient(90deg,var(--purple),var(--red))' } },
];

const TICKER = [
  ['12,847','Quests Completed'],['142K','XP Distributed'],['3,291','Heroes Active'],
  ['98.7%','AI Review Accuracy'],['547','Projects Live'],['24/7','AI Manager Online'],
];

const BADGES = [
  { em:'🌟', label:'FIRST QUEST' },  { em:'⚡', label:'SPEED CODER' },
  { em:'🤖', label:'AI APPROVED' },  { em:'🏆', label:'TOP RANKED' },
  { em:'💯', label:'PERFECT SCORE' },{ em:'🔥', label:'ON FIRE' },
];

export default function Landing() {
  const canvasRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  /* ── Particle canvas (130 colored stars + connecting lines) ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    const COLORS = ['#00e5ff','#00e5ff','#00e5ff','#9b6dff','#ffd700'];
    let W, H, raf;
    const particles = [];

    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    class Star {
      constructor(rand = true) { this.reset(rand); }
      reset(rand) {
        this.x  = rand ? Math.random() * W : (Math.random() < 0.5 ? 0 : W);
        this.y  = rand ? Math.random() * H : Math.random() * H;
        this.r  = Math.random() * 1.4 + 0.4;
        this.vx = (Math.random() - 0.5) * 0.28;
        this.vy = (Math.random() - 0.5) * 0.28;
        this.a  = Math.random() * 0.45 + 0.08;
        this.c  = COLORS[Math.floor(Math.random() * COLORS.length)];
      }
      update() {
        this.x += this.vx; this.y += this.vy;
        if (this.x < -2 || this.x > W + 2 || this.y < -2 || this.y > H + 2) this.reset(false);
      }
      draw() {
        ctx.save(); ctx.globalAlpha = this.a; ctx.fillStyle = this.c;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    }
    for (let i = 0; i < 130; i++) particles.push(new Star(true));

    function drawLines() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < 90) {
            ctx.save(); ctx.globalAlpha = (1 - d / 90) * 0.07;
            ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke(); ctx.restore();
          }
        }
      }
    }
    function loop() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => { p.update(); p.draw(); });
      drawLines(); raf = requestAnimationFrame(loop);
    }
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  /* ── Scroll nav ── */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* ── Scroll reveal ── */
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) { setTimeout(() => e.target.classList.add('visible'), i * 70); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  /* ── Animated counters ── */
  useEffect(() => {
    const cntObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target, target = parseInt(el.dataset.target, 10), t0 = performance.now();
        function tick(now) {
          const p = Math.min((now - t0) / 2000, 1);
          el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target).toLocaleString();
          if (p < 1) requestAnimationFrame(tick); else el.textContent = target.toLocaleString();
        }
        requestAnimationFrame(tick); cntObs.unobserve(el);
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('[data-target]').forEach(el => cntObs.observe(el));
    return () => cntObs.disconnect();
  }, []);

  /* ── XP showcase fill widths ── */
  useEffect(() => {
    document.querySelectorAll('.xp-s-fill[data-w]').forEach(el => { el.style.width = el.dataset.w + '%'; });
  }, []);

  return (
    <div className="landing">
      <canvas ref={canvasRef} id="bg-canvas" />

      {/* ── NAV ── */}
      <nav className={`l-nav${scrolled ? ' scrolled' : ''}`}>
        <a href="/" className="l-nav-logo">
          <div className="l-nav-hex">XP</div>
          <span className="l-nav-brand">JOB<b>XP</b></span>
        </a>
        <ul className="l-nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#howto">How to Play</a></li>
          <li><a href="#skills">Skills</a></li>
          <li><a href="#leaderboard">Leaderboard</a></li>
        </ul>
        <div className="l-nav-actions">
          <Link to="/login"    className="btn btn-outline btn-sm">Login</Link>
          <Link to="/register" className="btn btn-cyan btn-sm">⚔ Play Now</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="l-hero z1">
        <div className="hero-ambient">
          <div className="amb amb-c amb-1"><div className="label">Active Quest</div><div className="val">+150 XP</div><div className="sub">Build REST API</div></div>
          <div className="amb amb-g amb-2"><div className="label">Your Level</div><div className="val">LVL 7</div><div className="sub">Backend Dev</div></div>
          <div className="amb amb-p amb-3"><div className="label">Badge Earned</div><div className="val">🏆</div><div className="sub">First Sprint</div></div>
          <div className="amb amb-v amb-4"><div className="label">AI Review</div><div className="val">94/100</div><div className="sub">Excellent Work</div></div>
        </div>

        <div className="hero-badge"><span className="dot" />SEASON 1 — SERVERS ONLINE</div>
        <h1 className="hero-h1">JOB<span>XP</span></h1>
        <p className="hero-tagline">LEVEL UP YOUR CAREER</p>
        <p className="hero-desc">
          Complete real-world projects. Earn XP. Get reviewed by AI.<br />
          Climb the leaderboard and build a portfolio that speaks for itself.
        </p>
        <div className="hero-cta">
          <Link to="/register" className="btn btn-cyan btn-lg">⚔ START QUEST</Link>
          <a href="#features"  className="btn btn-outline btn-lg">◈ EXPLORE</a>
        </div>
        <div className="hero-xp">
          <div className="xp-header-row">
            <span className="xp-lbl">▸ CAREER XP PROGRESS</span>
            <span className="xp-val">7,200 / 10,000 XP</span>
          </div>
          <div className="xp-track"><div className="xp-bar" /></div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="ticker-wrap z1">
        <div className="ticker-inner">
          {[...TICKER, ...TICKER].map(([num, label], i) => (
            <div className="t-item" key={i}><span className="t-num">{num}</span> {label} <span className="t-sep">◆</span></div>
          ))}
        </div>
      </div>

      {/* ── STATS ── */}
      <section className="stats-row z1">
        <div className="stats-grid">
          <div className="stat-cell reveal"><span className="stat-num" data-target="12847">0</span><span className="stat-lbl">Quests Completed</span></div>
          <div className="stat-cell reveal"><span className="stat-num" data-target="3291">0</span><span className="stat-lbl">Active Heroes</span></div>
          <div className="stat-cell reveal"><span className="stat-num" data-target="547">0</span><span className="stat-lbl">Projects Live</span></div>
          <div className="stat-cell reveal"><span className="stat-num" data-target="94">0</span><span className="stat-lbl">Avg AI Score</span></div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="l-features py z1">
        <div className="container">
          <div className="section-header text-center reveal" style={{ marginBottom:72 }}>
            <div className="s-tag">Abilities</div>
            <h2 className="s-title">YOUR <span className="hi">ARSENAL</span></h2>
            <p className="s-desc">Every tool you need to dominate the career quest and reach the top of the leaderboard.</p>
          </div>
          <div className="features-grid">
            {FEATURES.map(f => (
              <div key={f.num} className={`feat reveal${f.cls ? ' ' + f.cls : ''}`}>
                <div className="feat-icon">{f.icon}</div>
                <div className="feat-tag">{f.tag}</div>
                <h3 className="feat-name">{f.name}</h3>
                <p className="feat-desc">{f.desc}</p>
                <span className="feat-num">{f.num}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW TO PLAY ── */}
      <section id="howto" className="l-howto py z1">
        <div className="container">
          <div className="section-header text-center reveal" style={{ marginBottom:72 }}>
            <div className="s-tag">Tutorial</div>
            <h2 className="s-title">HOW TO <span className="hi">PLAY</span></h2>
            <p className="s-desc">Four steps stand between you and career domination.</p>
          </div>
          <div className="steps">
            {STEPS.map(s => (
              <div key={s.n} className="step reveal">
                <div className="step-hex">{s.n}</div>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SKILLS ── */}
      <section id="skills" className="l-skills py z1">
        <div className="container">
          <div className="section-header text-center reveal" style={{ marginBottom:72 }}>
            <div className="s-tag">Skill Tree</div>
            <h2 className="s-title">CHOOSE YOUR <span className="hi">CLASS</span></h2>
            <p className="s-desc">Master one discipline or conquer all five. Four unlock levels await in each path.</p>
          </div>
          <div className="skills-grid">
            {SKILLS.map(s => (
              <div key={s.name} className="skill-card reveal">
                <div className="sk-hex">{s.icon}</div>
                <div className="sk-name">{s.name}</div>
                <div className="sk-sub">{s.sub}</div>
                <div className="sk-pips">{s.pips.map((on, i) => <div key={i} className={`pip${on ? ' on' : ''}`} />)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEADERBOARD ── */}
      <section id="leaderboard" className="l-leaderboard py z1">
        <div className="container">
          <div className="lb-inner">
            <div>
              <div className="reveal">
                <div className="s-tag">Rankings</div>
                <h2 className="s-title">GLOBAL <span className="hi">LEADERBOARD</span></h2>
                <p className="s-desc">Every task, every badge, every sprint pushes you higher. Your position is earned, not given.</p>
              </div>
              <div className="lb-table reveal">
                {LB_ROWS.map(r => (
                  <div key={r.rank} className={`lb-row${r.gold ? ' gold' : ''}`}>
                    <span className="lb-rank">{r.rank}</span>
                    <div className="lb-avatar">{r.avatar}</div>
                    <div className="lb-meta"><div className="lb-name">{r.name}</div><div className="lb-level">{r.level}</div></div>
                    <div className="lb-xp">{r.xp}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="reveal">
              <div className="xp-showcase">
                {XP_SKILLS.map(x => (
                  <div key={x.name} className="xp-s-card">
                    <div className="xp-s-row"><span className="xp-s-name">{x.name}</span><span className="xp-s-lvl">{x.lvl}</span></div>
                    <div className="xp-s-track"><div className="xp-s-fill" data-w={x.w} style={x.style} /></div>
                  </div>
                ))}
                <div className="rank-box">
                  <div className="rank-box-label">YOUR RANK</div>
                  <div className="rank-big">#???</div>
                  <div className="rank-sub">Register to claim your rank</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BADGES ── */}
      <section className="l-badges py z1">
        <div className="container">
          <div className="section-header text-center reveal" style={{ marginBottom:64 }}>
            <div className="s-tag">Achievements</div>
            <h2 className="s-title">EARN <span className="hg">BADGES</span></h2>
            <p className="s-desc">Hit milestones, unlock achievements, and display them on your public portfolio.</p>
          </div>
          <div className="badges-flex">
            {BADGES.map((b, i) => (
              <div key={b.label} className="badge-item reveal">
                <span className="badge-em" style={{ animationDelay:`${-i * 0.5}s` }}>{b.em}</span>
                <span className="badge-label">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="l-cta z1">
        <div className="container">
          <div className="reveal" style={{ textAlign:'center' }}>
            <h2 className="cta-h">READY TO <span style={{ color:'var(--cyan)' }}>LEVEL UP?</span></h2>
            <p className="cta-sub">Join thousands of developers building real projects, earning XP, and landing jobs through verified portfolio work.</p>
            <div className="cta-row">
              <Link to="/register" className="btn btn-gold btn-lg">⚔ START YOUR QUEST</Link>
              <a href="#features"  className="btn btn-outline btn-lg">◈ EXPLORE FEATURES</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="l-footer z1">
        <div className="container">
          <div className="footer-inner">
            <span className="footer-brand">JOB<b>XP</b></span>
            <span className="footer-copy">© 2026 JOBXP — ALL RIGHTS RESERVED</span>
            <div className="footer-links">
              <a href="#">Terms</a><a href="#">Privacy</a><a href="#">API</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

