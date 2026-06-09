/**
 * Shared layout for all (auth) route group pages.
 * Renders a centered card on a dark gradient background.
 * The auth CSS design system is injected via globals.css.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SD-OS — Sign In',
  description: 'Access your System Design Learning OS workspace.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      {/* Subtle animated grid background */}
      <div className="auth-bg-grid" aria-hidden="true" />
      {/* Gradient orbs for depth */}
      <div className="auth-orb auth-orb--1" aria-hidden="true" />
      <div className="auth-orb auth-orb--2" aria-hidden="true" />
      {children}
    </main>
  );
}
