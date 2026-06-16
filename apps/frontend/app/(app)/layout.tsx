'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../features/auth/useAuth';
import { AppSidebar } from '../../components/layouts/AppSidebar';
import { AppHeader } from '../../components/layouts/AppHeader';
import { analytics } from '../../lib/analytics';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, fetchMe } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    <div className="flex min-h-screen bg-yc-bg">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <AppHeader />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
