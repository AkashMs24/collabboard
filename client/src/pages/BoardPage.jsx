import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../context/authStore';

const TAG_COLORS = { '#0D9488': 'teal', '#3B82F6': 'blue', '#F59E0B': 'amber', '#EF4444': 'red', '#8B5CF6': 'purple' };
const COLORS = Object.keys(TAG_COLORS);

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const wsId = searchParams.get('ws');

  const [workspaces, setWorkspaces] = useState([]);
  const [boards, setBoards] = useState([]);
  const [activeWs, setActiveWs] = useState(null);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: '#0D9488' });
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
      const { data } = await api.post(`/api/workspaces/${activeWs.id}/boards`, form);
      setBoards(p => [data.board, ...p]);
      setShowNewBoard(false);
      setForm({ name: '', description: '', color: '#0D9488' });
      toast.success('Board created');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 32, color: '#111827', background: '#F9FAFB' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: -0.5, margin: 0, color: '#111827' }}>
            Good morning, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: '#6B7280', fontSize: 13, marginTop: 6 }}>
            {activeWs ? activeWs.name : 'Select a workspace to get started'}
          </p>
        </div>

        {workspaces.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '60px 0', background: '#FFFFFF',
            borderRadius: 16, border: '1px dashed #D1D5DB'
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⊞</div>
            <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>No workspaces yet.</p>
            <p style={{ color: '#9CA3AF', fontSize: 13, marginTop: 4 }}>Create one from the sidebar.</p>
          </div>
        )}

        {activeWs && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Boards · {boards.length}
              </div>
              <button onClick={() => setShowNewBoard(true)} style={{
                display: 'flex', alignItems: 'center', gap: 6, background: '#0D9488',
                color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px',
                fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                transition: 'background .15s'
              }}
                onMouseEnter={e => e.target.style.background = '#0F766E'}
                onMouseLeave={e => e.target.style.background = '#0D9488'}
              >+ New board</button>
            </div>

            {showNewBoard && (
              <form onSubmit={createBoard} style={{
                background: '#FFFFFF', border: '1px solid #0D948840', borderRadius: 12,
                padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
              }}>
                <input
                  autoFocus value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Board name" required
                  style={{ width: '100%', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '9px 12px', color: '#111827', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
                  onFocus={e => e.target.style.borderColor = '#0D9488'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
                <input
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Description (optional)"
                  style={{ width: '100%', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '9px 12px', color: '#111827', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
                  onFocus={e => e.target.style.borderColor = '#0D9488'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                      style={{ width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '3px solid #111827' : '2px solid transparent', transition: 'border .15s' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" disabled={loading} style={{ background: '#0D9488', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    {loading ? 'Creating...' : 'Create'}
                  </button>
                  <button type="button" onClick={() => setShowNewBoard(false)} style={{ background: 'transparent', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {boards.map(board => (
                <div key={board.id} onClick={() => navigate(`/board/${board.id}`)}
                  style={{
                    background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14,
                    padding: 20, cursor: 'pointer', transition: 'all .2s', position: 'relative',
                    overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = board.color; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: board.color, borderRadius: '14px 14px 0 0' }} />
                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6, marginTop: 4, color: '#111827' }}>{board.name}</div>
                  {board.description && <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12, lineHeight: 1.4 }}>{board.description}</div>}
                  <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>
                    {board.open_tasks} open tasks
                  </div>
                </div>
              ))}
            </div>

            {boards.length === 0 && !showNewBoard && (
              <div style={{
                textAlign: 'center', padding: '50px 0', background: '#FFFFFF',
                borderRadius: 16, border: '1px dashed #D1D5DB'
              }}>
                <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>No boards yet in this workspace.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
