import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const ADMIN_EMAIL = 'manigarakash@gmail.com';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const [workspaces, setWorkspaces] = useState([]);
  const [showNewWs, setShowNewWs] = useState(false);
  const [wsName, setWsName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const Sidebar = () => (
    <aside style={{
      width: 230, background: '#1E293B', borderRight: '1px solid #334155',
      display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100%'
    }}>
      <div style={{ padding: '18px 16px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: '#0D9488', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'monospace', flexShrink: 0 }}>CB</div>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#F1F5F9', letterSpacing: -0.3 }}>CollabBoard</span>
        <button onClick={() => setSidebarOpen(false)}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 20, display: window.innerWidth < 768 ? 'block' : 'none', padding: 0 }}>✕</button>
      </div>

      <nav style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
        <NavItem to="/" icon="⊞" label="Dashboard" end onClick={() => setSidebarOpen(false)} />

        {/* Admin link — only visible for your account */}
        {user?.email === ADMIN_EMAIL && (
          <NavItem to="/admin" icon="⚙" label="Admin Panel" onClick={() => setSidebarOpen(false)} />
        )}

        <div style={{ fontSize: 10, color: '#475569', letterSpacing: '1.2px', textTransform: 'uppercase', padding: '14px 8px 6px', fontFamily: 'monospace' }}>Workspaces</div>
        {workspaces.map(ws => (
          <NavItem key={ws.id} to={`/?ws=${ws.id}`} icon="◈" label={ws.name} onClick={() => setSidebarOpen(false)} />
        ))}
        <button onClick={() => setShowNewWs(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px',
          background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13,
          color: '#64748B', borderRadius: 8, marginTop: 4, fontFamily: "'DM Sans', sans-serif"
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New workspace
        </button>
        {showNewWs && (
          <form onSubmit={createWorkspace} style={{ padding: '8px 4px' }}>
            <input
              autoFocus value={wsName} onChange={e => setWsName(e.target.value)}
              placeholder="Workspace name"
              style={{ width: '100%', background: '#0F172A', border: '1px solid #0D9488', borderRadius: 8, padding: '8px 10px', color: '#F1F5F9', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </form>
        )}
      </nav>

      <div style={{ padding: 12, borderTop: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, cursor: 'pointer', transition: 'background .15s' }}
          onClick={handleLogout}
          onMouseEnter={e => e.currentTarget.style.background = '#334155'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: user?.avatar_color || '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>Sign out</div>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0F172A', fontFamily: "'DM Sans', sans-serif", overflow: 'hidden' }}>
      {/* Desktop sidebar */}
      <div style={{ display: 'none' }} className="desktop-sidebar">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setSidebarOpen(false)} />
          <div style={{ position: 'relative', width: 250, zIndex: 51 }}>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Always visible sidebar on desktop via flex */}
      <div style={{ flexShrink: 0 }} id="sidebar-desktop">
        <Sidebar />
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Mobile topbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#1E293B', borderBottom: '1px solid #334155' }}
          className="mobile-topbar">
          <button onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 22, padding: 0, lineHeight: 1 }}>☰</button>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#F1F5F9' }}>CollabBoard</span>
        </div>
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .mobile-topbar { display: none !important; }
          #sidebar-desktop { display: block !important; }
        }
        @media (max-width: 767px) {
          #sidebar-desktop { display: none !important; }
          .mobile-topbar { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

function NavItem({ to, icon, label, end, onClick }) {
  return (
    <NavLink to={to} end={end} onClick={onClick} style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
      borderRadius: 8, cursor: 'pointer', fontSize: 14, textDecoration: 'none',
      color: isActive ? '#2DD4BF' : '#94A3B8',
      background: isActive ? '#0D948820' : 'transparent',
      margin: '2px 0', transition: 'all .15s', fontWeight: isActive ? 600 : 400
    })}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      {label}
    </NavLink>
  );
}
