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

      <div className="flex-shrink-0" />
    </header>
  );
}
