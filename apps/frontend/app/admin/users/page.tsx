'use client';

import { useEffect, useState, useCallback } from 'react';

interface User {
  id: string; email: string; name: string | null; role: string;
  avatarUrl: string | null; emailVerified: boolean;
  createdAt: string; lastLoginAt: string | null;
  lockedUntil: string | null; deletedAt: string | null;
  _count: { designs: number; interviews: number };
}

interface Pagination {
  page: number; limit: number; total: number; pages: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createName, setCreateName] = useState('');
  const [createRole, setCreateRole] = useState('USER');
  const [creating, setCreating] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/users?${params}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch users');
      const d = await res.json();
      setUsers(d.data.users || []);
      setPagination(d.data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSuspend = async (userId: string) => {
    const token = localStorage.getItem('accessToken');
    await fetch(`/api/admin/users/${userId}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ durationMin: 1440 }),
    });
    fetchUsers();
  };

  const handleUnsuspend = async (userId: string) => {
    const token = localStorage.getItem('accessToken');
    await fetch(`/api/admin/users/${userId}/unsuspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    fetchUsers();
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Permanently delete this user? This action cannot be undone.')) return;
    const token = localStorage.getItem('accessToken');
    await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: createEmail, name: createName || undefined, role: createRole }),
      });
      if (!res.ok) throw new Error('Failed to create user');
      setShowCreateModal(false);
      setCreateEmail('');
      setCreateName('');
      setCreateRole('USER');
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
    setCreating(false);
  };

  const handleExportCSV = async () => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch('/api/admin/users/export', { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter((l) => l.trim());
    const users = lines.slice(1).map((line) => {
      const parts = line.split(',').map((p) => p.replace(/^"|"$/g, '').trim());
      return { email: parts[1] || parts[0], name: parts[2] || undefined };
    }).filter((u) => u.email);

    const token = localStorage.getItem('accessToken');
    const res = await fetch('/api/admin/users/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ users }),
    });
    const d = await res.json();
    setImportResult(d.data);
    fetchUsers();
    e.target.value = '';
  };

  const statusBadge = (user: User) => {
    if (user.deletedAt) return <span style={{ color: 'var(--color-error)' }}>Deleted</span>;
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) return <span style={{ color: 'var(--color-warning)' }}>Suspended</span>;
    return <span style={{ color: 'var(--color-success)' }}>Active</span>;
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Users</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0' }}>
            {pagination.total} total users
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowCreateModal(true)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            + Add User
          </button>
          <button onClick={handleExportCSV}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            Export CSV
          </button>
          <label style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            Import CSV
            <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {importResult && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: '13px' }}>
          Imported <strong>{importResult.created}</strong> users ({importResult.skipped} skipped
          {importResult.errors.length > 0 && `, ${importResult.errors.length} errors`})
          <button onClick={() => setImportResult(null)} style={{ marginLeft: '12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>Dismiss</button>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--color-error)', fontSize: '13px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <input
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', fontSize: '13px', outline: 'none' }}
        />
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', fontSize: '13px' }}>
          <option value="">All Roles</option>
          <option value="USER">USER</option>
          <option value="PRO">PRO</option>
          <option value="INSTRUCTOR">INSTRUCTOR</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', fontSize: '13px' }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deleted">Deleted</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>Loading...</div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>No users found.</div>
      ) : (
        <>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>User</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Role</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Designs</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Joined</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <a href={`/admin/users/${user.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500 }}>
                        {user.name || 'Unnamed'}
                      </a>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user.email}</div>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: user.role === 'ADMIN' ? 'rgba(99,102,241,0.1)' : 'var(--bg-elevated)', color: user.role === 'ADMIN' ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: '12px' }}>{statusBadge(user)}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>{user._count.designs}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <a href={`/admin/users/${user.id}`}
                          style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px', textDecoration: 'none', color: 'var(--text-primary)' }}>
                          Edit
                        </a>
                        {!user.deletedAt && (
                          user.lockedUntil && new Date(user.lockedUntil) > new Date() ? (
                            <button onClick={() => handleUnsuspend(user.id)}
                              style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px', cursor: 'pointer', background: 'var(--bg-surface)' }}>
                              Unsuspend
                            </button>
                          ) : (
                            <button onClick={() => handleSuspend(user.id)}
                              style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px', cursor: 'pointer', background: 'var(--bg-surface)' }}>
                              Suspend
                            </button>
                          )
                        )}
                        {!user.deletedAt && (
                          <button onClick={() => handleDelete(user.id)}
                            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', fontSize: '12px', cursor: 'pointer', color: 'var(--color-error)', background: 'var(--bg-surface)' }}>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px', alignItems: 'center' }}>
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface)', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.5 : 1, fontSize: '13px' }}>
                Prev
              </button>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Page {pagination.page} of {pagination.pages}
              </span>
              <button disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}
                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface)', cursor: page >= pagination.pages ? 'default' : 'pointer', opacity: page >= pagination.pages ? 0.5 : 1, fontSize: '13px' }}>
                Next
              </button>
            </div>
          )}
        </>
      )}

      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowCreateModal(false)}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', padding: '24px', width: '400px', maxWidth: '90vw' }}
            onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 16px' }}>Add User</h2>
            <form onSubmit={handleCreateUser}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px', color: 'var(--text-secondary)' }}>Email *</label>
                <input required type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px', color: 'var(--text-secondary)' }}>Name</label>
                <input value={createName} onChange={(e) => setCreateName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px', color: 'var(--text-secondary)' }}>Role</label>
                <select value={createRole} onChange={(e) => setCreateRole(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', fontSize: '13px' }}>
                  <option value="USER">USER</option>
                  <option value="PRO">PRO</option>
                  <option value="INSTRUCTOR">INSTRUCTOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreateModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', cursor: 'pointer', fontSize: '13px' }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--accent-blue)', color: '#fff', cursor: 'pointer', fontSize: '13px', opacity: creating ? 0.6 : 1 }}>
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
