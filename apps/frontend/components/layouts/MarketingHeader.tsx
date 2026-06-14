'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function MarketingHeader() {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  if (isLanding) return null;

  return (
    <header className="w-full border-b border-yc-border bg-yc-bg/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-yc-text" style={{ fontFamily: 'var(--font-display)' }}>
          SD-OS
        </Link>
        <nav className="flex items-center space-x-6">
          <Link href="/about" className="text-sm text-yc-text-muted hover:text-yc-text transition">About</Link>
          <Link href="/pricing" className="text-sm text-yc-text-muted hover:text-yc-text transition">Pricing</Link>
          <Link href="/login" className="text-sm text-yc-text-muted hover:text-yc-text transition">Login</Link>
          <Link
            href="/signup"
            className="text-sm font-medium px-5 py-2.5 bg-yc-accent text-white rounded-lg hover:bg-yc-accent-hover transition"
          >
            Apply
          </Link>
        </nav>
      </div>
    </header>
  );
}
