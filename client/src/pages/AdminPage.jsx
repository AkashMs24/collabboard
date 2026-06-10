import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const ADMIN_EMAIL = 'manigarakash@gmail.com'; // your email

export default function AdminPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('users');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, statsRes] = await Promise.all([
          api.get('/api/admin/users'),
          api.get('/api/admin/stats'),
        ]);
        setUsers(usersRes.data.users);
        setStats(statsRes.data);
      } catch {
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const ago = (d) => {
    if (!d) return '—';
    const diff = Date.now() - new Date(d);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const S = {
    page: { minHeight: '100vh', background: '#0F172A', fontFamily: "'DM Sans', sans-serif", color: '#F1F5F9', padding: '24px 16px' },
    header: { maxWidth: 1100, margin: '0 auto 32px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
    badge: { background: '#EF444420', color: '#EF4444', border: '1px solid #EF444440', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 600, fontFamily: 'monospace' },
    statCard: { background: '#1E293B', border: '1px solid #334155', borderRadius: 14, padding: '20px 24px', flex: 1, minWidth: 140 },
    statNum: { fontSize: 32, fontWeight: 700, color: '#F1F5F9', margin: 0 },
    statLabel: { fontSize: 13, color: '#64748B', marginTop: 4 },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', fontSize: 11, color: '#475569', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', padding: '10px 16px', borderBottom: '1px solid #1E293B', background: '#0F172A' },
    td: { padding: '14px 16px', borderBottom: '1px solid #1E293B', fontSize: 14, color: '#CBD5E1', verticalAlign: 'middle' },
    input: { background: '#1E293B', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', color: '#F1F5F9', fontSize: 14, outline: 'none', width: '100%', maxWidth: 320, boxSizing: 'border-box' },
    tab: (active) => ({ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: active ? 600 : 400, background: active ? '#0D9488' : 'transparent', color: active ? '#fff' : '#64748B', fontFamily: "'DM Sans', sans-serif" }),
  };

  if (loading) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#64748B' }}>Loading admin panel...</div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={S.header}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 20, padding: 0 }}>←</button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Admin Panel</h1>
              <span style={S.badge}>ADMIN ONLY</span>
            </div>
            <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>CollabBoard user management & analytics</p>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Users', value: stats.total_users || 0, color: '#0D9488' },
            { label: 'Total Workspaces', value: stats.total_workspaces || 0, color: '#3B82F6' },
            { label: 'Total Boards', value: stats.total_boards || 0, color: '#8B5CF6' },
            { label: 'Total Tasks', value: stats.total_tasks || 0, color: '#F59E0B' },
            { label: 'New Today', value: stats.new_today || 0, color: '#22C97E' },
          ].map(s => (
            <div key={s.label} style={S.statCard}>
              <div style={{ ...S.statNum, color: s.color }}>{s.value}</div>
              <div style={S.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          <button style={S.tab(tab === 'users')} onClick={() => setTab('users')}>Users</button>
          <button style={S.tab(tab === 'activity')} onClick={() => setTab('activity')}>Recent Signups</button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            style={S.input}
            onFocus={e => e.target.style.borderColor = '#0D9488'}
            onBlur={e => e.target.style.borderColor = '#334155'}
          />
        </div>

        {/* Table */}
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 14, overflow: 'hidden', overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>User</th>
                <th style={S.th}>Email</th>
                <th style={S.th}>Joined</th>
                <th style={S.th}>Last Login</th>
                <th style={S.th}>Workspaces</th>
                <th style={S.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const isOnline = u.last_login && (Date.now() - new Date(u.last_login)) < 30 * 60 * 1000;
                return (
                  <tr key={u.id} style={{ transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#0F172A'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={S.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: u.avatar_color || '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {u.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#F1F5F9', fontSize: 14 }}>{u.name}</div>
                          {u.email === ADMIN_EMAIL && <div style={{ fontSize: 10, color: '#0D9488', fontFamily: 'monospace' }}>ADMIN</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ ...S.td, color: '#94A3B8', fontFamily: 'monospace', fontSize: 13 }}>{u.email}</td>
                    <td style={{ ...S.td, fontSize: 13 }}>{fmt(u.created_at)}</td>
                    <td style={{ ...S.td, fontSize: 13 }}>
                      <div>{fmt(u.last_login)}</div>
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{ago(u.last_login)}</div>
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <span style={{ background: '#334155', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontFamily: 'monospace' }}>{u.workspace_count}</span>
                    </td>
                    <td style={S.td}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: isOnline ? '#22C97E' : '#475569', background: isOnline ? '#22C97E15' : '#33415520', padding: '3px 10px', borderRadius: 20 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: isOnline ? '#22C97E' : '#475569', display: 'inline-block' }} />
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#475569', padding: '40px' }}>No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: '#334155', fontFamily: 'monospace' }}>
          Showing {filtered.length} of {users.length} users
        </div>
      </div>
    </div>
  );
}
