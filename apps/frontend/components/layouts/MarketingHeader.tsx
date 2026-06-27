'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/features/auth/useAuth';
import { useState, useEffect } from 'react';

export function MarketingHeader() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (drawerOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [drawerOpen]);

  const isLanding = pathname === '/';

  if (isLanding) return null;

  return (
    <>
      <header className="w-full border-b border-yc-border bg-yc-bg/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-yc-text" style={{ fontFamily: 'var(--font-display)' }}>
            SD-OS
          </Link>
          
          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center space-x-6">
            <Link href="/learn" className="text-sm text-yc-text-muted hover:text-yc-text transition">Learn</Link>
            <Link href="/build" className="text-sm text-yc-text-muted hover:text-yc-text transition">Build</Link>
            <Link href="/community" className="text-sm text-yc-text-muted hover:text-yc-text transition">Community</Link>
            <Link href="/interview" className="text-sm text-yc-text-muted hover:text-yc-text transition">Evaluate</Link>
            <Link href="/pricing" className="text-sm text-yc-text-muted hover:text-yc-text transition">Pricing</Link>
            {mounted && user ? (
              <Link
                href="/dashboard"
                className="text-sm font-medium px-5 py-2.5 bg-yc-accent text-white rounded-lg hover:bg-yc-accent-hover transition"
              >
                Profile
              </Link>
            ) : (
              <Link href="/login" className="text-sm text-yc-text-muted hover:text-yc-text transition">Login</Link>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 -mr-2"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1C1C1C" strokeWidth="1.5" strokeLinecap="round">
              <line x1="3" y1="5" x2="17" y2="5" />
              <line x1="3" y1="10" x2="17" y2="10" />
              <line x1="3" y1="14" x2="17" y2="14" />
            </svg>
          </button>
        </div>
      </header>

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
            <Link href="/learn" onClick={() => setDrawerOpen(false)} className="text-base text-yc-text-muted hover:text-yc-text transition">Learn</Link>
            <Link href="/build" onClick={() => setDrawerOpen(false)} className="text-base text-yc-text-muted hover:text-yc-text transition">Build</Link>
            <Link href="/community" onClick={() => setDrawerOpen(false)} className="text-base text-yc-text-muted hover:text-yc-text transition">Community</Link>
            <Link href="/interview" onClick={() => setDrawerOpen(false)} className="text-base text-yc-text-muted hover:text-yc-text transition">Evaluate</Link>
            <Link href="/pricing" onClick={() => setDrawerOpen(false)} className="text-base text-yc-text-muted hover:text-yc-text transition">Pricing</Link>
          </nav>
          <div className="mt-auto flex flex-col space-y-4">
            {mounted && user ? (
              <Link
                href="/dashboard"
                onClick={() => setDrawerOpen(false)}
                className="text-center text-sm font-medium px-5 py-3 bg-yc-accent text-white rounded-lg"
              >
                Profile
              </Link>
            ) : (
              <Link href="/login" onClick={() => setDrawerOpen(false)} className="text-center text-sm text-yc-text-muted">Login</Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
