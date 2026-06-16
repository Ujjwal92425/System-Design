'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface UserDetail {
  id: string; email: string; name: string | null; role: string;
  bio: string | null; avatarUrl: string | null; emailVerified: boolean;
  createdAt: string; lastLoginAt: string | null;
  lockedUntil: string | null; deletedAt: string | null;
  loginAttempts: number;
  subscription: { plan: string; status: string; aiCredits: number } | null;
  _count: { designs: number; interviews: number; sessions: number };
}

export default function AdminUserDetail() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editEmailVerified, setEditEmailVerified] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`/api/admin/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('User not found');
        const d = await res.json();
        const u = d.data;
        setUser(u);
        setEditName(u.name || '');
        setEditRole(u.role);
        setEditEmailVerified(u.emailVerified);
      } catch (err: any) {
        setError(err.message);
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editName || undefined,
          role: editRole,
          emailVerified: editEmailVerified,
        }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setSaveMsg('Saved successfully');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err: any) {
      setSaveMsg(`Error: ${err.message}`);
    }
    setSaving(false);
  };

  const handleSuspend = async () => {
    const token = localStorage.getItem('accessToken');
    await fetch(`/api/admin/users/${userId}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ durationMin: 1440 }),
    });
    window.location.reload();
  };

  const handleUnsuspend = async () => {
    const token = localStorage.getItem('accessToken');
    await fetch(`/api/admin/users/${userId}/unsuspend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    window.location.reload();
  };

  const handleDelete = async () => {
    if (!confirm('Permanently delete this user? This cannot be undone.')) return;
    const token = localStorage.getItem('accessToken');
    await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    router.push('/admin/users');
  };

  if (loading) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading user...</div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{ color: 'var(--color-error)' }}>{error || 'User not found'}</div>
        <a href="/admin/users" style={{ color: 'var(--accent-blue)', fontSize: '14px' }}>Back to users</a>
      </div>
    );
  }

  const isSuspended = user.lockedUntil && new Date(user.lockedUntil) > new Date();
  const isDeleted = !!user.deletedAt;

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px' }}>
        <a href="/admin/users" style={{ color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' }}>&larr; Back to users</a>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 4px' }}>{user.name || 'Unnamed User'}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>{user.email}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {!isDeleted && (
            isSuspended ? (
              <button onClick={handleUnsuspend}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', cursor: 'pointer', fontSize: '13px' }}>
                Unsuspend
              </button>
            ) : (
              <button onClick={handleSuspend}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', cursor: 'pointer', fontSize: '13px' }}>
                Suspend
              </button>
            )
          )}
          {!isDeleted && (
            <button onClick={handleDelete}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--color-error)', background: 'var(--bg-surface)', cursor: 'pointer', fontSize: '13px' }}>
              Delete User
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Status</div>
          <div style={{ fontSize: '14px', fontWeight: 500 }}>
            {isDeleted ? <span style={{ color: 'var(--color-error)' }}>Deleted</span> :
             isSuspended ? <span style={{ color: 'var(--color-warning)' }}>Suspended until {new Date(user.lockedUntil!).toLocaleDateString()}</span> :
             <span style={{ color: 'var(--color-success)' }}>Active</span>}
          </div>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Subscription</div>
          <div style={{ fontSize: '14px', fontWeight: 500 }}>
            {user.subscription ? `${user.subscription.plan} (${user.subscription.status})` : 'No subscription'}
          </div>
          {user.subscription && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user.subscription.aiCredits} AI credits</div>
          )}
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Designs</div>
          <div style={{ fontSize: '20px', fontWeight: 700 }}>{user._count.designs}</div>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Interviews</div>
          <div style={{ fontSize: '20px', fontWeight: 700 }}>{user._count.interviews}</div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px' }}>Edit User</h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px', color: 'var(--text-secondary)' }}>Name</label>
          <input value={editName} onChange={(e) => setEditName(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', fontSize: '13px', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px', color: 'var(--text-secondary)' }}>Role</label>
          <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', fontSize: '13px' }}>
            <option value="USER">USER</option>
            <option value="PRO">PRO</option>
            <option value="INSTRUCTOR">INSTRUCTOR</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" checked={editEmailVerified} onChange={(e) => setEditEmailVerified(e.target.checked)}
            style={{ width: '16px', height: '16px' }} />
          <label style={{ fontSize: '13px' }}>Email verified</label>
        </div>

        {saveMsg && (
          <div style={{ padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px', background: saveMsg.includes('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: saveMsg.includes('Error') ? 'var(--color-error)' : 'var(--color-success)' }}>
            {saveMsg}
          </div>
        )}

        <button onClick={handleSave} disabled={saving}
          style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', background: 'var(--accent-blue)', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px' }}>Account Info</h2>
        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['User ID', user.id],
              ['Email', user.email],
              ['Joined', new Date(user.createdAt).toLocaleString()],
              ['Last Login', user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'],
              ['Login Attempts', user.loginAttempts.toString()],
              ['Deleted', user.deletedAt ? new Date(user.deletedAt).toLocaleString() : 'No'],
            ].map(([label, value]) => (
              <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 500, width: '140px' }}>{label}</td>
                <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
