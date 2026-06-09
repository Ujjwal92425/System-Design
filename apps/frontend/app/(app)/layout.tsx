'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../features/auth/useAuth';
import { AppSidebar } from '../../components/layouts/AppSidebar';
import { AppHeader } from '../../components/layouts/AppHeader';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, fetchMe } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Verify session integrity on mount
    fetchMe().catch(() => {
      router.push('/login');
    });
  }, []);

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !loading) {
    return null; // Will redirect
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <AppSidebar />

      {/* Main viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
