import React from 'react';
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="p-6 bg-zinc-950 min-h-screen text-white">{children}</div>;
}
