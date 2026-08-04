import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../context/authStore';
import WorkspacePulse from '../components/WorkspacePulse';

const COLORS = ['#14B8A6', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const wsId = searchParams.get('ws');
  const [workspaces, setWorkspaces] = useState([]);
  const [boards, setBoards] = useState([]);
  const [activeWs, setActiveWs] = useState(null);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: '#14B8A6' });
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
      setForm({ name: '', description: '', color: '#14B8A6' });
      toast.success('Board created');
      navigate(`/board/${data.board.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', background: '#0D0F16', border: '1px solid #23252F', borderRadius: 10,
    padding: '12px 14px', color: '#F1F2F6', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 12,
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{
      flex: 1, overflowY: 'auto', padding: '32px 20px',
      background: 'radial-gradient(1200px 600px at 20% -10%, #14B8A60D, transparent), #0D0F16',
      color: '#F1F2F6',
    }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>

        <div style={{ marginBottom: 32, animation: 'fadeInUp .4s ease-out' }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#454956', fontFamily: 'monospace', marginBottom: 8 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 700, letterSpacing: -0.8, margin: 0, color: '#F1F2F6' }}>
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
          <p style={{ color: '#5C6270', fontSize: 15, marginTop: 8 }}>
            {activeWs ? activeWs.name : 'Select a workspace to get started'}
          </p>
        </div>

        {activeWs && <WorkspacePulse workspaceId={activeWs.id} />}

        {workspaces.length === 0 && (
          <EmptyState
            icon="⊞"
            title="No workspaces yet"
            subtitle="Create your first workspace from the sidebar to start organizing boards."
          />
        )}

        {activeWs && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '36px 0 16px', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 12, color: '#5C6270', fontFamily: 'monospace', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                Boards
                <span style={{ background: '#181B26', border: '1px solid #23252F', borderRadius: 20, padding: '1px 9px', fontSize: 11, color: '#8B92A5' }}>{boards.length}</span>
              </div>
              <button onClick={() => setShowNewBoard(true)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
                color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px',
                fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                boxShadow: '0 4px 14px #0D948840', transition: 'transform .15s, box-shadow .15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 22px #0D948860'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px #0D948840'; }}
              >+ New board</button>
            </div>

            {showNewBoard && (
              <form onSubmit={createBoard} style={{
                background: '#14161F', border: '1px solid #23252F', borderRadius: 14, padding: '20px', marginBottom: 20,
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)', animation: 'fadeInUp .2s ease-out',
              }}>
                <input autoFocus value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Board name" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#14B8A6'}
                  onBlur={e => e.target.style.borderColor = '#23252F'}
                />
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Description (optional)" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#14B8A6'}
                  onBlur={e => e.target.style.borderColor = '#23252F'}
                />
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                      style={{
                        width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer',
                        border: form.color === c ? '3px solid #F1F2F6' : '2px solid transparent',
                        boxShadow: form.color === c ? `0 0 0 2px #0D0F16, 0 0 0 3px ${c}` : 'none',
                        transition: 'all .15s',
                      }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="submit" disabled={loading} style={{ background: '#14B8A6', color: '#0D0F16', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    {loading ? 'Creating…' : 'Create board'}
                  </button>
                  <button type="button" onClick={() => setShowNewBoard(false)} style={{ background: 'transparent', color: '#8B92A5', border: '1px solid #23252F', borderRadius: 10, padding: '10px 20px', fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 270px), 1fr))', gap: 16 }}>
              {boards.map((board, i) => (
                <div key={board.id} onClick={() => navigate(`/board/${board.id}`)}
                  style={{
                    background: 'linear-gradient(160deg, #14161F, #101219)',
                    border: '1px solid #23252F', borderRadius: 16, padding: 22,
                    cursor: 'pointer', transition: 'transform .18s, box-shadow .18s, border-color .18s',
                    position: 'relative', overflow: 'hidden',
                    animation: `fadeInUp .4s ease-out ${i * 0.05}s both`,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = board.color;
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = `0 16px 36px ${board.color}25, 0 0 0 1px ${board.color}40`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#23252F';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: `${board.color}18`, filter: 'blur(20px)' }} />
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${board.color}20`, border: `1px solid ${board.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 15, color: board.color }}>▤</div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: '#F1F2F6' }}>{board.name}</div>
                  {board.description && <div style={{ fontSize: 13, color: '#5C6270', marginBottom: 14, lineHeight: 1.5 }}>{board.description}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#454956', fontFamily: 'monospace' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: board.color }} />
                    {board.open_tasks} open {board.open_tasks === 1 ? 'task' : 'tasks'}
                  </div>
                </div>
              ))}
            </div>

            {boards.length === 0 && !showNewBoard && (
              <EmptyState
                icon="▤"
                title="No boards yet"
                subtitle="Create your first board, or try the AI Task Generator to auto-populate one."
                action={{ label: '+ New board', onClick: () => setShowNewBoard(true) }}
              />
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

function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div style={{
      textAlign: 'center', padding: '64px 20px',
      background: 'linear-gradient(160deg, #14161F, #101219)',
      borderRadius: 18, border: '1px dashed #2A2D3A',
      animation: 'fadeInUp .4s ease-out',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
        background: 'linear-gradient(135deg, #14B8A620, #0D948810)',
        border: '1px solid #14B8A640', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, color: '#2DD4BF',
      }}>{icon}</div>
      <p style={{ color: '#F1F2F6', fontSize: 16, margin: 0, fontWeight: 600 }}>{title}</p>
      <p style={{ color: '#5C6270', fontSize: 14, marginTop: 8, maxWidth: 340, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>{subtitle}</p>
      {action && (
        <button onClick={action.onClick} style={{
          marginTop: 20, background: 'linear-gradient(135deg, #14B8A6, #0D9488)', color: '#fff',
          border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
        }}>{action.label}</button>
      )}
    </div>
  );
}
