'use client';

import { useEffect, useState } from 'react';
import { adminService } from '@/api-clients/admin';

interface PlatformStats {
  users: number; proUsers: number; tracks: number; lessons: number;
  publishedLessons: number; designs: number; interviews: number;
  registrationsLast7d: number; loginsLast7d: number;
  designsCreatedLast7d: number; interviewsCompletedLast7d: number;
}

interface RecentEvent {
  id: string; event: string; timestamp: string;
  userEmail: string; metadata: string;
}

const defaultStats: PlatformStats = {
  users: 0, proUsers: 0, tracks: 0, lessons: 0,
  publishedLessons: 0, designs: 0, interviews: 0,
  registrationsLast7d: 0, loginsLast7d: 0,
  designsCreatedLast7d: 0, interviewsCompletedLast7d: 0,
};

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}>
      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      {sub && <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{sub}</span>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats>(defaultStats);
  const [events, setEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, eventsData] = await Promise.all([
          adminService.getOverview(),
          adminService.getRecentEvents(10),
        ]);
        setStats(statsData || defaultStats);
        setEvents(eventsData || []);
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Dashboard</div>
        <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0' }}>
          Platform overview and key metrics
        </p>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Lifetime Totals
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
          <StatCard label="Total Users" value={stats.users} />
          <StatCard label="Pro Users" value={stats.proUsers} />
          <StatCard label="Tracks" value={stats.tracks} />
          <StatCard label="Lessons" value={stats.lessons} sub={`${stats.publishedLessons} published`} />
          <StatCard label="Designs" value={stats.designs} />
          <StatCard label="Interviews" value={stats.interviews} />
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Last 7 Days
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
          <StatCard label="New Registrations" value={stats.registrationsLast7d} />
          <StatCard label="Active Logins" value={stats.loginsLast7d} />
          <StatCard label="Designs Created" value={stats.designsCreatedLast7d} />
          <StatCard label="Interviews Done" value={stats.interviewsCompletedLast7d} />
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Recent Activity
        </h2>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Event</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>User</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Details</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evt) => (
                <tr key={evt.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
                      background: evt.event.includes('error') ? 'rgba(239,68,68,0.1)' : 'rgba(255,102,0,0.1)',
                      color: evt.event.includes('error') ? 'var(--color-error)' : 'var(--accent-amber)',
                    }}>
                      {evt.event}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-primary)' }}>{evt.userEmail}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{evt.metadata}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                    {new Date(evt.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No recent activity
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
