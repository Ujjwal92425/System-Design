'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

function LogoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="6" cy="12" r="3" fill="#FF6600" />
      <circle cx="18" cy="6" r="3" fill="#FF6600" />
      <circle cx="18" cy="18" r="3" fill="#FF6600" />
      <line x1="9" y1="11" x2="15" y2="7.5" stroke="#FF6600" strokeWidth="2" />
      <line x1="9" y1="13" x2="15" y2="16.5" stroke="#FF6600" strokeWidth="2" />
    </svg>
  );
}

function useScrollProgress() {
  const [scrollProgress, setScrollProgress] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.body.scrollHeight - window.innerHeight;
      if (totalHeight > 0) setScrollProgress((window.scrollY / totalHeight) * 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return scrollProgress;
}

function useCountUp(target: number, duration = 1800, inView = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start: number | null = null;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(eased * target);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);
  return count;
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [annual, setAnnual] = useState(false);
  const scrollProgress = useScrollProgress();
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsInView, setStatsInView] = useState(false);

  useEffect(() => {
    if (drawerOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [drawerOpen]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el));

    const statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setStatsInView(true);
            statsObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    if (statsRef.current) statsObserver.observe(statsRef.current);

    return () => {
      observer.disconnect();
      statsObserver.disconnect();
    };
  }, []);

  const count1 = useCountUp(47, 1800, statsInView);
  const count2 = useCountUp(12000, 1800, statsInView);
  const count3 = useCountUp(94, 1800, statsInView);
  const count4 = useCountUp(32, 1800, statsInView);

  return (
    <div className="bg-yc-bg min-h-screen relative overflow-x-hidden">
      {/* Page Scroll Progress Bar */}
      <div
        className="fixed top-0 left-0 z-[101] h-[2px] bg-yc-accent transition-[width] duration-50"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* ──── NAVBAR ──── */}
      <nav
        className={`w-full fixed top-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-yc-bg/90 backdrop-blur-md border-b border-yc-border' : 'bg-transparent'
        }`}
      >
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-4 md:py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 no-underline">
            <LogoIcon />
            <span className="font-display font-semibold text-lg text-yc-text">SD-OS</span>
          </Link>

          {/* Desktop center nav */}
          <div className="hidden lg:flex items-center space-x-8">
            <a href="#learn" className="text-sm text-yc-text-muted hover:text-yc-text transition">Learn</a>
            <a href="#build" className="text-sm text-yc-text-muted hover:text-yc-text transition">Build</a>
            <a href="#evaluate" className="text-sm text-yc-text-muted hover:text-yc-text transition">Evaluate</a>
            <a href="#pricing" className="text-sm text-yc-text-muted hover:text-yc-text transition">Pricing</a>
          </div>

          {/* Desktop right actions */}
          <div className="hidden lg:flex items-center space-x-4">
            <Link href="/login" className="text-sm text-yc-text-muted hover:text-yc-text transition">Login</Link>
            <Link
              href="/signup"
              className="text-sm font-medium px-5 py-2.5 bg-yc-accent text-white rounded-lg hover:bg-yc-accent-hover transition"
            >
              Apply
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            className="lg:hidden p-2 -mr-2"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1C1C1C" strokeWidth="1.5" strokeLinecap="round">
              <line x1="3" y1="5" x2="17" y2="5" />
              <line x1="3" y1="10" x2="17" y2="10" />
              <line x1="3" y1="14" x2="17" y2="14" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      <div
        className={`mobile-overlay ${drawerOpen ? 'open' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Mobile drawer */}
      <div
        id="mobile-drawer"
        className={`mobile-drawer ${drawerOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="p-8 flex flex-col h-full">
          <div className="flex items-center justify-between mb-12">
            <span className="font-display font-semibold text-lg">SD-OS</span>
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="text-yc-text-muted text-2xl leading-none"
            >
              &times;
            </button>
          </div>
          <nav className="flex flex-col space-y-6">
            <a href="#learn" onClick={() => setDrawerOpen(false)} className="text-base text-yc-text-muted hover:text-yc-text transition">Learn</a>
            <a href="#build" onClick={() => setDrawerOpen(false)} className="text-base text-yc-text-muted hover:text-yc-text transition">Build</a>
            <a href="#evaluate" onClick={() => setDrawerOpen(false)} className="text-base text-yc-text-muted hover:text-yc-text transition">Evaluate</a>
            <a href="#pricing" onClick={() => setDrawerOpen(false)} className="text-base text-yc-text-muted hover:text-yc-text transition">Pricing</a>
          </nav>
          <div className="mt-auto flex flex-col space-y-4">
            <Link href="/login" onClick={() => setDrawerOpen(false)} className="text-center text-sm text-yc-text-muted">Login</Link>
            <Link
              href="/signup"
              onClick={() => setDrawerOpen(false)}
              className="text-center text-sm font-medium px-5 py-3 bg-yc-accent text-white rounded-lg"
            >
              Apply
            </Link>
          </div>
        </div>
      </div>

      {/* ──── HERO ──── */}
      <section className="min-h-[80vh] flex items-center border-b border-yc-border pt-24 md:pt-0">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center py-16 md:py-24">
            {/* Hero Left */}
            <div>
              <div className="flex items-center space-x-2 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-yc-accent" />
                <span className="text-xs font-medium text-yc-accent uppercase tracking-[0.12em]">
                  System Design Learning OS
                </span>
              </div>

              <h1 className="font-display text-[clamp(2.5rem,8vw,5.5rem)] font-[500] leading-[0.95] tracking-[-0.03em] text-yc-text mb-8">
                Design systems<br />
                that actually<br />
                hold up.
              </h1>

              <p className="text-base md:text-lg text-yc-text-muted leading-relaxed max-w-[520px] mb-10">
                Structured curriculum, an interactive architecture canvas, and an AI reviewer that tells you exactly where your design breaks.
                <br /><br />
                Built for engineers targeting senior and staff roles.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center px-7 py-3.5 bg-yc-accent text-white text-sm font-medium rounded-lg hover:bg-yc-accent-hover transition"
                >
                  Start learning free
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center px-7 py-3.5 border border-yc-border text-yc-text-muted text-sm font-medium rounded-lg hover:border-yc-text/30 hover:text-yc-text transition"
                >
                  See how it works
                </a>
              </div>

              <div className="mt-10 flex items-center space-x-2 text-xs text-yc-text-muted">
                <span>Trusted by <strong className="text-yc-text font-semibold">2,400+</strong> engineers</span>
                <span className="text-yc-border">&middot;</span>
                <span><strong className="text-yc-text font-semibold">4.9 / 5</strong> average score improvement</span>
              </div>
            </div>

            {/* Hero Right — Architecture Diagram */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[540px] aspect-[4/3] bg-yc-bg-alt border border-yc-border rounded-xl overflow-hidden">
                <svg width="100%" height="100%" className="absolute inset-0 z-0">
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M 0 2 L 10 5 L 0 8 z" fill="#D4D0C8" />
                    </marker>
                  </defs>
                  <line x1="18%" y1="20%" x2="50%" y2="35%" stroke="#D4D0C8" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <line x1="50%" y1="10%" x2="50%" y2="30%" stroke="#D4D0C8" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <line x1="82%" y1="10%" x2="82%" y2="55%" stroke="#D4D0C8" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <line x1="50%" y1="42%" x2="30%" y2="55%" stroke="#D4D0C8" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <line x1="50%" y1="42%" x2="60%" y2="55%" stroke="#D4D0C8" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <line x1="30%" y1="65%" x2="45%" y2="80%" stroke="#D4D0C8" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <line x1="60%" y1="65%" x2="45%" y2="80%" stroke="#D4D0C8" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <line x1="30%" y1="60%" x2="72%" y2="60%" stroke="#D4D0C8" strokeWidth="1.5" strokeDasharray="4" markerEnd="url(#arrow)" />
                </svg>

                {/* Diagram nodes */}
                {[
                  { left: '6%', top: '10%', label: 'Client', color: '#FF6600' },
                  { left: '44%', top: '3%', label: 'DNS', color: '#FF6600' },
                  { left: '74%', top: '3%', label: 'CDN', color: '#22c55e' },
                  { left: '44%', top: '30%', label: 'Nginx LB', color: '#FF6600', pulse: true },
                  { left: '20%', top: '55%', label: 'Web API v1', color: '#FF6600' },
                  { left: '50%', top: '55%', label: 'Web API v2', color: '#FF6600' },
                  { left: '74%', top: '55%', label: 'Redis Cache', color: '#FF6600' },
                  { left: '35%', top: '78%', label: 'Postgres DB', color: '#FF6600' },
                  { left: '74%', top: '78%', label: 'S3 Storage', color: '#22c55e' },
                ].map((node, i) => (
                  <div
                    key={node.label}
                    className="hero-diagram-node"
                    style={{
                      position: 'absolute',
                      left: node.left,
                      top: node.top,
                      zIndex: 2,
                      padding: '6px 10px',
                      background: '#F8F7F2',
                      border: '1px solid #E5E2D9',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      animationDelay: `${300 + i * 80}ms`,
                      fontSize: '10px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {node.pulse && (
                      <span className="relative flex w-2 h-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yc-accent opacity-30" />
                        <span className="relative inline-flex rounded-full w-2 h-2 bg-yc-accent" />
                      </span>
                    )}
                    {!node.pulse && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: node.color }}
                      />
                    )}
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#333333' }}>
                      {node.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──── STATS ──── */}
      <section ref={statsRef} className="border-y border-yc-border bg-yc-bg-alt">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { count: Math.floor(count1), suffix: '', label: 'System design patterns covered' },
              { count: `${Math.floor(count2).toLocaleString()}+`, suffix: '', label: 'Engineers trained' },
              { count: `${Math.floor(count3)}%`, suffix: '', label: 'Report scoring improvement after 4 weeks' },
              { count: `${(count4 / 10).toFixed(1)}×`, suffix: '', label: 'Average interview performance increase' },
            ].map((stat, i) => (
              <div key={i} className={i < 3 ? 'md:border-r border-yc-border md:pr-8' : ''}>
                <div className="font-display text-3xl md:text-4xl font-[500] text-yc-accent mb-2">
                  {stat.count}
                </div>
                <div className="text-sm text-yc-text-muted leading-relaxed max-w-[160px]">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── HOW IT WORKS ──── */}
      <section id="how-it-works" className="py-24 md:py-32 border-b border-yc-border">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12">
          <div className="animate-on-scroll text-center max-w-2xl mx-auto mb-16 md:mb-20">
            <span className="text-xs font-medium text-yc-accent uppercase tracking-[0.12em]">
              The Three Surfaces
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-[500] text-yc-text mt-4 mb-4">
              Learn. Build. Evaluate.
            </h2>
            <p className="text-base text-yc-text-muted">
              Most tools give you one. We built the loop.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                num: '01', accent: '#FF6600', title: 'Structured curriculum',
                body: 'Five progressive levels from capacity estimation to distributed consensus. Each lesson has diagrams you can interact with, not just read.',
                tags: ['47 lessons', '5 levels', 'Quizzes'],
              },
              {
                num: '02', accent: '#FF6600', title: 'Architecture canvas',
                body: 'Drag, connect, and configure real system components. Load balancers, caches, queues, databases — wired together the way they actually work.',
                tags: ['16 node types', 'Templates', 'Version history'],
              },
              {
                num: '03', accent: '#22c55e', title: 'Simulation and scoring',
                body: 'Inject traffic, trigger failures, and watch your design respond. Then get a rubric score and AI review that explains exactly what a staff engineer would have done differently.',
                tags: ['Chaos injection', 'Rubric scoring', 'AI review'],
              },
            ].map((card, i) => (
              <div
                key={i}
                className="animate-on-scroll bg-yc-bg-alt border border-yc-border rounded-xl p-8 md:p-10 flex flex-col"
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <div className="h-0.5 w-12 rounded-full mb-6" style={{ background: card.accent }} />
                <span className="text-xs font-medium text-yc-text-muted tracking-[0.08em] mb-4">{card.num}</span>
                <h3 className="font-display text-xl font-[500] text-yc-text mb-3">{card.title}</h3>
                <p className="text-sm text-yc-text-muted leading-relaxed flex-1 mb-6">{card.body}</p>
                <div className="flex flex-wrap gap-2">
                  {card.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-md border border-yc-border text-yc-text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── FEATURE DEEP DIVE ──── */}
      <section>
        {/* Row 1: Canvas */}
        <div id="build" className="py-24 md:py-32 border-b border-yc-border">
          <div className="max-w-screen-2xl mx-auto px-6 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="animate-on-scroll">
                <span className="text-xs font-medium text-yc-accent uppercase tracking-[0.12em]">BUILD</span>
                <h3 className="font-display text-2xl md:text-3xl font-[500] text-yc-text mt-3 mb-4 leading-tight">
                  An architecture canvas that knows what the components actually do
                </h3>
                <p className="text-sm md:text-base text-yc-text-muted leading-relaxed mb-8">
                  Every node in the canvas is a real system primitive with configurable properties. Set replication factor on your database. Toggle read replicas. Define your cache eviction policy. The canvas understands the design.
                </p>
                <div className="space-y-3">
                  {[
                    '16 component types modeled after production system primitives',
                    'Node property inspector with configurable latency, capacity, and replication',
                    'Version history with named snapshots and one-click restore',
                    'Export to PNG, SVG, or shareable read-only link',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start space-x-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-yc-accent mt-2 flex-shrink-0" />
                      <span className="text-sm text-yc-text-muted">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual: Mock Canvas */}
              <div className="animate-on-scroll flex justify-center lg:justify-end">
                <div className="w-full max-w-[500px] aspect-[4/3] bg-yc-bg-alt border border-yc-border rounded-xl flex overflow-hidden">
                  <div className="w-10 bg-yc-bg-card border-r border-yc-border flex flex-col items-center py-4 space-y-4">
                    <div className="w-5 h-5 rounded border border-yc-accent/40 bg-yc-accent/10" />
                    <div className="w-5 h-5 rounded border border-yc-border" />
                    <div className="w-5 h-5 rounded border border-yc-border" />
                    <div className="w-5 h-5 rounded border border-yc-border" />
                  </div>
                  <div className="flex-1 relative bg-yc-bg/50 p-4">
                    <div className="absolute left-4 top-6 w-24 h-8 bg-yc-bg-card border border-yc-border rounded-md flex items-center px-2 text-[10px] font-mono text-yc-text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-yc-accent mr-1.5" />
                      Nginx LB
                    </div>
                    <div className="absolute left-8 bottom-10 w-24 h-8 bg-yc-bg-card border border-yc-border rounded-md flex items-center px-2 text-[10px] font-mono text-yc-text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-yc-accent mr-1.5" />
                      API Gateway
                    </div>
                  </div>
                  <div className="w-32 bg-yc-bg-card border-l border-yc-border p-3 space-y-3">
                    <span className="text-[9px] font-mono font-semibold text-yc-text-muted uppercase tracking-wider">INSPECTOR</span>
                    <div className="border-b border-yc-border pb-2">
                      <span className="text-[10px] font-mono text-yc-text">Nginx LB</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[8px] font-mono text-yc-text-muted uppercase">Algorithm</span>
                      <div className="h-3 bg-yc-bg border border-yc-border rounded" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[8px] font-mono text-yc-text-muted uppercase">Connections</span>
                      <div className="h-3 bg-yc-bg border border-yc-border rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Simulation */}
        <div id="evaluate" className="py-24 md:py-32 border-b border-yc-border">
          <div className="max-w-screen-2xl mx-auto px-6 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Visual: Mock Simulation */}
              <div className="animate-on-scroll order-last lg:order-first flex justify-center lg:justify-start">
                <div className="w-full max-w-[500px] bg-yc-bg-alt border border-yc-border rounded-xl p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-semibold text-yc-text-muted uppercase tracking-wider">LIVE SIMULATION</span>
                    <span className="text-[9px] font-mono font-semibold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">RUNNING</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-yc-border pb-2">
                      <span className="text-xs font-mono text-yc-text-muted">QPS</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold font-mono text-yc-accent">12,400</span>
                        <div className="flex items-end gap-0.5 h-3">
                          {[6, 10, 8, 12, 14].map((h, i) => (
                            <div key={i} className="w-[3px] bg-yc-accent rounded-t" style={{ height: `${h}px` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-b border-yc-border pb-2">
                      <span className="text-xs font-mono text-yc-text-muted">P99 Latency</span>
                      <span className="text-sm font-semibold font-mono text-yc-accent">284ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-yc-text-muted">Error Rate</span>
                      <span className="text-sm font-semibold font-mono text-green-600">0.04%</span>
                    </div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex w-2 h-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full w-2 h-2 bg-red-500" />
                      </span>
                      <span className="text-[10px] font-mono font-semibold text-yc-text">DB PRIMARY</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-red-600">OVERLOADED</span>
                  </div>
                </div>
              </div>

              {/* Text Right */}
              <div className="animate-on-scroll">
                <span className="text-xs font-medium text-yc-accent uppercase tracking-[0.12em]">EVALUATE</span>
                <h3 className="font-display text-2xl md:text-3xl font-[500] text-yc-text mt-3 mb-4 leading-tight">
                  Run your design under real conditions before the interview
                </h3>
                <p className="text-sm md:text-base text-yc-text-muted leading-relaxed mb-8">
                  Inject traffic at any rate. Kill any node. Partition the network. Watch queue depth build up and latency spike in real time — all computed locally in your browser, with no server required.
                </p>
                <div className="space-y-3">
                  {[
                    'Traffic injection from 1 to 100,000 req/s with burst mode',
                    'Chaos scenarios: node kill, network partition, DB replication lag',
                    'Cache hit rate and queue depth visualizations per node',
                    'Real-time P50 / P95 / P99 latency waterfall',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start space-x-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-yc-accent mt-2 flex-shrink-0" />
                      <span className="text-sm text-yc-text-muted">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Interview */}
        <div className="py-24 md:py-32 border-b border-yc-border">
          <div className="max-w-screen-2xl mx-auto px-6 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="animate-on-scroll">
                <span className="text-xs font-medium text-yc-accent uppercase tracking-[0.12em]">PRACTICE</span>
                <h3 className="font-display text-2xl md:text-3xl font-[500] text-yc-text mt-3 mb-4 leading-tight">
                  Interview mode with a rubric, not just a timer
                </h3>
                <p className="text-sm md:text-base text-yc-text-muted leading-relaxed mb-8">
                  Choose a prompt, set your time limit, and design from scratch. When you submit, you get a scored breakdown by criteria — not a vague 'good job'. See exactly which components you missed and why they matter.
                </p>
                <div className="space-y-3">
                  {[
                    '10 real interview prompts (URL shortener, Uber, WhatsApp, YouTube, and more)',
                    'Rubric scoring across 8–12 criteria per prompt',
                    'AI narrative review: what a staff engineer would have done differently',
                    'Weakness summary across sessions — pattern recognition over time',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start space-x-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-yc-accent mt-2 flex-shrink-0" />
                      <span className="text-sm text-yc-text-muted">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mock Scorecard */}
              <div className="animate-on-scroll flex justify-center lg:justify-end">
                <div className="w-full max-w-[500px] bg-yc-bg-alt border border-yc-border rounded-xl p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-yc-text-muted">URL Shortener &middot; 42 min</span>
                    <span className="text-[10px] font-mono text-yc-text-muted uppercase">SUBMITTED</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-5xl font-[500] text-yc-text">73</span>
                    <span className="text-sm font-mono text-yc-text-muted">/ 100</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-yc-text-muted">Load Balancer present</span>
                      <span className="text-green-600 font-bold">&check;</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-yc-text-muted">Cache for redirects</span>
                      <span className="text-green-600 font-bold">&check;</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-yc-text-muted">DB read replicas</span>
                      <span className="text-[10px] font-mono font-semibold text-yc-accent bg-yc-accent/10 border border-yc-accent/20 px-1.5 py-0.5 rounded">WARNING</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-yc-text-muted">Rate limiting</span>
                      <span className="text-red-500 font-bold">&times;</span>
                    </div>
                  </div>
                  <div className="bg-yc-accent/5 border-l-2 border-yc-accent p-3 rounded-r">
                    <span className="text-[9px] font-mono font-bold text-yc-accent">MISSED OPTIMIZATION</span>
                    <p className="text-xs text-yc-text-muted mt-1">
                      Missing DB read replicas. With a 95% read-heavy load, the single DB primary is a bottleneck.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──── CURRICULUM ──── */}
      <section id="learn" className="py-24 md:py-32 border-b border-yc-border bg-yc-bg-alt">
        <div className="max-w-3xl mx-auto px-6 lg:px-12">
          <div className="animate-on-scroll text-center mb-16">
            <span className="text-xs font-medium text-yc-accent uppercase tracking-[0.12em]">The Curriculum</span>
            <h2 className="font-display text-3xl md:text-4xl font-[500] text-yc-text mt-4 mb-4">
              Five levels. One path.
            </h2>
            <p className="text-sm md:text-base text-yc-text-muted">
              From &ldquo;what even is a load balancer&rdquo; to distributed consensus and CRDT-based collaboration.
            </p>
          </div>

          <div className="space-y-0">
            {[
              { level: 'L1', title: 'Foundations', lessons: '8 lessons', tags: ['Capacity estimation', 'Interview format'] },
              { level: 'L2', title: 'Building Blocks', lessons: '10 lessons', tags: ['Databases', 'Caches'] },
              { level: 'L3', title: 'Scaling Patterns', lessons: '8 lessons', tags: ['Sharding', 'Replication'] },
              { level: 'L4', title: 'Deep Dives', lessons: '12 lessons', tags: ['Video systems', 'Redis internals'] },
              { level: 'L5', title: 'Interview Framework', lessons: '6 lessons', tags: ['Master template', 'Rubric scoring'] },
            ].map((item, i) => (
              <div
                key={i}
                className="animate-on-scroll flex items-center justify-between py-6 border-b border-yc-border last:border-b-0 hover:bg-yc-bg-card/50 transition-colors -mx-6 lg:-mx-8 px-6 lg:px-8 rounded-lg"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center gap-6">
                  <span className="font-mono text-xs text-yc-text-muted w-6">{item.level}</span>
                  <div>
                    <h4 className="font-display text-base font-[500] text-yc-text">{item.title}</h4>
                    <span className="text-xs font-mono text-yc-text-muted">{item.lessons}</span>
                  </div>
                </div>
                <div className="hidden sm:flex gap-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-medium px-2 py-1 rounded-md border border-yc-border text-yc-text-muted bg-yc-bg"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── TESTIMONIALS ──── */}
      <section className="py-24 md:py-32 border-b border-yc-border">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                quote: 'Went from getting rejected at every system design round to clearing two staff engineer loops in six weeks. The rubric scoring was the difference — I finally knew what I was actually missing.',
                initials: 'AK',
                name: 'AK',
                title: 'Staff Engineer',
              },
              {
                quote: 'The simulation engine is unlike anything else. Watching my design fail under traffic made the concepts land in a way that no course had managed in three years.',
                initials: 'RV',
                name: 'RV',
                title: 'Senior Backend Engineer',
              },
              {
                quote: 'I used the canvas to prototype a real architectural decision at work, not just for interviews. The version history alone made it worth upgrading.',
                initials: 'SL',
                name: 'SL',
                title: 'Platform Architect',
              },
            ].map((t, i) => (
              <div
                key={i}
                className="animate-on-scroll border border-yc-border rounded-xl p-8 md:p-10 bg-yc-bg-alt"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <p className="text-sm md:text-base text-yc-text-muted leading-relaxed mb-8 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-yc-border flex items-center justify-center text-xs font-semibold text-yc-text font-mono">
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-yc-text">{t.name}</div>
                    <div className="text-xs text-yc-text-muted font-mono">{t.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── PRICING ──── */}
      <section id="pricing" className="py-24 md:py-32 border-b border-yc-border">
        <div className="max-w-5xl mx-auto px-6 lg:px-12">
          <div className="animate-on-scroll text-center mb-16">
            <span className="text-xs font-medium text-yc-accent uppercase tracking-[0.12em]">PRICING</span>
            <h2 className="font-display text-3xl md:text-4xl font-[500] text-yc-text mt-4 mb-4">
              Start free. Upgrade when it matters.
            </h2>
            {/* Annual toggle */}
            <div className="inline-flex items-center gap-3 mt-2">
              <span className={`text-sm ${annual ? 'text-yc-text-muted' : 'text-yc-text'}`}>Monthly</span>
              <button
                onClick={() => setAnnual(!annual)}
                className={`relative w-11 h-6 rounded-full border transition-colors ${
                  annual ? 'bg-yc-accent border-yc-accent' : 'bg-yc-bg-card border-yc-border'
                }`}
                aria-label="Toggle annual pricing"
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    annual ? 'translate-x-[22px]' : 'translate-x-[3px]'
                  }`}
                />
              </button>
              <div className="flex items-center gap-1.5">
                <span className={`text-sm ${annual ? 'text-yc-text' : 'text-yc-text-muted'}`}>Annually</span>
                <span className="text-[10px] font-mono font-semibold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">SAVE 20%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free Plan */}
            <div className="animate-on-scroll bg-white border border-yc-border rounded-xl p-8 md:p-10 flex flex-col">
              <span className="text-[10px] font-mono font-semibold text-yc-text-muted uppercase tracking-wider mb-2">FREE</span>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="font-display text-4xl md:text-5xl font-[500] text-yc-text">$0</span>
                <span className="text-sm text-yc-text-muted">/month</span>
              </div>
              <p className="text-sm text-yc-text-muted mb-8">
                Everything you need to learn the fundamentals and build your first designs.
              </p>
              <ul className="space-y-3 mb-10 flex-1">
                {[
                  'Level 1 + 2 curriculum (18 lessons)',
                  '3 saved designs',
                  '10 interview prompt templates',
                  'Basic traffic simulation',
                  '5 AI reviews per month',
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-yc-text-muted">
                    <span className="w-1 h-1 rounded-full bg-yc-border" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block text-center text-sm font-medium py-3 border border-yc-border text-yc-text rounded-lg hover:bg-yc-bg-alt transition"
              >
                Get started free
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="animate-on-scroll bg-white border-2 border-yc-accent rounded-xl p-8 md:p-10 flex flex-col relative">
              <span className="absolute top-0 right-0 text-[9px] font-mono font-bold bg-yc-accent text-white px-3 py-1.5 rounded-tr-xl rounded-bl-lg">
                MOST POPULAR
              </span>
              <span className="text-[10px] font-mono font-semibold text-yc-accent uppercase tracking-wider mb-2">PRO</span>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-display text-4xl md:text-5xl font-[500] text-yc-text">
                  {annual ? '$15' : '$19'}
                </span>
                <span className="text-sm text-yc-text-muted">/month</span>
              </div>
              {annual && (
                <span className="text-[11px] font-mono text-green-700 mb-2">Billed annually ($180/yr)</span>
              )}
              <p className="text-sm text-yc-text-muted mb-8 mt-1">
                Unlocks the complete sandbox, chaos suite, full curriculum, and unlimited AI reviews.
              </p>
              <ul className="space-y-3 mb-10 flex-1">
                {[
                  'All 5 levels — 44 lessons',
                  'Unlimited saved designs + version history',
                  'All 10 interview prompts with rubric scoring',
                  'Full chaos simulation suite',
                  '100 AI reviews per month + cost estimation',
                  'PDF export + shareable blueprint publishing',
                  'Model answer comparison after each session',
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-yc-text-muted">
                    <span className="w-1 h-1 rounded-full bg-yc-accent" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block text-center text-sm font-medium py-3 bg-yc-accent text-white rounded-lg hover:bg-yc-accent-hover transition"
              >
                Start Pro &mdash; 7 days free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ──── FINAL CTA ──── */}
      <section className="py-24 md:py-32 border-b border-yc-border text-center">
        <div className="max-w-2xl mx-auto px-6 lg:px-12">
          <div className="animate-on-scroll">
            <span className="text-xs font-medium text-yc-accent uppercase tracking-[0.12em]">READY TO START</span>
            <h2 className="font-display text-3xl md:text-4xl font-[500] text-yc-text mt-4 mb-4 leading-tight">
              Your next system design<br />
              interview is in 6 weeks.
            </h2>
            <p className="text-sm md:text-base text-yc-text-muted mb-10 max-w-lg mx-auto">
              Most engineers spend that time re-reading the same articles. Start building and scoring your designs today.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center px-8 py-4 bg-yc-accent text-white text-sm font-medium rounded-lg hover:bg-yc-accent-hover transition"
            >
              Start learning free &rarr;
            </Link>
            <p className="text-xs text-yc-text-muted mt-4">
              No credit card required. Pro trial included.
            </p>
          </div>
        </div>
      </section>

      {/* ──── FOOTER ──── */}
      <footer className="py-16 md:py-20">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <LogoIcon />
                <span className="font-display font-semibold text-base text-yc-text">SD-OS</span>
              </div>
              <p className="text-sm text-yc-text-muted leading-relaxed max-w-[240px]">
                The system design platform for engineers who take interviews seriously.
              </p>
              <p className="text-xs font-mono text-yc-text-muted mt-6">
                &copy; 2026 SD-OS. All rights reserved.
              </p>
            </div>

            {/* Product */}
            <div>
              <span className="text-[10px] font-mono font-semibold text-yc-text-muted uppercase tracking-wider mb-4 block">Product</span>
              <div className="space-y-3">
                <a href="#learn" className="block text-sm text-yc-text-muted hover:text-yc-text transition">Learn</a>
                <a href="#build" className="block text-sm text-yc-text-muted hover:text-yc-text transition">Build</a>
                <a href="#evaluate" className="block text-sm text-yc-text-muted hover:text-yc-text transition">Evaluate</a>
                <a href="#pricing" className="block text-sm text-yc-text-muted hover:text-yc-text transition">Pricing</a>
              </div>
            </div>

            {/* Resources */}
            <div>
              <span className="text-[10px] font-mono font-semibold text-yc-text-muted uppercase tracking-wider mb-4 block">Resources</span>
              <div className="space-y-3">
                <Link href="/about" className="block text-sm text-yc-text-muted hover:text-yc-text transition">About</Link>
                <Link href="/blog" className="block text-sm text-yc-text-muted hover:text-yc-text transition">Blog</Link>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="block text-sm text-yc-text-muted hover:text-yc-text transition">Twitter/X</a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="block text-sm text-yc-text-muted hover:text-yc-text transition">GitHub</a>
              </div>
            </div>

            {/* Company */}
            <div>
              <span className="text-[10px] font-mono font-semibold text-yc-text-muted uppercase tracking-wider mb-4 block">Company</span>
              <div className="space-y-3">
                <Link href="/about" className="block text-sm text-yc-text-muted hover:text-yc-text transition">About</Link>
                <Link href="/blog" className="block text-sm text-yc-text-muted hover:text-yc-text transition">Blog</Link>
                <Link href="/login" className="block text-sm text-yc-text-muted hover:text-yc-text transition">Login</Link>
                <Link href="/signup" className="block text-sm text-yc-text-muted hover:text-yc-text transition">Sign Up</Link>
              </div>
            </div>
          </div>

          <div className="border-t border-yc-border pt-6 flex flex-wrap justify-between gap-4">
            <span className="text-xs font-mono text-yc-text-muted">
              Privacy Policy &middot; Terms of Service
            </span>
            <span className="text-xs font-mono text-yc-text-muted">
              Built for engineers. Not for everyone.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
