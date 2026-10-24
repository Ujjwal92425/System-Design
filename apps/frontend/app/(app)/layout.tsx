'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation'; // CHANGE: usePathname to detect the /learn workspace route
import { useAuth } from '../../features/auth/useAuth';
import { MarketingHeader } from '../../components/layouts/MarketingHeader';
import { analytics } from '../../lib/analytics';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, fetchMe } = useAuth();
  const router = useRouter();
  // CHANGE: /learn is a full-screen workspace with its own scroll panes, so it needs a viewport-locked shell
  const isWorkspace = usePathname() === '/learn';

  useEffect(() => {
    fetchMe().catch(() => {
      router.push('/login');
    });
  }, []);

  useEffect(() => {
    if (user) {
      analytics.identify(user.id, {
        email: user.email,
        name: user.name,
        role: user.role,
      });
    }
  }, [user?.id]);

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-yc-bg flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-yc-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !loading) {
    return null;
  }

  return (
    // CHANGE: on /learn, lock to viewport height (h-dvh + overflow-hidden) so inner panes scroll instead of being cut off
    <div className={isWorkspace ? 'flex flex-col h-dvh overflow-hidden bg-yc-bg' : 'flex flex-col min-h-screen bg-yc-bg'}>
      <MarketingHeader />
      <main className={isWorkspace ? 'flex-1 flex flex-col min-w-0 min-h-0' : 'flex-1 flex flex-col min-w-0'}>{children}</main>
    </div>
  );
}
