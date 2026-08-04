import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../context/authStore';
import WorkspacePulse from '../components/WorkspacePulse';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const wsId = searchParams.get('ws');
  const [workspaces, setWorkspaces] = useState([]);
  const [boards, setBoards] = useState([]);
  const [activeWs, setActiveWs] = useState(null);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/api/workspaces').then(r => {
      setWorkspaces(r.data.workspaces);
      const ws = wsId ? r.data.workspaces.find(w => w.id === wsId) : r.data.workspaces[0];
      if (ws) setActiveWs(ws);
    }).catch(() => {});
  }, [wsId]);

  useEffect(() => {
    if (!activeWs) return;
    api.get(`/api/workspaces/${activeWs.id}/boards`).then(r => setBoards(r.data.boards)).catch(() => {});
  }, [activeWs]);

  const createBoard = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !activeWs) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/api/workspaces/${activeWs.id}/boards`, { ...form, color: '#5865F2' });
      setBoards(p => [data.board, ...p]);
      setShowNewBoard(false);
      setForm({ name: '', description: '' });
      toast.success('Board created');
      navigate(`/board/${data.board.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6,
    padding: '9px 11px', color: 'var(--text-primary)', fontSize: 13.5, outline: 'none', boxSizing: 'border-box', marginBottom: 10,
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px', background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        <div style={{ marginBottom: 28, animation: 'fadeInUp .3s ease-out' }}>
          <div style={{ fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 6 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.3, margin: 0, color: 'var(--text-primary)' }}>
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, marginTop: 6 }}>
            {activeWs ? activeWs.name : 'Select a workspace to get started'}
          </p>
        </div>

        {activeWs && <WorkspacePulse workspaceId={activeWs.id} />}

        {workspaces.length === 0 && (
          <EmptyState title="No workspaces yet" subtitle="Create your first workspace from the sidebar to start organizing boards." />
        )}

        {activeWs && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '32px 0 14px', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.6, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                Boards
                <span style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 7px', fontSize: 11, color: 'var(--text-secondary)' }}>{boards.length}</span>
              </div>
              <button onClick={() => setShowNewBoard(true)} style={{
                background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px',
                fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background .12s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
              >+ New board</button>
            </div>

            {showNewBoard && (
              <form onSubmit={createBoard} style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px', marginBottom: 18,
              }}>
                <input autoFocus value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Board name" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Description (optional)" style={{ ...inputStyle, marginBottom: 14 }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" disabled={loading} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {loading ? 'Creating…' : 'Create board'}
                  </button>
                  <button type="button" onClick={() => setShowNewBoard(false)} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: 12 }}>
              {boards.map((board, i) => (
                <div key={board.id} onClick={() => navigate(`/board/${board.id}`)}
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16,
                    cursor: 'pointer', transition: 'border-color .12s, background .12s',
                    animation: `fadeInUp .3s ease-out ${i * 0.03}s both`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.background = 'var(--surface-raised)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
                >
                  <div style={{ fontSize: 14.5, fontWeight: 500, marginBottom: 5, color: 'var(--text-primary)' }}>{board.name}</div>
                  {board.description && <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>{board.description}</div>}
                  <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {board.open_tasks} open {board.open_tasks === 1 ? 'task' : 'tasks'}
                  </div>
                </div>
              ))}
            </div>

            {boards.length === 0 && !showNewBoard && (
              <EmptyState
                title="No boards yet"
                subtitle="Create your first board, or try the AI Task Generator to auto-populate one."
                action={{ label: '+ New board', onClick: () => setShowNewBoard(true) }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, subtitle, action }) {
  return (
    <div style={{
      textAlign: 'center', padding: '56px 20px', background: 'var(--surface)',
      borderRadius: 10, border: '1px solid var(--border)', animation: 'fadeInUp .3s ease-out',
    }}>
      <p style={{ color: 'var(--text-primary)', fontSize: 14.5, margin: 0, fontWeight: 500 }}>{title}</p>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>{subtitle}</p>
      {action && (
        <button onClick={action.onClick} style={{
          marginTop: 16, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6,
          padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        }}>{action.label}</button>
      )}
    </div>
  );
}
