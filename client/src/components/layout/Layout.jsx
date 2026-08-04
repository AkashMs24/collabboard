import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import CommandPalette from '../CommandPalette';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

function WorkspaceRow({ ws, isActive, onNavigate, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <div style={{ position: 'relative' }}>
      <NavLink to={`/?ws=${ws.id}`} onClick={onNavigate} style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 8px 10px',
        borderRadius: 6, cursor: 'pointer', fontSize: 13.5, textDecoration: 'none',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: isActive ? 'var(--surface-raised)' : 'transparent',
        margin: '1px 0', transition: 'background .1s',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: 2, background: isActive ? 'var(--accent)' : 'var(--text-tertiary)', flexShrink: 0 }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.name}</span>
        <span
          role="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(o => !o); }}
          style={{
            fontSize: 13, color: 'var(--text-tertiary)', padding: '2px 6px', borderRadius: 4,
            cursor: 'pointer', lineHeight: 1,
          }}
        >⋯</span>
      </NavLink>

      {menuOpen && (
        <div ref={menuRef} style={{
          position: 'absolute', right: 4, top: '100%', marginTop: 2, zIndex: 60,
          background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 8,
          minWidth: 150, padding: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <button
            onClick={() => { setMenuOpen(false); onDelete(ws); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
              background: 'none', border: 'none', color: 'var(--danger)', fontSize: 13,
              padding: '7px 9px', cursor: 'pointer', borderRadius: 5, fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            Delete workspace
          </button>
        </div>
      )}
    </div>
  );
}

function SidebarContent({
  user, workspaces, showNewWs, wsName, setWsName, setShowNewWs, createWorkspace,
  handleLogout, setSidebarOpen, initials, activeWsId, deleteWorkspace, openPalette,
}) {
  return (
    <aside style={{
      width: 236, background: 'var(--surface)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100%',
    }}>
      <div style={{ padding: '16px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: "'IBM Plex Mono', monospace",
          background: 'var(--accent)', flexShrink: 0,
        }}>CB</div>
        <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)' }}>CollabBoard</span>
        <button onClick={() => setSidebarOpen(false)} className="mobile-close-btn"
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 18, padding: 0 }}>✕</button>
      </div>

      <div style={{ padding: '10px 10px 0' }}>
        <button onClick={openPalette} style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 9px',
          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer',
          color: 'var(--text-tertiary)', fontSize: 12.5, fontFamily: 'Inter, sans-serif', transition: 'border-color .12s',
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <span style={{ opacity: 0.7 }}>Search…</span>
          <kbd style={{ marginLeft: 'auto', fontSize: 10, border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', fontFamily: "'IBM Plex Mono', monospace" }}>⌘K</kbd>
        </button>
      </div>

      <nav style={{ padding: '10px 8px', flex: 1, overflowY: 'auto' }}>
        <NavItem to="/" icon="▦" label="Dashboard" end onClick={() => setSidebarOpen(false)} />
        {user?.email === ADMIN_EMAIL && (
          <NavItem to="/admin" icon="◆" label="Admin Panel" onClick={() => setSidebarOpen(false)} />
        )}
        <NavItem to="/ai" icon="✳" label="AI Assistant" onClick={() => setSidebarOpen(false)} />

        <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', letterSpacing: '0.6px', textTransform: 'uppercase', padding: '18px 10px 6px', fontFamily: "'IBM Plex Mono', monospace" }}>Workspaces</div>

        {workspaces.map(ws => (
          <WorkspaceRow
            key={ws.id}
            ws={ws}
            isActive={ws.id === activeWsId}
            onNavigate={() => setSidebarOpen(false)}
            onDelete={deleteWorkspace}
          />
        ))}

        <button onClick={() => setShowNewWs(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px',
          background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13,
          color: 'var(--text-tertiary)', borderRadius: 6, marginTop: 6, fontFamily: 'Inter, sans-serif',
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
        >
          + New workspace
        </button>

        {showNewWs && (
          <form onSubmit={createWorkspace} style={{ padding: '6px 2px' }}>
            <input
              autoFocus value={wsName} onChange={e => setWsName(e.target.value)}
              placeholder="Workspace name"
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--accent)', borderRadius: 6, padding: '7px 9px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </form>
        )}
      </nav>

      <div style={{ padding: 10, borderTop: '1px solid var(--border)' }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', borderRadius: 8, cursor: 'pointer', transition: 'background .1s' }}
          onClick={handleLogout}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-raised)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Sign out</div>
          </div>
        </div>
      </div>
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
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
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
        <div className="mobile-topbar" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 20, padding: 0, lineHeight: 1 }}>☰</button>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>CollabBoard</span>
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
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
      borderRadius: 6, cursor: 'pointer', fontSize: 13.5, textDecoration: 'none',
      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
      background: isActive ? 'var(--surface-raised)' : 'transparent',
      margin: '1px 0', transition: 'background .1s', fontWeight: isActive ? 500 : 400,
    })}>
      <span style={{ fontSize: 13, opacity: 0.85, width: 14, textAlign: 'center' }}>{icon}</span>
      {label}
    </NavLink>
  );
}
