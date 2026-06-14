'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '../../features/auth/useAuth';
import { Sparkles, ChevronRight, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export function AppHeader() {
  const pathname = usePathname();
  const { user } = useAuth();

  const pathSegments = pathname ? pathname.split('/').filter(Boolean) : [];
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = segment
      .replace(/-/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase());
    return { label, href, isLast: index === pathSegments.length - 1 };
  });

  return (
    <header className="border-b border-yc-border bg-yc-bg/95 backdrop-blur-sm px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-30 min-h-[56px]">
      <div className="flex items-center space-x-1.5 text-sm text-yc-text-muted font-medium min-w-0 overflow-x-auto no-scrollbar">
        <Link href="/dashboard" className="hover:text-yc-text transition whitespace-nowrap flex-shrink-0">
          Console
        </Link>
        {breadcrumbs.length > 0 && <ChevronRight className="w-3.5 h-3.5 text-yc-border flex-shrink-0" />}
        {breadcrumbs.map((crumb, idx) => (
          <div key={crumb.href} className="flex items-center space-x-1.5 min-w-0">
            {crumb.isLast ? (
              <span className="text-yc-text font-semibold truncate">{crumb.label}</span>
            ) : (
              <>
                <Link href={crumb.href} className="hover:text-yc-text transition whitespace-nowrap">
                  {crumb.label}
                </Link>
                <ChevronRight className="w-3.5 h-3.5 text-yc-border flex-shrink-0" />
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center space-x-4 sm:space-x-6 flex-shrink-0">
        <Link
          href="/docs"
          className="text-xs font-medium text-yc-text-muted hover:text-yc-text transition flex items-center space-x-1 whitespace-nowrap"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Documentation</span>
        </Link>

        {user && (
          <div className="flex items-center space-x-3 border-l border-yc-border pl-4 sm:pl-6">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase whitespace-nowrap border ${
              user.role === 'ADMIN'
                ? 'bg-red-50 text-red-700 border-red-200'
                : user.role === 'PRO' || user.role === 'INSTRUCTOR'
                ? 'bg-yc-accent/10 text-yc-accent border-yc-accent/20'
                : 'bg-yc-bg-card text-yc-text-muted border-yc-border'
            }`}>
              <Sparkles className="w-2.5 h-2.5 mr-1" />
              <span className="hidden sm:inline">{user.role} </span>Member
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
