import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const [workspaces, setWorkspaces] = useState([]);
  const [showNewWs, setShowNewWs] = useState(false);
  const [wsName, setWsName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/workspaces').then(r => setWorkspaces(r.data.workspaces)).catch(() => {});
  }, []);

  const createWorkspace = async (e) => {
    e.preventDefault();
    if (!wsName.trim()) return;
    try {
      const { data } = await api.post('/api/workspaces', { name: wsName });
      setWorkspaces(p => [data.workspace, ...p]);
      setShowNewWs(false);
      setWsName('');
      toast.success('Workspace created');
    } catch {
      toast.error('Failed to create workspace');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0A0A0B', fontFamily: "'DM Sans', sans-serif", overflow: 'hidden' }}>
      <aside style={{
        width: 220, background: '#111113', borderRight: '1px solid #ffffff10',
        display: 'flex', flexDirection: 'column', flexShrink: 0
      }}>
        <div style={{ padding: '18px 16px', borderBottom: '1px solid #ffffff10', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: '#6B5CFF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: '#fff', fontFamily: 'monospace', flexShrink: 0 }}>CB</div>
          <span style={{ fontSize: 15, fontWeight: 500, color: '#E8E8EC', letterSpacing: -0.3 }}>CollabBoard</span>
        </div>

        <nav style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
          <NavItem to="/" icon="⊞" label="Dashboard" end />

          <div style={{ fontSize: 10, color: '#55556A', letterSpacing: '1.2px', textTransform: 'uppercase', padding: '12px 8px 4px', fontFamily: 'monospace' }}>Workspaces</div>

          {workspaces.map(ws => (
            <NavItem key={ws.id} to={`/?ws=${ws.id}`} icon="◈" label={ws.name} />
          ))}

          <button onClick={() => setShowNewWs(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 8px',
            background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13,
            color: '#55556A', borderRadius: 8, marginTop: 2
          }}>
            <span style={{ fontSize: 16 }}>+</span> New workspace
          </button>

          {showNewWs && (
            <form onSubmit={createWorkspace} style={{ padding: '8px 4px' }}>
              <input
                autoFocus value={wsName} onChange={e => setWsName(e.target.value)}
                placeholder="Workspace name"
                style={{
                  width: '100%', background: '#18181C', border: '1px solid #6B5CFF50',
                  borderRadius: 8, padding: '7px 10px', color: '#E8E8EC', fontSize: 13,
                  outline: 'none', boxSizing: 'border-box'
                }}
              />
            </form>
          )}
        </nav>

        <div style={{ padding: 12, borderTop: '1px solid #ffffff10' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 8, borderRadius: 8, cursor: 'pointer' }}
            onClick={handleLogout}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: user?.avatar_color || '#6B5CFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 500, color: '#fff', flexShrink: 0
            }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#E8E8EC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize: 10, color: '#55556A' }}>Sign out</div>
            </div>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, icon, label, end }) {
  return (
    <NavLink to={to} end={end} style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px',
      borderRadius: 8, cursor: 'pointer', fontSize: 13, textDecoration: 'none',
      color: isActive ? '#8B7DFF' : '#8888A0',
      background: isActive ? '#6B5CFF18' : 'transparent',
      margin: '1px 0', transition: 'all .15s'
    })}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      {label}
    </NavLink>
  );
}
