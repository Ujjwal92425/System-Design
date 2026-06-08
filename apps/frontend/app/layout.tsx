import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'System Design Learning OS',
  description: 'Learn, build, simulate, and ace your system design interviews.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
