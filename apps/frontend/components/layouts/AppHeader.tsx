'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '../../features/auth/useAuth';
import { Sparkles, ChevronRight, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export function AppHeader() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Create breadcrumbs from pathname
  const pathSegments = pathname ? pathname.split('/').filter(Boolean) : [];
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = segment
      .replace(/-/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase());
    return { label, href, isLast: index === pathSegments.length - 1 };
  });

  return (
    <header className="border-b border-zinc-900 bg-zinc-950/40 backdrop-blur-md px-8 py-4 flex items-center justify-between sticky top-0 z-40">
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-1.5 text-sm text-zinc-400 font-medium">
        <Link href="/dashboard" className="hover:text-zinc-200 transition">
          Console
        </Link>
        {breadcrumbs.length > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />}
        {breadcrumbs.map((crumb, idx) => (
          <div key={crumb.href} className="flex items-center space-x-1.5">
            {crumb.isLast ? (
              <span className="text-zinc-100 font-semibold">{crumb.label}</span>
            ) : (
              <>
                <Link href={crumb.href} className="hover:text-zinc-200 transition">
                  {crumb.label}
                </Link>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              </>
            )}
          </div>
        ))}
      </div>

      {/* Actions & Status */}
      <div className="flex items-center space-x-6">
        <Link
          href="/docs"
          className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition flex items-center space-x-1"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Documentation</span>
        </Link>

        {user && (
          <div className="flex items-center space-x-3 border-l border-zinc-800 pl-6">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
              user.role === 'ADMIN'
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : user.role === 'PRO' || user.role === 'INSTRUCTOR'
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
            }`}>
              <Sparkles className="w-2.5 h-2.5 mr-1" />
              {user.role} Member
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
