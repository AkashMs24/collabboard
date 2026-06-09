import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useSocket } from '../context/SocketContext';
import { useAuthStore } from '../context/authStore';
const idempotency_key = crypto.randomUUID();

const PRIORITY_CONFIG = {
  high: { label: 'High', color: '#EF4444' },
  medium: { label: 'Med', color: '#F59E0B' },
  low: { label: 'Low', color: '#22C97E' },
};

const TAG_OPTIONS = ['feat', 'bug', 'infra', 'docs', 'test', 'security', 'design'];

export default function BoardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const socketRef = useSocket();

  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [activity, setActivity] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTaskCol, setNewTaskCol] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', priority: 'medium', tag: 'feat' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [boardRes, actRes] = await Promise.all([
          api.get(`/api/boards/${boardId}`),
          api.get(`/api/boards/${boardId}/activity`),
        ]);
        setBoard(boardRes.data.board);
        setColumns(boardRes.data.columns);
        setActivity(actRes.data.activity);
      } catch {
        toast.error('Failed to load board');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [boardId]);

  // Socket setup
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket || !board) return;

    socket.emit('board:join', boardId);

    socket.on('board:online_users', ({ users }) => setOnlineUsers(users));
    socket.on('user:joined', ({ user: u }) => setOnlineUsers(p => [...p.filter(x => x.id !== u.id), u]));
    socket.on('user:left', ({ userId }) => setOnlineUsers(p => p.filter(x => x.id !== userId)));

    socket.on('task:created', ({ task, columnId }) => {
      setColumns(prev => prev.map(col =>
        col.id === (task.column_id || columnId)
          ? { ...col, tasks: [...col.tasks, task] }
          : col
      ));
    });

    socket.on('task:moved', ({ task }) => {
      setColumns(prev => {
        const updated = prev.map(col => ({ ...col, tasks: col.tasks.filter(t => t.id !== task.id) }));
        return updated.map(col =>
          col.id === task.column_id
            ? { ...col, tasks: [...col.tasks, task].sort((a, b) => a.position - b.position) }
            : col
        );
      });
    });

    socket.on('task:updated', ({ task }) => {
      setColumns(prev => prev.map(col => ({
        ...col,
        tasks: col.tasks.map(t => t.id === task.id ? { ...t, ...task } : t),
      })));
    });

    socket.on('task:deleted', ({ taskId }) => {
      setColumns(prev => prev.map(col => ({
        ...col,
        tasks: col.tasks.filter(t => t.id !== taskId),
      })));
    });

    return () => {
      socket.emit('board:leave', boardId);
      socket.off('board:online_users');
      socket.off('user:joined');
      socket.off('user:left');
      socket.off('task:created');
      socket.off('task:moved');
      socket.off('task:updated');
      socket.off('task:deleted');
    };
  }, [board, boardId, socketRef]);

  const createTask = async (columnId) => {
    if (!taskForm.title.trim()) return;
    setCreating(true);
    const idempotency_key = crypto.randomUUID();
    try {
      const { data } = await api.post(
        `/api/boards/${boardId}/columns/${columnId}/tasks`,
        { ...taskForm, idempotency_key }
      );
      setColumns(prev => prev.map(col =>
        col.id === columnId ? { ...col, tasks: [...col.tasks, data.task] } : col
      ));
      socketRef?.current?.emit('task:created', { task: data.task, boardId, columnId });
      setNewTaskCol(null);
      setTaskForm({ title: '', priority: 'medium', tag: 'feat' });
      toast.success('Task created');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setCreating(false);
    }
  };

  const moveTask = async (taskId, fromColId, toColId) => {
    if (fromColId === toColId) return;
    const toCol = columns.find(c => c.id === toColId);
    const position = toCol.tasks.length;

    // Optimistic update
    let movedTask;
    setColumns(prev => {
      const updated = prev.map(col => {
        if (col.id === fromColId) {
          movedTask = col.tasks.find(t => t.id === taskId);
          return { ...col, tasks: col.tasks.filter(t => t.id !== taskId) };
        }
        return col;
      });
      return updated.map(col =>
        col.id === toColId && movedTask
          ? { ...col, tasks: [...col.tasks, { ...movedTask, column_id: toColId, position }] }
          : col
      );
    });

    try {
      const { data } = await api.patch(`/api/tasks/${taskId}/move`, { column_id: toColId, position, board_id: boardId });
      socketRef?.current?.emit('task:moved', { task: data.task, boardId });
    } catch {
      toast.error('Move failed');
    }
  };

  const deleteTask = async (taskId, columnId) => {
    try {
      await api.delete(`/api/tasks/${taskId}`);
      setColumns(prev => prev.map(col =>
        col.id === columnId ? { ...col, tasks: col.tasks.filter(t => t.id !== taskId) } : col
      ));
      socketRef?.current?.emit('task:deleted', { taskId, boardId });
    } catch {
      toast.error('Delete failed');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, background: '#0A0A0B' }}>
      <div style={{ color: '#8888A0', fontSize: 13 }}>Loading board...</div>
    </div>
  );

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0A0A0B', fontFamily: "'DM Sans', sans-serif", color: '#E8E8EC' }}>
      {/* Topbar */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #ffffff10', background: '#111113', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#55556A', cursor: 'pointer', fontSize: 18, padding: 0 }}>←</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: -0.3 }}>{board?.name}</div>
          <div style={{ fontSize: 11, color: '#55556A', fontFamily: 'monospace' }}>{columns.reduce((s, c) => s + c.tasks.length, 0)} tasks</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Live badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#22C97E', background: '#22C97E15', padding: '3px 10px', borderRadius: 20, border: '1px solid #22C97E20', fontFamily: 'monospace' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22C97E' }} />
            live sync
          </div>
          {/* Online users */}
          <div style={{ display: 'flex' }}>
            {onlineUsers.filter(u => u.id !== user?.id).slice(0, 4).map((u, i) => (
              <div key={u.id} title={u.name} style={{
                width: 26, height: 26, borderRadius: '50%',
                background: u.avatar_color || '#6B5CFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 500, color: '#fff',
                border: '2px solid #111113', marginLeft: i > 0 ? -6 : 0
              }}>
                {u.name?.slice(0, 2).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Board columns */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <div style={{ display: 'flex', gap: 14, height: '100%', alignItems: 'flex-start' }}>
          {columns.map(col => (
            <div key={col.id} style={{
              width: 270, flexShrink: 0, background: '#111113',
              border: '1px solid #ffffff10', borderRadius: 14, overflow: 'hidden'
            }}>
              {/* Column header */}
              <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #ffffff10', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.3px', textTransform: 'uppercase', fontFamily: 'monospace', color: '#8888A0' }}>{col.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, background: '#1E1E24', color: '#55556A', padding: '1px 7px', borderRadius: 20, fontFamily: 'monospace' }}>{col.tasks.length}</span>
              </div>

              {/* Tasks */}
              <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {col.tasks.map(task => (
                  <TaskCard key={task.id} task={task} columns={columns}
                    onMove={(toColId) => moveTask(task.id, col.id, toColId)}
                    onDelete={() => deleteTask(task.id, col.id)}
                  />
                ))}

                {/* New task form */}
                {newTaskCol === col.id ? (
                  <div style={{ background: '#18181C', border: '1px solid #6B5CFF40', borderRadius: 10, padding: 12 }}>
                    <input
                      autoFocus value={taskForm.title}
                      onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') createTask(col.id); if (e.key === 'Escape') setNewTaskCol(null); }}
                      placeholder="Task title..."
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#E8E8EC', fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                      {['high', 'medium', 'low'].map(p => (
                        <button key={p} onClick={() => setTaskForm(f => ({ ...f, priority: p }))}
                          style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, border: `1px solid ${taskForm.priority === p ? PRIORITY_CONFIG[p].color : '#ffffff20'}`, background: 'transparent', color: taskForm.priority === p ? PRIORITY_CONFIG[p].color : '#55556A', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                          {PRIORITY_CONFIG[p].label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      {TAG_OPTIONS.map(t => (
                        <button key={t} onClick={() => setTaskForm(f => ({ ...f, tag: t }))}
                          style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, border: `1px solid ${taskForm.tag === t ? '#6B5CFF' : '#ffffff15'}`, background: taskForm.tag === t ? '#6B5CFF20' : 'transparent', color: taskForm.tag === t ? '#8B7DFF' : '#55556A', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => createTask(col.id)} disabled={creating}
                        style={{ background: '#6B5CFF', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                        {creating ? '...' : 'Add'}
                      </button>
                      <button onClick={() => setNewTaskCol(null)}
                        style={{ background: 'transparent', color: '#55556A', border: '1px solid #ffffff15', borderRadius: 7, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setNewTaskCol(col.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px',
                      margin: '2px 0', border: '1px dashed #ffffff15', borderRadius: 8,
                      background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#55556A',
                      fontFamily: "'DM Sans', sans-serif", transition: 'all .15s', width: '100%'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#6B5CFF50'; e.currentTarget.style.color = '#8B7DFF'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#ffffff15'; e.currentTarget.style.color = '#55556A'; }}
                  >
                    + Add task
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, columns, onMove, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const p = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  return (
    <div style={{
      background: '#18181C', border: '1px solid #ffffff0D', borderRadius: 10,
      padding: 12, cursor: 'default', position: 'relative',
      transition: 'border-color .15s'
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#ffffff18'}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#ffffff0D'; setShowMenu(false); }}
    >
      {task.tag && (
        <div style={{ display: 'inline-flex', fontSize: 10, padding: '2px 7px', borderRadius: 20, marginBottom: 8, background: '#6B5CFF18', color: '#8B7DFF', border: '1px solid #6B5CFF25', fontFamily: 'monospace' }}>
          {task.tag}
        </div>
      )}
      <div style={{ fontSize: 13, lineHeight: 1.4, marginBottom: 10, color: task.is_completed ? '#55556A' : '#E8E8EC', textDecoration: task.is_completed ? 'line-through' : 'none' }}>
        {task.title}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ fontSize: 10, color: p.color, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 3 }}>
          <span>▲</span>{p.label}
        </div>
        {task.comment_count > 0 && (
          <div style={{ fontSize: 10, color: '#55556A', fontFamily: 'monospace', marginLeft: 4 }}>
            💬 {task.comment_count}
          </div>
        )}
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <button onClick={() => setShowMenu(p => !p)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#55556A', fontSize: 14, padding: '0 4px' }}>
            ···
          </button>
          {showMenu && (
            <div style={{
              position: 'absolute', right: 0, top: 20, background: '#1E1E24',
              border: '1px solid #ffffff15', borderRadius: 8, padding: 6, zIndex: 10,
              minWidth: 140, boxShadow: '0 8px 24px #00000040'
            }}>
              <div style={{ fontSize: 10, color: '#55556A', padding: '4px 8px', fontFamily: 'monospace', letterSpacing: '0.5px' }}>MOVE TO</div>
              {columns.filter(c => c.id !== task.column_id).map(c => (
                <button key={c.id} onClick={() => { onMove(c.id); setShowMenu(false); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#8888A0', fontSize: 12, padding: '6px 8px', cursor: 'pointer', borderRadius: 6, fontFamily: "'DM Sans', sans-serif" }}
                  onMouseEnter={e => e.currentTarget.style.background = '#ffffff08'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  {c.name}
                </button>
              ))}
              <div style={{ height: 1, background: '#ffffff10', margin: '4px 0' }} />
              <button onClick={onDelete}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#EF4444', fontSize: 12, padding: '6px 8px', cursor: 'pointer', borderRadius: 6, fontFamily: "'DM Sans', sans-serif" }}>
                Delete task
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
