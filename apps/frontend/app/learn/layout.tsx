import type { Metadata } from 'next';
import Link from 'next/link';
import { generatePageMetadata, SITE_NAME } from '../../lib/seo';

// ── Public learn layout: no auth guard, simple header for SEO + UX ──────────
// This lets anyone browse the full curriculum without logging in.
// Auth is only required for saving progress (Mark Complete).
export const metadata: Metadata = generatePageMetadata({
  title: 'System Design Curriculum',
  description: 'Master system design with 18 comprehensive tracks covering networking, databases, caching, distributed systems, architecture patterns, and more. Interactive lessons with quizzes and simulations.',
  path: '/learn',
  keywords: ['system design curriculum', 'system design lessons', 'distributed systems course', 'architecture tutorial'],
});

export default function PublicLearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Simple public header — no sidebar, no auth check */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-bold tracking-tight text-gray-900">
            {SITE_NAME}
          </Link>
          <nav className="flex items-center space-x-6 text-sm">
            <Link href="/learn" className="text-indigo-600 font-semibold">Curriculum</Link>
            <Link href="/about" className="text-gray-600 hover:text-gray-900 transition">About</Link>
            <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition">Pricing</Link>
            <Link
              href="/login"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 bg-gray-50">
        {children}
      </main>
    </>
  );
}
