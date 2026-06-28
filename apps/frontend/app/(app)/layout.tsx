'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../features/auth/useAuth';
import { MarketingHeader } from '../../components/layouts/MarketingHeader';
import { analytics } from '../../lib/analytics';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, fetchMe } = useAuth();
  const router = useRouter();

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
    <div className="flex flex-col min-h-screen bg-yc-bg">
      <MarketingHeader />
      <main className="flex-1 flex flex-col min-w-0">{children}</main>
    </div>
  );
}
