import React from 'react';
import Link from 'next/link';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-zinc-800 backdrop-blur-md sticky top-0 z-50 bg-black/60 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          System Design OS
        </Link>
        <nav className="flex items-center space-x-6">
          <Link href="/about" className="text-sm text-zinc-400 hover:text-white transition">About</Link>
          <Link href="/pricing" className="text-sm text-zinc-400 hover:text-white transition">Pricing</Link>
          <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition">Login</Link>
          <Link href="/signup" className="text-sm px-4 py-2 bg-indigo-600 rounded-lg text-white font-medium hover:bg-indigo-700 transition">
            Start Free
          </Link>
        </nav>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
      <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-500 bg-zinc-950">
        &copy; {new Date().getFullYear()} System Design OS. All rights reserved.
      </footer>
    </div>
  );
}
