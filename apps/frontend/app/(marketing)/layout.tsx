import React from 'react';
import type { Metadata } from 'next';
import { MarketingHeader } from '../../components/layouts/MarketingHeader';
import { generatePageMetadata } from '../../lib/seo';

export const metadata: Metadata = generatePageMetadata({
  title: 'System Design OS',
  description: 'Master system design through interactive learning, architecture simulation, and AI-powered interview practice.',
  path: '/',
});

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <MarketingHeader />
      <main className="flex-1 flex flex-col">{children}</main>
      <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-400 bg-white">
        &copy; {new Date().getFullYear()} System Design OS. All rights reserved.
      </footer>
    </div>
  );
}
