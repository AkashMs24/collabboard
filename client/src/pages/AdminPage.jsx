import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const ADMIN_EMAIL = 'manigarakash@gmail.com';

export default function AdminPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('users');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.get('/api/admin/users'),
        api.get('/api/admin/stats'),
      ]);
      setUsers(usersRes.data.users);
      setStats(statsRes.data);
      setLastRefreshed(new Date());
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const exportCSV = () => {
    const header = ['Name', 'Email', 'Joined', 'Last Login', 'Workspaces'];
    const rows = users.map(u => [
      u.name, u.email,
      u.created_at ? new Date(u.created_at).toLocaleString('en-IN') : '',
      u.last_login ? new Date(u.last_login).toLocaleString('en-IN') : '',
      u.workspace_count,
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `collabboard_users_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = users
    .filter(u =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (!va) return 1; if (!vb) return -1;
      if (sortBy === 'workspace_count') { va = parseInt(va); vb = parseInt(vb); }
      else { va = new Date(va); vb = new Date(vb); }
      return sortDir === 'asc' ? va - vb : vb - va;
    });

  const recentSignups = [...users]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);

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

  // Compute signups per day for last 7 days
  const signupChart = (() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { label: d.toLocaleDateString('en-IN', { weekday: 'short' }), date: d.toDateString(), count: 0 };
    });
    users.forEach(u => {
      const ds = new Date(u.created_at).toDateString();
      const day = days.find(d => d.date === ds);
      if (day) day.count++;
    });
    return days;
  })();
  const maxCount = Math.max(...signupChart.map(d => d.count), 1);

  const S = {
    page: { minHeight: '100vh', background: '#0F172A', fontFamily: "'DM Sans', sans-serif", color: '#F1F5F9', padding: '24px 16px' },
    header: { maxWidth: 1100, margin: '0 auto 28px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
    badge: { background: '#EF444420', color: '#EF4444', border: '1px solid #EF444440', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 600, fontFamily: 'monospace' },
    statCard: { background: '#1E293B', border: '1px solid #334155', borderRadius: 14, padding: '20px 24px', flex: 1, minWidth: 130 },
    statNum: { fontSize: 30, fontWeight: 700, color: '#F1F5F9', margin: 0 },
    statLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', fontSize: 11, color: '#475569', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', padding: '10px 16px', borderBottom: '1px solid #1E293B', background: '#0F172A', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' },
    td: { padding: '12px 16px', borderBottom: '1px solid #1E293B', fontSize: 14, color: '#CBD5E1', verticalAlign: 'middle' },
    input: { background: '#1E293B', border: '1px solid #334155', borderRadius: 10, padding: '9px 14px', color: '#F1F5F9', fontSize: 14, outline: 'none', width: '100%', maxWidth: 300, boxSizing: 'border-box' },
    btn: (color) => ({ background: color, border: 'none', borderRadius: 9, padding: '8px 16px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }),
    tab: (active) => ({ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: active ? 600 : 400, background: active ? '#0D9488' : 'transparent', color: active ? '#fff' : '#64748B', fontFamily: "'DM Sans', sans-serif" }),
  };

  if (loading) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#64748B', fontSize: 15 }}>Loading admin panel...</div>
    </div>
  );

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4, color: '#0D9488' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={S.header}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 20, padding: 0 }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Admin Panel</h1>
              <span style={S.badge}>ADMIN ONLY</span>
              {refreshing && <span style={{ fontSize: 12, color: '#64748B' }}>refreshing...</span>}
            </div>
            {lastRefreshed && (
              <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>
                Last updated: {lastRefreshed.toLocaleTimeString('en-IN')} · Auto-refreshes every 30s
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={S.btn('#1E293B')} onClick={() => fetchData(true)}>⟳ Refresh</button>
            <button style={S.btn('#0D9488')} onClick={exportCSV}>↓ Export CSV</button>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Users', value: stats.total_users || 0, color: '#0D9488' },
            { label: 'Workspaces', value: stats.total_workspaces || 0, color: '#3B82F6' },
            { label: 'Boards', value: stats.total_boards || 0, color: '#8B5CF6' },
            { label: 'Tasks', value: stats.total_tasks || 0, color: '#F59E0B' },
            { label: 'New Today', value: stats.new_today || 0, color: '#22C97E' },
          ].map(s => (
            <div key={s.label} style={S.statCard}>
              <div style={{ ...S.statNum, color: s.color }}>{s.value}</div>
              <div style={S.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Signup chart */}
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 16, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>Signups — Last 7 Days</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 80 }}>
            {signupChart.map((day, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>{day.count || ''}</div>
                <div style={{
                  width: '100%', background: day.count > 0 ? '#0D9488' : '#1E3A3A',
                  borderRadius: 4, transition: 'height .3s',
                  height: day.count > 0 ? `${Math.max(8, (day.count / maxCount) * 50)}px` : '4px',
                  minHeight: 4,
                }} />
                <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>{day.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <button style={S.tab(tab === 'users')} onClick={() => setTab('users')}>All Users ({users.length})</button>
          <button style={S.tab(tab === 'recent')} onClick={() => setTab('recent')}>Recent Signups</button>
          <button style={S.tab(tab === 'online')} onClick={() => setTab('online')}>
            Online ({users.filter(u => u.last_login && (Date.now() - new Date(u.last_login)) < 30 * 60 * 1000).length})
          </button>
        </div>

        {/* Search (only on users tab) */}
        {tab === 'users' && (
          <div style={{ marginBottom: 14 }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              style={S.input}
              onFocus={e => e.target.style.borderColor = '#0D9488'}
              onBlur={e => e.target.style.borderColor = '#334155'}
            />
          </div>
        )}

        {/* Table */}
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 14, overflow: 'hidden', overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th} onClick={() => handleSort('name')}>User <SortIcon col="name" /></th>
                <th style={S.th}>Email</th>
                <th style={S.th} onClick={() => handleSort('created_at')}>Joined <SortIcon col="created_at" /></th>
                <th style={S.th} onClick={() => handleSort('last_login')}>Last Login <SortIcon col="last_login" /></th>
                <th style={S.th} onClick={() => handleSort('workspace_count')}>Workspaces <SortIcon col="workspace_count" /></th>
                <th style={S.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(tab === 'users' ? filtered
                : tab === 'recent' ? recentSignups
                : users.filter(u => u.last_login && (Date.now() - new Date(u.last_login)) < 30 * 60 * 1000)
              ).map(u => {
                const isOnline = u.last_login && (Date.now() - new Date(u.last_login)) < 30 * 60 * 1000;
                return (
                  <tr key={u.id}
                    onMouseEnter={e => e.currentTarget.style.background = '#0F172A'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    style={{ transition: 'background .12s' }}
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
              {filtered.length === 0 && tab === 'users' && (
                <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#475569', padding: 40 }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: '#334155', fontFamily: 'monospace' }}>
          {tab === 'users' ? `Showing ${filtered.length} of ${users.length} users` : ''}
        </div>
      </div>
    </div>
  );
}
