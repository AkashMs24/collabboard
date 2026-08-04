import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import CommandPalette from '../CommandPalette';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

function SidebarContent({
  user, workspaces, showNewWs, wsName, setWsName, setShowNewWs, createWorkspace,
  handleLogout, setSidebarOpen, initials, activeWsId, deleteWorkspace, openPalette,
}) {
  return (
    <aside style={{
      width: 240, background: 'linear-gradient(180deg, #14161F 0%, #101219 100%)',
      borderRight: '1px solid #23252F', display: 'flex', flexDirection: 'column',
      flexShrink: 0, height: '100%',
    }}>
      <div style={{ padding: '18px 16px', borderBottom: '1px solid #23252F', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'monospace', flexShrink: 0,
          background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 4px 12px rgba(13,148,136,0.35)',
        }}>CB</div>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#F1F2F6', letterSpacing: -0.3 }}>CollabBoard</span>
        <button onClick={() => setSidebarOpen(false)} className="mobile-close-btn"
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#5C6270', cursor: 'pointer', fontSize: 20, padding: 0 }}>✕</button>
      </div>

      <div style={{ padding: '12px 12px 0' }}>
        <button onClick={openPalette} style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 10px',
          background: '#181B26', border: '1px solid #23252F', borderRadius: 9, cursor: 'pointer',
          color: '#5C6270', fontSize: 13, fontFamily: "'DM Sans', sans-serif", transition: 'border-color .15s',
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#2DD4BF50'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#23252F'}
        >
          <span>⌕</span>
          <span style={{ flex: 1, textAlign: 'left' }}>Search or jump to…</span>
          <kbd style={{ fontSize: 10, border: '1px solid #2A2D3A', borderRadius: 4, padding: '2px 5px', fontFamily: 'monospace' }}>⌘K</kbd>
        </button>
      </div>

      <nav style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
        <NavItem to="/" icon="⊞" label="Dashboard" end onClick={() => setSidebarOpen(false)} />
        {user?.email === ADMIN_EMAIL && (
          <NavItem to="/admin" icon="⚙" label="Admin Panel" onClick={() => setSidebarOpen(false)} />
        )}
        <NavItem to="/ai" icon="✦" label="AI Assistant" onClick={() => setSidebarOpen(false)} />

        <div style={{ fontSize: 10, color: '#454956', letterSpacing: '1.2px', textTransform: 'uppercase', padding: '16px 8px 6px', fontFamily: 'monospace' }}>Workspaces</div>

        {workspaces.map(ws => (
          <div key={ws.id} className="ws-row" style={{ position: 'relative' }}>
            <NavItem to={`/?ws=${ws.id}`} icon="◈" label={ws.name} onClick={() => setSidebarOpen(false)} />
            {ws.id === activeWsId && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteWorkspace(ws); }}
                title="Delete workspace"
                className="ws-delete-btn"
                style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#5C6270', cursor: 'pointer',
                  fontSize: 13, padding: '4px 6px', borderRadius: 5, opacity: 0, transition: 'opacity .15s, color .15s',
                }}
              >🗑</button>
            )}
          </div>
        ))}

        <button onClick={() => setShowNewWs(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 10px',
          background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13,
          color: '#5C6270', borderRadius: 8, marginTop: 4, fontFamily: "'DM Sans', sans-serif",
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New workspace
        </button>

        {showNewWs && (
          <form onSubmit={createWorkspace} style={{ padding: '8px 4px' }}>
            <input
              autoFocus value={wsName} onChange={e => setWsName(e.target.value)}
              placeholder="Workspace name"
              style={{ width: '100%', background: '#0D0F16', border: '1px solid #14B8A6', borderRadius: 8, padding: '8px 10px', color: '#F1F2F6', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </form>
        )}
      </nav>

      <div style={{ padding: 12, borderTop: '1px solid #23252F' }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, cursor: 'pointer', transition: 'background .15s' }}
          onClick={handleLogout}
          onMouseEnter={e => e.currentTarget.style.background = '#1A1D28'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: user?.avatar_color || '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F2F6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: '#5C6270' }}>Sign out</div>
          </div>
        </div>
      </div>

      <style>{`
        .ws-row:hover .ws-delete-btn { opacity: 1; }
        .ws-delete-btn:hover { color: #EF4444 !important; background: #EF444415; }
      `}</style>
    </aside>
  );
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const [workspaces, setWorkspaces] = useState([]);
  const [showNewWs, setShowNewWs] = useState(false);
  const [wsName, setWsName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeWsId = searchParams.get('ws') || workspaces[0]?.id;

  const loadWorkspaces = () => {
    api.get('/api/workspaces').then(r => setWorkspaces(r.data.workspaces)).catch(() => {});
  };

  useEffect(() => { loadWorkspaces(); }, []);

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

  const deleteWorkspace = async (ws) => {
    if (!window.confirm(`Delete "${ws.name}"? This permanently removes all its boards and tasks. This can't be undone.`)) return;
    try {
      await api.delete(`/api/workspaces/${ws.id}`);
      toast.success(`"${ws.name}" deleted`);
      const remaining = workspaces.filter(w => w.id !== ws.id);
      setWorkspaces(remaining);
      navigate(remaining[0] ? `/?ws=${remaining[0].id}` : '/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete workspace');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const sidebarProps = {
    user, workspaces, showNewWs, wsName, setWsName, setShowNewWs, createWorkspace,
    handleLogout, setSidebarOpen, initials, activeWsId, deleteWorkspace,
    openPalette: () => setPaletteOpen(true),
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0D0F16', fontFamily: "'DM Sans', sans-serif", overflow: 'hidden' }}>
      <CommandPalette workspaces={workspaces} activeWorkspaceId={activeWsId} />

      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setSidebarOpen(false)} />
          <div style={{ position: 'relative', width: 250, zIndex: 51 }}>
            <SidebarContent {...sidebarProps} />
          </div>
        </div>
      )}

      <div id="sidebar-desktop" style={{ flexShrink: 0 }}>
        <SidebarContent {...sidebarProps} />
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="mobile-topbar" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#14161F', borderBottom: '1px solid #23252F' }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 22, padding: 0, lineHeight: 1 }}>☰</button>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#F1F2F6' }}>CollabBoard</span>
        </div>

        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .mobile-topbar { display: none !important; }
          .mobile-close-btn { display: none !important; }
          #sidebar-desktop { display: block !important; }
        }
        @media (max-width: 767px) {
          #sidebar-desktop { display: none !important; }
          .mobile-topbar { display: flex !important; }
          .mobile-close-btn { display: block !important; }
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
      color: isActive ? '#2DD4BF' : '#8B92A5',
      background: isActive ? 'linear-gradient(90deg, #14B8A61A, transparent)' : 'transparent',
      borderLeft: isActive ? '2px solid #2DD4BF' : '2px solid transparent',
      margin: '2px 0', transition: 'all .15s', fontWeight: isActive ? 600 : 400,
    })}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      {label}
    </NavLink>
  );
}
