'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';

// Custom icons as lightweight components to avoid loading external icons
function LogoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px' }}>
      <circle cx="6" cy="12" r="3" fill="var(--accent-amber)" />
      <circle cx="18" cy="6" r="3" fill="var(--accent-amber)" />
      <circle cx="18" cy="18" r="3" fill="var(--accent-amber)" />
      <line x1="9" y1="11" x2="15" y2="7.5" stroke="var(--accent-amber)" strokeWidth="2" />
      <line x1="9" y1="13" x2="15" y2="16.5" stroke="var(--accent-amber)" strokeWidth="2" />
    </svg>
  );
}

// Hook for scroll progress at the top of the page
function useScrollProgress() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.body.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollProgress;
}

// Hook for count-up animation
function useCountUp(target: number, duration = 1800, inView = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start: number | null = null;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(eased * target);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
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

  // Refs for scroll elements
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsInView, setStatsInView] = useState(false);

  // Load Bricolage Grotesque, Inter, and JetBrains Mono from Google Fonts
  useEffect(() => {
    const link1 = document.createElement('link');
    link1.rel = 'preconnect';
    link1.href = 'https://fonts.googleapis.com';
    const link2 = document.createElement('link');
    link2.rel = 'preconnect';
    link2.href = 'https://fonts.gstatic.com';
    link2.crossOrigin = 'anonymous';
    const link3 = document.createElement('link');
    link3.rel = 'stylesheet';
    link3.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap';

    document.head.appendChild(link1);
    document.head.appendChild(link2);
    document.head.appendChild(link3);

    return () => {
      document.head.removeChild(link1);
      document.head.removeChild(link2);
      document.head.removeChild(link3);
    };
  }, []);

  // Scroll handler for Nav
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // IntersectionObserver for animate-on-scroll elements & stat bars
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

    // Stats specific observer
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

    if (statsRef.current) {
      statsObserver.observe(statsRef.current);
    }

    return () => {
      observer.disconnect();
      statsObserver.disconnect();
    };
  }, []);

  // Counts
  const count1 = useCountUp(47, 1800, statsInView);
  const count2 = useCountUp(12000, 1800, statsInView);
  const count3 = useCountUp(94, 1800, statsInView);
  const count4 = useCountUp(32, 1800, statsInView); // 3.2x

  return (
    <div style={{ backgroundColor: 'var(--bg-base)', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      {/* 1. Injected Custom CSS System */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --bg-base: #080B14;
          --bg-surface: #0E1220;
          --bg-elevated: #151C2E;
          --border: #1E2A42;
          --border-bright: #2A3A58;
          --accent-amber: #E8A045;
          --accent-amber-dim: #C47B28;
          --accent-blue: #4D7FFF;
          --accent-blue-dim: #3060D4;
          --accent-green: #36C98E;
          --text-primary: #F0F2F7;
          --text-secondary: #8A95AD;
          --text-muted: #4A5568;
          --text-inverse: #080B14;
          
          --font-display: 'Bricolage Grotesque', sans-serif;
          --font-body: 'Inter', sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
        }

        body {
          background-color: var(--bg-base) !important;
          color: var(--text-primary) !important;
          font-family: var(--font-body);
        }

        .bricolage {
          font-family: var(--font-display);
        }

        .mono {
          font-family: var(--font-mono);
        }

        .focus-outline:focus-visible {
          outline: 2px solid var(--accent-amber);
          outline-offset: 3px;
        }

        /* Nav Transition */
        nav.scrolled {
          background: rgba(8, 11, 20, 0.88) !important;
          backdrop-filter: blur(20px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
          border-bottom: 1px solid var(--border) !important;
        }

        /* Scroll animations */
        .animate-on-scroll {
          opacity: 0;
          transform: translateY(32px);
        }

        @media (prefers-reduced-motion: no-preference) {
          .animate-on-scroll {
            transition: opacity 600ms cubic-bezier(0.16, 1, 0.3, 1),
                        transform 600ms cubic-bezier(0.16, 1, 0.3, 1);
          }
          .animate-on-scroll.is-visible {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-on-scroll {
            opacity: 1;
            transform: none;
          }
        }

        /* Staggered entrance animation for hero diagram nodes */
        @keyframes heroNodeEntrance {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hero-diagram-node {
          opacity: 0;
        }

        @media (prefers-reduced-motion: no-preference) {
          .hero-diagram-node {
            animation: heroNodeEntrance 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-diagram-node {
            opacity: 1;
            transform: none;
          }
        }

        /* Pulsing states */
        @keyframes pulseRing {
          0% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.4);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 0.4;
          }
        }

        .pulse-amber {
          animation: pulseRing 2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }

        @keyframes pulseRed {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }

        .pulse-red {
          animation: pulseRed 1.5s ease-in-out infinite;
        }

        /* Custom pricing switch track toggle styling */
        .pricing-switch-track {
          width: 44px;
          height: 24px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 9999px;
          position: relative;
          cursor: pointer;
          transition: background 200ms ease, border-color 200ms ease;
        }

        .pricing-switch-track.active {
          background: var(--accent-amber);
          border-color: var(--accent-amber-dim);
        }

        .pricing-switch-thumb {
          width: 16px;
          height: 16px;
          background: var(--text-primary);
          border-radius: 50%;
          position: absolute;
          top: 3px;
          left: 3px;
          transition: transform 200ms ease;
        }

        .pricing-switch-thumb.active {
          transform: translateX(20px);
          background: var(--text-inverse);
        }

        /* Navigation link hover logic */
        .nav-link {
          font-family: var(--font-body);
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          transition: color 200ms ease;
          text-decoration: none;
        }
        .nav-link:hover {
          color: var(--text-primary);
        }
        .nav-link.active {
          color: var(--accent-amber);
        }

        /* Container utility */
        .section-container {
          max-width: 1160px;
          margin: 0 auto;
          padding: 0 24px;
          position: relative;
          z-index: 2;
        }

        /* Testimonial scroll snaps */
        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        @media (max-width: 768px) {
          .testimonials-grid {
            display: flex;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            padding-bottom: 16px;
            gap: 16px;
          }
          .testimonial-card {
            min-width: 290px;
            scroll-snap-align: start;
          }
        }
      ` }} />

      {/* Page Scroll Progress Bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, zIndex: 101,
        height: '2px', background: 'var(--accent-amber)',
        width: `${scrollProgress}%`,
        transition: 'width 50ms linear'
      }} />

      {/* 1. NAVBAR */}
      <nav className={scrolled ? 'scrolled' : ''} style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 100,
        background: 'transparent', borderBottom: '1px solid transparent',
        transition: 'background 300ms ease, backdrop-filter 300ms ease, border-color 300ms ease'
      }}>
        <div style={{
          maxWidth: '1160px', margin: '0 auto', padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          {/* Logo */}
          <Link href="/" className="focus-outline" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <LogoIcon />
            <span className="bricolage" style={{
              fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)',
              letterSpacing: '-0.03em'
            }}>SD-OS</span>
          </Link>

          {/* Desktop Nav Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }} className="hidden lg:flex">
            <a href="#learn" className="nav-link">Learn</a>
            <a href="#build" className="nav-link">Build</a>
            <a href="#evaluate" className="nav-link">Evaluate</a>
            <a href="#pricing" className="nav-link">Pricing</a>
          </div>

          {/* Desktop CTA Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }} className="hidden lg:flex">
            <Link href="/login" className="nav-link focus-outline" style={{ background: 'transparent', border: 'none' }}>Log in</Link>
            <Link href="/signup" className="focus-outline" style={{
              background: 'var(--accent-amber)', color: 'var(--text-inverse)',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '13px',
              padding: '9px 18px', borderRadius: '8px', border: 'none',
              transition: 'background 200ms ease, transform 200ms ease', textDecoration: 'none'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--accent-amber-dim)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'var(--accent-amber)'}>
              Start Free →
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="lg:hidden focus-outline"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '5px' }}
          >
            <span style={{ width: '18px', height: '2px', background: 'var(--text-secondary)' }} />
            <span style={{ width: '18px', height: '2px', background: 'var(--text-secondary)' }} />
            <span style={{ width: '18px', height: '2px', background: 'var(--text-secondary)' }} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      <div className={`mobile-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />

      {/* Mobile drawer */}
      <div className={`mobile-drawer ${drawerOpen ? 'open' : ''}`}>
        <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
            <span className="bricolage" style={{ fontWeight: 800, fontSize: '18px' }}>SD-OS Drawer</span>
            <button onClick={() => setDrawerOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '24px', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <a href="#learn" onClick={() => setDrawerOpen(false)} className="nav-link" style={{ fontSize: '16px' }}>Learn</a>
            <a href="#build" onClick={() => setDrawerOpen(false)} className="nav-link" style={{ fontSize: '16px' }}>Build</a>
            <a href="#evaluate" onClick={() => setDrawerOpen(false)} className="nav-link" style={{ fontSize: '16px' }}>Evaluate</a>
            <a href="#pricing" onClick={() => setDrawerOpen(false)} className="nav-link" style={{ fontSize: '16px' }}>Pricing</a>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Link href="/login" onClick={() => setDrawerOpen(false)} className="nav-link" style={{ textAlign: 'center', fontSize: '15px' }}>Log in</Link>
            <Link href="/signup" onClick={() => setDrawerOpen(false)} className="focus-outline" style={{
              background: 'var(--accent-amber)', color: 'var(--text-inverse)',
              textAlign: 'center', padding: '14px', borderRadius: '8px',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '15px', textDecoration: 'none'
            }}>
              Start Free →
            </Link>
          </div>
        </div>
      </div>

      {/* 2. HERO SECTION */}
      <section style={{
        padding: '160px 0 100px 0', position: 'relative',
        background: 'var(--bg-base)', borderBottom: '1px solid var(--border)'
      }}>
        {/* Topology Background */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.15 }}>
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="var(--border)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            {/* Custom static nodes */}
            <circle cx="10%" cy="25%" r="3" fill="var(--border-bright)" opacity="0.6" />
            <circle cx="20%" cy="15%" r="4" fill="var(--border-bright)" opacity="0.6" />
            <circle cx="28%" cy="32%" r="3" fill="var(--border-bright)" opacity="0.6" />
            <circle cx="45%" cy="20%" r="5" fill="var(--border-bright)" opacity="0.6" />
            <circle cx="60%" cy="30%" r="3" fill="var(--border-bright)" opacity="0.6" />
            <circle cx="72%" cy="15%" r="4" fill="var(--border-bright)" opacity="0.6" />
            <circle cx="85%" cy="35%" r="3" fill="var(--border-bright)" opacity="0.6" />
            <circle cx="92%" cy="20%" r="4" fill="var(--border-bright)" opacity="0.6" />

            <path d="M 10% 25% L 20% 15% M 20% 15% L 28% 32% M 28% 32% L 45% 20% M 60% 30% L 72% 15% M 72% 15% L 85% 35% M 85% 35% L 92% 20%"
              stroke="var(--border)" strokeWidth="1.5" opacity="0.4" fill="none" />
          </svg>
        </div>

        <div className="section-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px' }} className="lg:grid-cols-12 lg:items-center">
            {/* Hero Left */}
            <div className="lg:col-span-7">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-amber)', display: 'inline-block' }} />
                <span className="mono" style={{
                  fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--accent-amber)',
                  letterSpacing: '0.08em', textTransform: 'uppercase'
                }}>
                  System Design Learning OS
                </span>
              </div>

              <h1 className="bricolage md:text-6xl lg:text-7xl" style={{
                fontSize: '48px', fontWeight: 800, color: 'var(--text-primary)',
                lineHeight: 1.05, letterSpacing: '-0.05em', marginBottom: '24px'
              }}>
                Design systems<br />
                that actually<br />
                hold up.
              </h1>

              <p style={{
                fontSize: 'var(--text-lg)', color: 'var(--text-secondary)',
                lineHeight: 1.6, maxWidth: '460px', marginBottom: '40px'
              }}>
                Structured curriculum, an interactive architecture canvas, and an AI reviewer that tells you exactly where your design breaks.<br /><br />
                Built for engineers targeting senior and staff roles.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <Link href="/signup" className="focus-outline" style={{
                  background: 'var(--accent-amber)', color: 'var(--text-inverse)',
                  fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '15px',
                  padding: '13px 28px', borderRadius: '8px', border: 'none',
                  cursor: 'pointer', transition: 'background 200ms ease', textDecoration: 'none'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--accent-amber-dim)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'var(--accent-amber)'}>
                  Start learning free
                </Link>
                <a href="#how-it-works" className="focus-outline" style={{
                  background: 'transparent', color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '15px',
                  padding: '13px 28px', borderRadius: '8px', border: '1px solid var(--border-bright)',
                  cursor: 'pointer', transition: 'color 200ms, border-color 200ms', textDecoration: 'none'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-blue)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-bright)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}>
                  See how it works
                </a>
              </div>

              {/* Social Proof */}
              <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  Trusted by <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>2,400+</span> engineers
                </span>
                <span style={{ color: 'var(--text-muted)' }}>·</span>
                <span className="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>4.9 / 5</span> average score improvement
                </span>
              </div>
            </div>

            {/* Hero Right Visual Column - URL Shortener Diagram */}
            <div className="lg:col-span-5" style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{
                position: 'relative', width: '510px', height: '390px',
                background: 'rgba(14, 18, 32, 0.3)', border: '1px solid var(--border)',
                borderRadius: '12px', overflow: 'hidden'
              }} className="focus-outline">
                {/* SVG Connections Canvas */}
                <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 2 L 10 5 L 0 8 z" fill="var(--border-bright)" />
                    </marker>
                  </defs>

                  {/* Connection lines */}
                  <line x1="75" y1="62" x2="255" y2="132" stroke="var(--border-bright)" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <line x1="255" y1="32" x2="255" y2="110" stroke="var(--border-bright)" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <line x1="435" y1="32" x2="435" y2="210" stroke="var(--border-bright)" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <line x1="255" y1="154" x2="145" y2="210" stroke="var(--border-bright)" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <line x1="255" y1="154" x2="305" y2="210" stroke="var(--border-bright)" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <line x1="145" y1="254" x2="225" y2="310" stroke="var(--border-bright)" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <line x1="305" y1="254" x2="225" y2="310" stroke="var(--border-bright)" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <line x1="145" y1="232" x2="380" y2="232" stroke="var(--border-bright)" strokeWidth="1.5" strokeDasharray="4" markerEnd="url(#arrow)" />
                  <line x1="305" y1="254" x2="435" y2="310" stroke="var(--border-bright)" strokeWidth="1.5" markerEnd="url(#arrow)" />
                </svg>

                {/* Nodes with stagger animations */}
                {/* Client */}
                <div className="hero-diagram-node" style={{
                  position: 'absolute', left: '20px', top: '40px', zIndex: 2,
                  width: '110px', height: '44px', background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', padding: '0 12px',
                  animationDelay: '300ms'
                }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-blue)', marginRight: '8px' }} />
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Client</span>
                </div>

                {/* DNS */}
                <div className="hero-diagram-node" style={{
                  position: 'absolute', left: '200px', top: '10px', zIndex: 2,
                  width: '110px', height: '44px', background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', padding: '0 12px',
                  animationDelay: '380ms'
                }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-blue)', marginRight: '8px' }} />
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>DNS</span>
                </div>

                {/* CDN */}
                <div className="hero-diagram-node" style={{
                  position: 'absolute', left: '380px', top: '10px', zIndex: 2,
                  width: '110px', height: '44px', background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', padding: '0 12px',
                  animationDelay: '460ms'
                }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-green)', marginRight: '8px' }} />
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>CDN</span>
                </div>

                {/* Load Balancer */}
                <div className="hero-diagram-node" style={{
                  position: 'absolute', left: '200px', top: '110px', zIndex: 2,
                  width: '110px', height: '44px', background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', padding: '0 12px',
                  animationDelay: '540ms'
                }}>
                  {/* Pulsing traffic indicator ring around node dot */}
                  <div style={{ position: 'relative', width: '8px', height: '8px', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ position: 'absolute', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-amber)' }} className="pulse-amber" />
                    <span style={{ position: 'absolute', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-blue)', zIndex: 3 }} />
                  </div>
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Nginx LB</span>
                </div>

                {/* API Server 1 */}
                <div className="hero-diagram-node" style={{
                  position: 'absolute', left: '90px', top: '210px', zIndex: 2,
                  width: '110px', height: '44px', background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', padding: '0 12px',
                  animationDelay: '620ms'
                }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-blue)', marginRight: '8px' }} />
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Web API v1</span>
                </div>

                {/* API Server 2 */}
                <div className="hero-diagram-node" style={{
                  position: 'absolute', left: '250px', top: '210px', zIndex: 2,
                  width: '110px', height: '44px', background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', padding: '0 12px',
                  animationDelay: '700ms'
                }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-blue)', marginRight: '8px' }} />
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Web API v2</span>
                </div>

                {/* Redis Cache */}
                <div className="hero-diagram-node" style={{
                  position: 'absolute', left: '380px', top: '210px', zIndex: 2,
                  width: '110px', height: '44px', background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', padding: '0 12px',
                  animationDelay: '780ms'
                }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-amber)', marginRight: '8px' }} />
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Redis Cache</span>
                </div>

                {/* DB Primary */}
                <div className="hero-diagram-node" style={{
                  position: 'absolute', left: '170px', top: '310px', zIndex: 2,
                  width: '110px', height: '44px', background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', padding: '0 12px',
                  animationDelay: '860ms'
                }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-amber)', marginRight: '8px' }} />
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Postgres DB</span>
                </div>

                {/* Object Storage */}
                <div className="hero-diagram-node" style={{
                  position: 'absolute', left: '380px', top: '310px', zIndex: 2,
                  width: '110px', height: '44px', background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', padding: '0 12px',
                  animationDelay: '940ms'
                }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-green)', marginRight: '8px' }} />
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>S3 Storage</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. STATS BAR */}
      <section ref={statsRef} style={{
        background: 'var(--bg-surface)', borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)', padding: '40px 0'
      }}>
        <div className="section-container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }} className="md:grid-cols-4">
            {/* Stat 1 */}
            <div style={{ borderRight: '1px solid var(--border)', paddingRight: '20px' }}>
              <div className="mono" style={{ fontSize: 'var(--text-3xl)', fontWeight: 500, color: 'var(--accent-amber)', marginBottom: '4px' }}>
                {Math.floor(count1)}
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', maxWidth: '140px' }}>
                System design patterns covered
              </div>
            </div>

            {/* Stat 2 */}
            <div style={{ borderRight: '1px solid var(--border)', paddingRight: '20px' }} className="md:border-right-0">
              <div className="mono" style={{ fontSize: 'var(--text-3xl)', fontWeight: 500, color: 'var(--accent-amber)', marginBottom: '4px' }}>
                {Math.floor(count2).toLocaleString()}+
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', maxWidth: '140px' }}>
                Engineers trained
              </div>
            </div>

            {/* Stat 3 */}
            <div style={{ borderRight: '1px solid var(--border)', paddingRight: '20px' }}>
              <div className="mono" style={{ fontSize: 'var(--text-3xl)', fontWeight: 500, color: 'var(--accent-amber)', marginBottom: '4px' }}>
                {Math.floor(count3)}%
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', maxWidth: '140px' }}>
                Report scoring improvement after 4 weeks
              </div>
            </div>

            {/* Stat 4 */}
            <div style={{ paddingRight: '20px' }}>
              <div className="mono" style={{ fontSize: 'var(--text-3xl)', fontWeight: 500, color: 'var(--accent-amber)', marginBottom: '4px' }}>
                {(count4 / 10).toFixed(1)}×
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', maxWidth: '140px' }}>
                Average interview performance increase
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS — THREE SURFACES */}
      <section id="how-it-works" style={{ padding: '120px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="section-container">
          {/* Header */}
          <div className="animate-on-scroll" style={{ textAlign: 'center', marginBottom: '80px' }}>
            <span className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-amber)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              The Three Surfaces
            </span>
            <h2 className="bricolage md:text-4xl" style={{ fontSize: 'var(--text-2xl)', color: 'var(--text-primary)', marginTop: '8px', marginBottom: '16px' }}>
              Learn. Build. Evaluate.
            </h2>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)' }}>
              Most tools give you one. We built the loop.
            </p>
          </div>

          {/* Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }} className="md:grid-cols-3">
            {/* Card 1: Learn */}
            <div className="animate-on-scroll" style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '12px', overflow: 'hidden', padding: '32px',
              display: 'flex', flexDirection: 'column', transitionDelay: '0ms'
            }}>
              <div style={{ height: '3px', background: 'var(--accent-blue)', margin: '-32px -32px 24px -32px' }} />
              <span className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-blue)', letterSpacing: '0.08em', marginBottom: '16px' }}>01</span>
              <h3 className="bricolage" style={{ fontSize: 'var(--text-xl)', color: 'var(--text-primary)', marginBottom: '12px' }}>Structured curriculum</h3>
              <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '24px', flexGrow: 1 }}>
                Five progressive levels from capacity estimation to distributed consensus. Each lesson has diagrams you can interact with, not just read.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span className="mono" style={{ background: 'rgba(77,127,255,0.08)', border: '1px solid rgba(77,127,255,0.2)', color: 'var(--accent-blue)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>47 lessons</span>
                <span className="mono" style={{ background: 'rgba(77,127,255,0.08)', border: '1px solid rgba(77,127,255,0.2)', color: 'var(--accent-blue)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>5 levels</span>
                <span className="mono" style={{ background: 'rgba(77,127,255,0.08)', border: '1px solid rgba(77,127,255,0.2)', color: 'var(--accent-blue)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>Quizzes</span>
              </div>
            </div>

            {/* Card 2: Build */}
            <div className="animate-on-scroll" style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '12px', overflow: 'hidden', padding: '32px',
              display: 'flex', flexDirection: 'column', transitionDelay: '120ms'
            }}>
              <div style={{ height: '3px', background: 'var(--accent-amber)', margin: '-32px -32px 24px -32px' }} />
              <span className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-amber)', letterSpacing: '0.08em', marginBottom: '16px' }}>02</span>
              <h3 className="bricolage" style={{ fontSize: 'var(--text-xl)', color: 'var(--text-primary)', marginBottom: '12px' }}>Architecture canvas</h3>
              <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '24px', flexGrow: 1 }}>
                Drag, connect, and configure real system components. Load balancers, caches, queues, databases — wired together the way they actually work.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span className="mono" style={{ background: 'rgba(232,160,69,0.08)', border: '1px solid rgba(232,160,69,0.2)', color: 'var(--accent-amber)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>16 node types</span>
                <span className="mono" style={{ background: 'rgba(232,160,69,0.08)', border: '1px solid rgba(232,160,69,0.2)', color: 'var(--accent-amber)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>Templates</span>
                <span className="mono" style={{ background: 'rgba(232,160,69,0.08)', border: '1px solid rgba(232,160,69,0.2)', color: 'var(--accent-amber)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>Version history</span>
              </div>
            </div>

            {/* Card 3: Evaluate */}
            <div className="animate-on-scroll" style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '12px', overflow: 'hidden', padding: '32px',
              display: 'flex', flexDirection: 'column', transitionDelay: '240ms'
            }}>
              <div style={{ height: '3px', background: 'var(--accent-green)', margin: '-32px -32px 24px -32px' }} />
              <span className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-green)', letterSpacing: '0.08em', marginBottom: '16px' }}>03</span>
              <h3 className="bricolage" style={{ fontSize: 'var(--text-xl)', color: 'var(--text-primary)', marginBottom: '12px' }}>Simulation and scoring</h3>
              <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '24px', flexGrow: 1 }}>
                Inject traffic, trigger failures, and watch your design respond. Then get a rubric score and AI review that explains exactly what a staff engineer would have done differently.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span className="mono" style={{ background: 'rgba(54,201,142,0.08)', border: '1px solid rgba(54,201,142,0.2)', color: 'var(--accent-green)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>Chaos injection</span>
                <span className="mono" style={{ background: 'rgba(54,201,142,0.08)', border: '1px solid rgba(54,201,142,0.2)', color: 'var(--accent-green)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>Rubric scoring</span>
                <span className="mono" style={{ background: 'rgba(54,201,142,0.08)', border: '1px solid rgba(54,201,142,0.2)', color: 'var(--accent-green)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>AI review</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FEATURE DEEP DIVE — ALTERNATING ROWS */}
      <section style={{ background: 'var(--bg-base)' }}>
        {/* Row 1: The Canvas */}
        <div id="build" style={{ padding: '100px 0', borderBottom: '1px solid var(--border)' }}>
          <div className="section-container">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px' }} className="lg:grid-cols-12 lg:items-center">
              {/* Text Left */}
              <div className="lg:col-span-6 animate-on-scroll">
                <span className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-amber)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  BUILD
                </span>
                <h3 className="bricolage md:text-3xl" style={{ fontSize: 'var(--text-2xl)', color: 'var(--text-primary)', marginTop: '8px', marginBottom: '16px' }}>
                  An architecture canvas that knows what the components actually do
                </h3>
                <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '24px' }}>
                  Every node in the canvas is a real system primitive with configurable properties. Set replication factor on your database. Toggle read replicas. Define your cache eviction policy. The canvas understands the design.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ borderLeft: '2px solid var(--accent-amber)', paddingLeft: '14px' }}>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                      16 component types modeled after production system primitives
                    </p>
                  </div>
                  <div style={{ borderLeft: '2px solid var(--accent-amber)', paddingLeft: '14px' }}>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                      Node property inspector with configurable latency, capacity, and replication
                    </p>
                  </div>
                  <div style={{ borderLeft: '2px solid var(--accent-amber)', paddingLeft: '14px' }}>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                      Version history with named snapshots and one-click restore
                    </p>
                  </div>
                  <div style={{ borderLeft: '2px solid var(--accent-amber)', paddingLeft: '14px' }}>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                      Export to PNG, SVG, or shareable read-only link
                    </p>
                  </div>
                </div>
              </div>

              {/* Visual Right (Mock Canvas) */}
              <div className="lg:col-span-6 animate-on-scroll" style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  position: 'relative', width: '100%', maxWidth: '480px', height: '320px',
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: '12px', display: 'flex', overflow: 'hidden'
                }}>
                  {/* Left Toolbar Strip */}
                  <div style={{
                    width: '40px', background: 'var(--bg-elevated)',
                    borderRight: '1px solid var(--border)', display: 'flex',
                    flexDirection: 'column', gap: '16px', alignItems: 'center', paddingTop: '16px'
                  }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'rgba(77,127,255,0.2)', border: '1px solid var(--accent-blue)' }} />
                    <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'rgba(232,160,69,0.2)', border: '1px solid var(--accent-amber)' }} />
                    <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'rgba(54,201,142,0.2)', border: '1px solid var(--accent-green)' }} />
                    <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                  </div>

                  {/* Main Grid Area */}
                  <div style={{ flexGrow: 1, position: 'relative', background: 'rgba(8,11,20,0.4)' }}>
                    {/* SVG grid lines simulated */}
                    <div style={{
                      position: 'absolute', left: '40px', top: '50px',
                      width: '100px', height: '36px', background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)', borderRadius: '6px',
                      display: 'flex', alignItems: 'center', padding: '0 8px'
                    }}>
                      <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--accent-blue)', marginRight: '6px' }} />
                      <span className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Nginx LB</span>
                    </div>

                    <div style={{
                      position: 'absolute', left: '60px', top: '150px',
                      width: '100px', height: '36px', background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-bright)', borderRadius: '6px',
                      display: 'flex', alignItems: 'center', padding: '0 8px'
                    }}>
                      <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--accent-blue)', marginRight: '6px' }} />
                      <span className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>API Gateway</span>
                    </div>
                  </div>

                  {/* Right Inspector Panel */}
                  <div style={{
                    width: '160px', background: 'var(--bg-elevated)',
                    borderLeft: '1px solid var(--border)', padding: '16px',
                    display: 'flex', flexDirection: 'column', gap: '12px'
                  }}>
                    <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>INSPECTOR</span>
                    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                      <span className="mono" style={{ fontSize: '10px', color: 'var(--text-primary)' }}>Nginx LB</span>
                    </div>
                    {/* Properties */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span className="mono" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Algorithm</span>
                      <div style={{ height: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '4px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span className="mono" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Connections</span>
                      <div style={{ height: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '4px' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Simulation */}
        <div id="evaluate" style={{ padding: '100px 0', borderBottom: '1px solid var(--border)' }}>
          <div className="section-container">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px' }} className="lg:grid-cols-12 lg:items-center">
              {/* Visual Left (Simulation Mock) */}
              <div className="lg:col-span-6 animate-on-scroll order-last lg:order-first" style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  position: 'relative', width: '100%', maxWidth: '440px',
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '24px', display: 'flex',
                  flexDirection: 'column', gap: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>LIVE SIMULATION</span>
                    <span className="mono" style={{ fontSize: '10px', color: 'var(--accent-green)', background: 'rgba(54,201,142,0.1)', padding: '2px 6px', borderRadius: '4px' }}>RUNNING</span>
                  </div>

                  {/* Metrics */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                      <span className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>QPS</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-amber)' }}>12,400</span>
                        {/* Sparkline mini representation */}
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px' }}>
                          <div style={{ width: '3px', height: '6px', background: 'var(--accent-amber)' }} />
                          <div style={{ width: '3px', height: '10px', background: 'var(--accent-amber)' }} />
                          <div style={{ width: '3px', height: '8px', background: 'var(--accent-amber)' }} />
                          <div style={{ width: '3px', height: '12px', background: 'var(--accent-amber)' }} />
                          <div style={{ width: '3px', height: '14px', background: 'var(--accent-amber)' }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                      <span className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>P99 Latency</span>
                      <span className="mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-blue)' }}>284ms</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Error Rate</span>
                      <span className="mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-green)' }}>0.04%</span>
                    </div>
                  </div>

                  {/* DB Overloaded Node Alert */}
                  <div style={{
                    background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)',
                    borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF4D4D' }} className="pulse-red" />
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600 }}>DB PRIMARY</span>
                    </div>
                    <span className="mono" style={{ fontSize: '10px', color: '#FF4D4D', fontWeight: 700 }}>OVERLOADED</span>
                  </div>
                </div>
              </div>

              {/* Text Right */}
              <div className="lg:col-span-6 animate-on-scroll">
                <span className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-blue)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  EVALUATE
                </span>
                <h3 className="bricolage md:text-3xl" style={{ fontSize: 'var(--text-2xl)', color: 'var(--text-primary)', marginTop: '8px', marginBottom: '16px' }}>
                  Run your design under real conditions before the interview
                </h3>
                <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '24px' }}>
                  Inject traffic at any rate. Kill any node. Partition the network. Watch queue depth build up and latency spike in real time — all computed locally in your browser, with no server required.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ borderLeft: '2px solid var(--accent-blue)', paddingLeft: '14px' }}>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                      Traffic injection from 1 to 100,000 req/s with burst mode
                    </p>
                  </div>
                  <div style={{ borderLeft: '2px solid var(--accent-blue)', paddingLeft: '14px' }}>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                      Chaos scenarios: node kill, network partition, DB replication lag
                    </p>
                  </div>
                  <div style={{ borderLeft: '2px solid var(--accent-blue)', paddingLeft: '14px' }}>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                      Cache hit rate and queue depth visualizations per node
                    </p>
                  </div>
                  <div style={{ borderLeft: '2px solid var(--accent-blue)', paddingLeft: '14px' }}>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                      Real-time P50 / P95 / P99 latency waterfall
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Interview Mode */}
        <div style={{ padding: '100px 0', borderBottom: '1px solid var(--border)' }}>
          <div className="section-container">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px' }} className="lg:grid-cols-12 lg:items-center">
              {/* Text Left */}
              <div className="lg:col-span-6 animate-on-scroll">
                <span className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-green)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  PRACTICE
                </span>
                <h3 className="bricolage md:text-3xl" style={{ fontSize: 'var(--text-2xl)', color: 'var(--text-primary)', marginTop: '8px', marginBottom: '16px' }}>
                  Interview mode with a rubric, not just a timer
                </h3>
                <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '24px' }}>
                  Choose a prompt, set your time limit, and design from scratch. When you submit, you get a scored breakdown by criteria — not a vague 'good job'. See exactly which components you missed and why they matter.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ borderLeft: '2px solid var(--accent-green)', paddingLeft: '14px' }}>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                      10 real interview prompts (URL shortener, Uber, WhatsApp, YouTube, and more)
                    </p>
                  </div>
                  <div style={{ borderLeft: '2px solid var(--accent-green)', paddingLeft: '14px' }}>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                      Rubric scoring across 8–12 criteria per prompt
                    </p>
                  </div>
                  <div style={{ borderLeft: '2px solid var(--accent-green)', paddingLeft: '14px' }}>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                      AI narrative review: what a staff engineer would have done differently
                    </p>
                  </div>
                  <div style={{ borderLeft: '2px solid var(--accent-green)', paddingLeft: '14px' }}>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                      Weakness summary across sessions — pattern recognition over time
                    </p>
                  </div>
                </div>
              </div>

              {/* Visual Right (Mock Scorecard) */}
              <div className="lg:col-span-6 animate-on-scroll" style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  position: 'relative', width: '100%', maxWidth: '440px',
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '24px', display: 'flex',
                  flexDirection: 'column', gap: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>URL Shortener · 42 min</span>
                    <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SUBMITTED</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span className="bricolage" style={{ fontSize: '48px', fontWeight: 800, color: 'var(--text-primary)' }}>73</span>
                    <span className="mono" style={{ fontSize: '16px', color: 'var(--text-muted)' }}>/ 100</span>
                  </div>

                  {/* Criteria list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Load Balancer present</span>
                      <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>✓</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Cache for redirects</span>
                      <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>✓</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>DB read replicas</span>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--accent-amber)', background: 'rgba(232,160,69,0.1)', padding: '2px 6px', borderRadius: '4px' }}>WARNING</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Rate limiting</span>
                      <span style={{ color: '#FF4D4D', fontWeight: 'bold' }}>✕</span>
                    </div>
                  </div>

                  {/* Highlight missed */}
                  <div style={{
                    background: 'rgba(232,160,69,0.06)', borderLeft: '3px solid var(--accent-amber)',
                    padding: '12px', borderRadius: '4px'
                  }}>
                    <span className="mono" style={{ fontSize: '10px', color: 'var(--accent-amber)', fontWeight: 700 }}>MISSED OPTIMIZATION</span>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                      Missing DB read replicas. With a 95% read-heavy load, the single DB primary is a bottleneck.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CURRICULUM SECTION */}
      <section id="learn" style={{ background: 'var(--bg-surface)', padding: '120px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="section-container" style={{ maxWidth: '720px' }}>
          {/* Header */}
          <div className="animate-on-scroll" style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-amber)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              The Curriculum
            </span>
            <h2 className="bricolage md:text-4xl" style={{ fontSize: 'var(--text-2xl)', color: 'var(--text-primary)', marginTop: '8px', marginBottom: '16px' }}>
              Five levels. One path.
            </h2>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)' }}>
              From "what even is a load balancer" to distributed consensus and CRDT-based collaboration.
            </p>
          </div>

          {/* Level Rows */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Level 1 */}
            <div className="animate-on-scroll" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)', padding: '24px 0',
              transitionDelay: '0ms', cursor: 'pointer'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>L1</span>
                <div>
                  <h4 className="bricolage" style={{ fontSize: '18px', color: 'var(--text-primary)' }}>Foundations</h4>
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>8 lessons</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="mono hidden sm:inline-block" style={{ background: 'rgba(77,127,255,0.08)', border: '1px solid rgba(77,127,255,0.2)', color: 'var(--accent-blue)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>Capacity estimation</span>
                <span className="mono" style={{ background: 'rgba(77,127,255,0.08)', border: '1px solid rgba(77,127,255,0.2)', color: 'var(--accent-blue)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>Interview format</span>
              </div>
            </div>

            {/* Level 2 */}
            <div className="animate-on-scroll" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)', padding: '24px 0',
              transitionDelay: '100ms', cursor: 'pointer'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>L2</span>
                <div>
                  <h4 className="bricolage" style={{ fontSize: '18px', color: 'var(--text-primary)' }}>Building Blocks</h4>
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>10 lessons</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="mono hidden sm:inline-block" style={{ background: 'rgba(77,127,255,0.08)', border: '1px solid rgba(77,127,255,0.2)', color: 'var(--accent-blue)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>Databases</span>
                <span className="mono" style={{ background: 'rgba(77,127,255,0.08)', border: '1px solid rgba(77,127,255,0.2)', color: 'var(--accent-blue)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>Caches</span>
              </div>
            </div>

            {/* Level 3 */}
            <div className="animate-on-scroll" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)', padding: '24px 0',
              transitionDelay: '200ms', cursor: 'pointer'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>L3</span>
                <div>
                  <h4 className="bricolage" style={{ fontSize: '18px', color: 'var(--text-primary)' }}>Scaling Patterns</h4>
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>8 lessons</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="mono hidden sm:inline-block" style={{ background: 'rgba(77,127,255,0.08)', border: '1px solid rgba(77,127,255,0.2)', color: 'var(--accent-blue)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>Sharding</span>
                <span className="mono" style={{ background: 'rgba(77,127,255,0.08)', border: '1px solid rgba(77,127,255,0.2)', color: 'var(--accent-blue)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>Replication</span>
              </div>
            </div>

            {/* Level 4 */}
            <div className="animate-on-scroll" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)', padding: '24px 0',
              transitionDelay: '300ms', cursor: 'pointer'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>L4</span>
                <div>
                  <h4 className="bricolage" style={{ fontSize: '18px', color: 'var(--text-primary)' }}>Deep Dives</h4>
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>12 lessons</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="mono hidden sm:inline-block" style={{ background: 'rgba(77,127,255,0.08)', border: '1px solid rgba(77,127,255,0.2)', color: 'var(--accent-blue)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>Video systems</span>
                <span className="mono" style={{ background: 'rgba(77,127,255,0.08)', border: '1px solid rgba(77,127,255,0.2)', color: 'var(--accent-blue)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>Redis internals</span>
              </div>
            </div>

            {/* Level 5 */}
            <div className="animate-on-scroll" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)', padding: '24px 0',
              transitionDelay: '400ms', cursor: 'pointer'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>L5</span>
                <div>
                  <h4 className="bricolage" style={{ fontSize: '18px', color: 'var(--text-primary)' }}>Interview Framework</h4>
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>6 lessons</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="mono hidden sm:inline-block" style={{ background: 'rgba(77,127,255,0.08)', border: '1px solid rgba(77,127,255,0.2)', color: 'var(--accent-blue)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>Master template</span>
                <span className="mono" style={{ background: 'rgba(77,127,255,0.08)', border: '1px solid rgba(77,127,255,0.2)', color: 'var(--accent-blue)', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>Rubric scoring</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SOCIAL PROOF / TESTIMONIALS */}
      <section style={{ padding: '120px 0', borderBottom: '1px solid var(--border)', background: 'var(--bg-base)' }}>
        <div className="section-container">
          <div className="testimonials-grid">
            {/* Testimonial 1 */}
            <div className="animate-on-scroll testimonial-card" style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '28px', transitionDelay: '0ms'
            }}>
              <p style={{
                fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7,
                borderLeft: '2px solid var(--accent-amber)', paddingLeft: '16px', marginBottom: '24px'
              }}>
                Went from getting rejected at every system design round to clearing two staff engineer loops in six weeks. The rubric scoring was the difference — I finally knew what I was actually missing.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', background: 'var(--border-bright)',
                  color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', fontSize: '13px'
                }} className="mono">AK</div>
                <div>
                  <h5 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>AK</h5>
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Staff Engineer</span>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="animate-on-scroll testimonial-card" style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '28px', transitionDelay: '100ms'
            }}>
              <p style={{
                fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7,
                borderLeft: '2px solid var(--accent-amber)', paddingLeft: '16px', marginBottom: '24px'
              }}>
                The simulation engine is unlike anything else. Watching my design fail under traffic made the concepts land in a way that no course had managed in three years.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', background: 'var(--border-bright)',
                  color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', fontSize: '13px'
                }} className="mono">RV</div>
                <div>
                  <h5 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>RV</h5>
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Senior Backend Engineer</span>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="animate-on-scroll testimonial-card" style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '28px', transitionDelay: '200ms'
            }}>
              <p style={{
                fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7,
                borderLeft: '2px solid var(--accent-amber)', paddingLeft: '16px', marginBottom: '24px'
              }}>
                I used the canvas to prototype a real architectural decision at work, not just for interviews. The version history alone made it worth upgrading.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', background: 'var(--border-bright)',
                  color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', fontSize: '13px'
                }} className="mono">SL</div>
                <div>
                  <h5 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>SL</h5>
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Platform Architect</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. PRICING SECTION */}
      <section id="pricing" style={{ padding: '120px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="section-container">
          {/* Header */}
          <div className="animate-on-scroll" style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-amber)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              PRICING
            </span>
            <h2 className="bricolage md:text-4xl" style={{ fontSize: 'var(--text-2xl)', color: 'var(--text-primary)', marginTop: '8px', marginBottom: '16px' }}>
              Start free. Upgrade when it matters.
            </h2>
            {/* Annual Toggle Switch */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
              <span style={{ fontSize: '14px', color: annual ? 'var(--text-secondary)' : 'var(--text-primary)' }}>Monthly</span>
              <div
                onClick={() => setAnnual(!annual)}
                className={`pricing-switch-track ${annual ? 'active' : ''}`}
              >
                <div className={`pricing-switch-thumb ${annual ? 'active' : ''}`} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', color: annual ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Annually</span>
                  <span className="mono" style={{ fontSize: '10px', color: 'var(--accent-green)', background: 'rgba(54,201,142,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>SAVE 20%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', maxWidth: '760px', margin: '0 auto' }} className="md:grid-cols-2">
            {/* Free Plan */}
            <div className="animate-on-scroll" style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '36px', display: 'flex', flexDirection: 'column'
            }}>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '8px' }}>FREE</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
                <span className="bricolage" style={{ fontSize: '48px', fontWeight: 800, color: 'var(--text-primary)' }}>$0</span>
                <span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>/month</span>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px' }}>
                Everything you need to learn the fundamentals and build your first designs.
              </p>

              {/* Feature List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px', flexGrow: 1 }}>
                {['Level 1 + 2 curriculum (18 lessons)', '3 saved designs', '10 interview prompt templates', 'Basic traffic simulation', '5 AI reviews per month'].map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border-bright)' }} />
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{f}</span>
                  </div>
                ))}
              </div>

              <Link href="/signup" className="focus-outline" style={{
                textAlign: 'center', padding: '13px', background: 'transparent',
                border: '1px solid var(--border-bright)', color: 'var(--text-primary)',
                borderRadius: '8px', fontWeight: 600, fontSize: '14px', textDecoration: 'none'
              }}>
                Get started free
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="animate-on-scroll" style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--accent-amber)',
              borderRadius: '12px', padding: '36px', display: 'flex', flexDirection: 'column', position: 'relative'
            }}>
              <span className="mono" style={{
                position: 'absolute', top: 0, right: 0, background: 'var(--accent-amber)',
                color: 'var(--text-inverse)', fontSize: '10px', fontWeight: 'bold',
                padding: '6px 12px', borderRadius: '0 12px 0 8px', letterSpacing: '0.05em'
              }}>MOST POPULAR</span>

              <span className="mono" style={{ fontSize: '11px', color: 'var(--accent-amber)', letterSpacing: '0.08em', marginBottom: '8px' }}>PRO</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                <span className="bricolage" style={{ fontSize: '48px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {annual ? '$15' : '$19'}
                </span>
                <span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>/month</span>
              </div>
              {annual && (
                <span className="mono" style={{ fontSize: '11px', color: 'var(--accent-green)', marginBottom: '12px', display: 'block' }}>
                  Billed annually ($180/yr)
                </span>
              )}
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px', marginTop: annual ? '0' : '16px' }}>
                Unlocks the complete sandbox, chaos suite, full curriculum, and unlimited AI reviews.
              </p>

              {/* Feature List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px', flexGrow: 1 }}>
                {[
                  'All 5 levels — 44 lessons',
                  'Unlimited saved designs + version history',
                  'All 10 interview prompts with rubric scoring',
                  'Full chaos simulation suite',
                  '100 AI reviews per month + cost estimation',
                  'PDF export + shareable blueprint publishing',
                  'Model answer comparison after each session'
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-amber)' }} />
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{f}</span>
                  </div>
                ))}
              </div>

              <Link href="/signup" className="focus-outline" style={{
                textAlign: 'center', padding: '13px', background: 'var(--accent-amber)',
                color: 'var(--text-inverse)', borderRadius: '8px', fontWeight: 600,
                fontSize: '14px', textDecoration: 'none', transition: 'background 200ms ease, transform 200ms ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--accent-amber-dim)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--accent-amber)';
                e.currentTarget.style.transform = 'none';
              }}>
                Start Pro — 7 days free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FINAL CTA SECTION */}
      <section style={{
        background: 'var(--bg-base)', borderTop: '1px solid var(--border)',
        padding: '120px 0', position: 'relative'
      }}>
        {/* Topology Faded Background */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.03 }}>
            <circle cx="50%" cy="50%" r="200" fill="none" stroke="var(--border-bright)" strokeWidth="1.5" />
            <circle cx="50%" cy="50%" r="100" fill="none" stroke="var(--border-bright)" strokeWidth="1.5" />
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="var(--border-bright)" strokeWidth="1.5" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="var(--border-bright)" strokeWidth="1.5" />
          </svg>
        </div>

        <div className="section-container animate-on-scroll" style={{ maxWidth: '600px', textAlign: 'center' }}>
          <span className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-amber)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            READY TO START
          </span>
          <h2 className="bricolage md:text-4xl" style={{
            fontSize: 'var(--text-3xl)', color: 'var(--text-primary)',
            marginTop: '12px', marginBottom: '24px', lineHeight: 1.15
          }}>
            Your next system design<br />
            interview is in 6 weeks.
          </h2>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '40px' }}>
            Most engineers spend that time re-reading the same articles. Start building and scoring your designs today.
          </p>

          <Link href="/signup" className="focus-outline" style={{
            display: 'inline-block', background: 'var(--accent-amber)', color: 'var(--text-inverse)',
            padding: '15px 36px', borderRadius: '8px', fontSize: '16px', fontWeight: 600,
            transition: 'background 200ms ease', textDecoration: 'none'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'var(--accent-amber-dim)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'var(--accent-amber)'}>
            Start learning free →
          </Link>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '16px' }}>
            No credit card required. Pro trial included.
          </p>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-base)', padding: '60px 0 40px 0' }}>
        <div className="section-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px', marginBottom: '40px' }} className="md:grid-cols-12">
            {/* Logo/Copyright */}
            <div className="md:col-span-5" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <LogoIcon />
                <span className="bricolage" style={{ fontWeight: 800, fontSize: '18px' }}>SD-OS</span>
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '280px' }}>
                The system design platform for engineers who take interviews seriously.
              </p>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                © 2026 SD-OS. All rights reserved.
              </span>
            </div>

            {/* Product links */}
            <div className="md:col-span-3" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>PRODUCT</span>
              <a href="#learn" className="nav-link">Learn</a>
              <a href="#build" className="nav-link">Build</a>
              <a href="#evaluate" className="nav-link">Evaluate</a>
              <a href="#pricing" className="nav-link">Pricing</a>
            </div>

            {/* Company links */}
            <div className="md:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>COMPANY</span>
              <Link href="/about" className="nav-link">About</Link>
              <Link href="/blog" className="nav-link">Blog</Link>
              <a href="https://twitter.com" className="nav-link" target="_blank" rel="noopener noreferrer">Twitter/X</a>
              <a href="https://github.com" className="nav-link" target="_blank" rel="noopener noreferrer">GitHub</a>
            </div>
          </div>

          {/* Bottom Bar */}
          <div style={{
            borderTop: '1px solid var(--border)', paddingTop: '24px',
            display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '16px'
          }}>
            <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Privacy Policy · Terms of Service
            </span>
            <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Built for engineers. Not for everyone.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
