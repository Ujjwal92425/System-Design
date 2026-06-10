import { ReactNode } from 'react';
import { redirect } from 'next/navigation';

// Note: swap this for your real session/auth check
// e.g. getServerSession(authOptions) from next-auth
async function getRole(): Promise<string> {
  // Placeholder — replace with real JWT/session role check
  return 'ADMIN';
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const role = await getRole();
  if (role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px',
        flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        background: 'var(--bg-surface)',
      }}>
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--border)' }}>
          <span className="mono" style={{ fontSize: '10px', color: 'var(--accent-amber)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            SD-OS Admin
          </span>
        </div>

        <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            { href: '/admin', label: 'Overview' },
            { href: '/admin/content/tracks', label: 'Tracks' },
            { href: '/admin/content/lessons', label: 'Lessons' },
            { href: '/admin/users', label: 'Users' },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              style={{
                display: 'block',
                padding: '9px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                transition: 'background 150ms ease, color 150ms ease',
              }}
              onMouseOver={(e: any) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseOut={(e: any) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Content area */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
