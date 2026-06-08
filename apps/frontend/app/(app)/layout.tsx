import React from 'react';
import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-900 bg-zinc-950/40 p-6 flex flex-col justify-between">
        <div className="space-y-8">
          <Link href="/dashboard" className="text-lg font-black tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            System Design OS
          </Link>
          <nav className="flex flex-col space-y-2">
            <Link href="/dashboard" className="px-4 py-2 hover:bg-zinc-900 rounded-lg text-sm transition">Dashboard</Link>
            <Link href="/learn" className="px-4 py-2 hover:bg-zinc-900 rounded-lg text-sm transition">Learn Curriculum</Link>
            <Link href="/build" className="px-4 py-2 hover:bg-zinc-900 rounded-lg text-sm transition">Build Canvas</Link>
            <Link href="/interview" className="px-4 py-2 hover:bg-zinc-900 rounded-lg text-sm transition">Practice Interviews</Link>
            <Link href="/community" className="px-4 py-2 hover:bg-zinc-900 rounded-lg text-sm transition">Community</Link>
            <Link href="/settings" className="px-4 py-2 hover:bg-zinc-900 rounded-lg text-sm transition">Settings</Link>
          </nav>
        </div>
        <div className="border-t border-zinc-900 pt-4 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">OS</div>
          <div>
            <p className="text-xs font-semibold text-white">OS Architect</p>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">PRO Member</span>
          </div>
        </div>
      </aside>

      {/* Main viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-zinc-900 px-8 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-400">Gateway Dashboard</h2>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
