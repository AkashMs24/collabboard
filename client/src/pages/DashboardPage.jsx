import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../context/authStore';
import WorkspacePulse from '../components/WorkspacePulse';

const COLORS = ['#0D9488', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

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

  const inputStyle = { width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: 10, padding: '12px 14px', color: '#F1F5F9', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 12 };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', background: '#0F172A', color: '#F1F5F9' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        <div style={{ marginBottom: 28, animation: 'fadeInUp .4s ease-out' }}>
          <h1 style={{ fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 700, letterSpacing: -0.5, margin: 0, color: '#F1F5F9' }}>
            Good morning, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: '#64748B', fontSize: 15, marginTop: 8 }}>
            {activeWs ? activeWs.name : 'Select a workspace to get started'}
          </p>
        </div>

        {activeWs && <WorkspacePulse workspaceId={activeWs.id} />}

        {workspaces.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#1E293B', borderRadius: 16, border: '1px dashed #334155' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⊞</div>
            <p style={{ color: '#94A3B8', fontSize: 16, margin: 0, fontWeight: 500 }}>No workspaces yet.</p>
            <p style={{ color: '#64748B', fontSize: 14, marginTop: 6 }}>Create one from the sidebar.</p>
          </div>
        )}

        {activeWs && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 12, color: '#475569', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Boards · {boards.length}
              </div>
              <button onClick={() => setShowNewBoard(true)} style={{
                display: 'flex', alignItems: 'center', gap: 6, background: '#0D9488',
                color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px',
                fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                transition: 'background .2s, box-shadow .2s',
              }}
                onMouseEnter={e => { e.target.style.background = '#0F766E'; e.target.style.boxShadow = '0 4px 16px #0D948850'; }}
                onMouseLeave={e => { e.target.style.background = '#0D9488'; e.target.style.boxShadow = 'none'; }}
              >+ New board</button>
            </div>

            {showNewBoard && (
              <form onSubmit={createBoard} style={{ background: '#1E293B', border: '1px solid #0D948860', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
                <input autoFocus value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Board name" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#0D9488'}
                  onBlur={e => e.target.style.borderColor = '#334155'}
                />
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Description (optional)" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#0D9488'}
                  onBlur={e => e.target.style.borderColor = '#334155'}
                />
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                      style={{ width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '3px solid #F1F5F9' : '2px solid transparent', transition: 'border .15s' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="submit" disabled={loading} style={{ background: '#0D9488', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    {loading ? 'Creating...' : 'Create board'}
                  </button>
                  <button type="button" onClick={() => setShowNewBoard(false)} style={{ background: 'transparent', color: '#94A3B8', border: '1px solid #334155', borderRadius: 10, padding: '10px 20px', fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: 14 }}>
              {boards.map((board, i) => (
                <div key={board.id} onClick={() => navigate(`/board/${board.id}`)}
                  style={{
                    background: '#1E293B', border: '1px solid #334155', borderRadius: 14, padding: 20,
                    cursor: 'pointer', transition: 'transform .2s, box-shadow .2s, border-color .2s',
                    position: 'relative', overflow: 'hidden',
                    animation: `fadeInUp .4s ease-out ${i * 0.05}s both`,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = board.color;
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = `0 12px 28px ${board.color}30`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#334155';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: board.color }} />
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, marginTop: 4, color: '#F1F5F9' }}>{board.name}</div>
                  {board.description && <div style={{ fontSize: 13, color: '#64748B', marginBottom: 12, lineHeight: 1.5 }}>{board.description}</div>}
                  <div style={{ fontSize: 12, color: '#475569', fontFamily: 'monospace' }}>{board.open_tasks} open tasks</div>
                </div>
              ))}
            </div>

            {boards.length === 0 && !showNewBoard && (
              <div style={{ textAlign: 'center', padding: '50px 20px', background: '#1E293B', borderRadius: 16, border: '1px dashed #334155' }}>
                <p style={{ color: '#94A3B8', fontSize: 15, margin: 0 }}>No boards yet in this workspace.</p>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
