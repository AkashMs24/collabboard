import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useSocket } from '../context/SocketContext';
import { useAuthStore } from '../context/authStore';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const PRIORITY_CONFIG = {
  high:   { label: 'High',   color: '#EF4444' },
  medium: { label: 'Med',    color: '#F59E0B' },
  low:    { label: 'Low',    color: '#22C97E' },
};
const TAG_OPTIONS = ['feat', 'bug', 'infra', 'docs', 'test', 'security', 'design'];
const ADMIN_EMAIL = 'manigarakash@gmail.com';

// ─── Droppable Column Wrapper ─────────────────────────────────────────────────
function DroppableColumn({ id, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} style={{
      minHeight: 60,
      borderRadius: 8,
      transition: 'background .15s',
      background: isOver ? '#0D948815' : 'transparent',
      padding: 4,
    }}>
      {children}
    </div>
  );
}

// ─── Sortable Task Card ───────────────────────────────────────────────────────
function SortableTaskCard({ task, columns, onMove, onDelete, boardName, boardId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} columns={columns} onMove={onMove} onDelete={onDelete} boardName={boardName} boardId={boardId} />
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, columns, onMove, onDelete, boardName, boardId }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const p = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  return (
    <>
      <div
        style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 10, padding: 12, marginBottom: 8, cursor: 'grab', position: 'relative', transition: 'border-color .15s, box-shadow .15s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E293B'; e.currentTarget.style.boxShadow = 'none'; setShowMenu(false); }}
        onClick={() => setShowDetail(true)}
      >
        {task.tag && (
          <span style={{ display: 'inline-flex', fontSize: 10, padding: '2px 8px', borderRadius: 20, marginBottom: 7, background: '#0D948820', color: '#2DD4BF', border: '1px solid #0D948840', fontFamily: 'monospace' }}>
            {task.tag}
          </span>
        )}
        <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 10, color: task.is_completed ? '#475569' : '#F1F5F9', textDecoration: task.is_completed ? 'line-through' : 'none', fontWeight: 500 }}>
          {task.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: p.color, fontFamily: 'monospace' }}>▲ {p.label}</span>
          {task.due_date && (
            <span style={{ fontSize: 10, color: new Date(task.due_date) < new Date() ? '#EF4444' : '#64748B', fontFamily: 'monospace', marginLeft: 4 }}>
              📅 {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {task.comment_count > 0 && (
            <span style={{ fontSize: 10, color: '#475569', marginLeft: 4 }}>💬 {task.comment_count}</span>
          )}
          <div style={{ marginLeft: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowMenu(m => !m)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 15, padding: '0 4px', lineHeight: 1 }}>···</button>
            {showMenu && (
              <div style={{ position: 'absolute', right: 0, top: 22, background: '#1E293B', border: '1px solid #334155', borderRadius: 10, padding: 6, zIndex: 100, minWidth: 150, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                <div style={{ fontSize: 10, color: '#475569', padding: '4px 8px', fontFamily: 'monospace', letterSpacing: 1 }}>MOVE TO</div>
                {columns.filter(c => c.id !== task.column_id).map(c => (
                  <button key={c.id} onClick={() => { onMove(c.id); setShowMenu(false); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#94A3B8', fontSize: 13, padding: '7px 8px', cursor: 'pointer', borderRadius: 6, fontFamily: "'DM Sans', sans-serif" }}
                    onMouseEnter={e => e.currentTarget.style.background = '#334155'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >{c.name}</button>
                ))}
                <div style={{ height: 1, background: '#334155', margin: '4px 0' }} />
                <button onClick={onDelete}
                  style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#EF4444', fontSize: 13, padding: '7px 8px', cursor: 'pointer', borderRadius: 6, fontFamily: "'DM Sans', sans-serif" }}>
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDetail && (
        <TaskDetailModal task={task} boardName={boardName} boardId={boardId} onClose={() => setShowDetail(false)} />
      )}
    </>
  );
}

// ─── Task Detail Modal ────────────────────────────────────────────────────────
function TaskDetailModal({ task, boardName, boardId, onClose }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    api.get(`/api/tasks/${task.id}/comments`).then(r => setComments(r.data.comments)).catch(() => {});
  }, [task.id]);

  const addComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/api/tasks/${task.id}/comments`, { content: newComment });
      setComments(p => [...p, { ...data.comment, name: user?.name, avatar_color: user?.avatar_color }]);
      setNewComment('');
    } catch { toast.error('Failed to add comment'); }
    finally { setSubmitting(false); }
  };

  const p = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ flex: 1, paddingRight: 12 }}>
            {task.tag && <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: '#0D948820', color: '#2DD4BF', border: '1px solid #0D948840', fontFamily: 'monospace' }}>{task.tag}</span>}
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#F1F5F9', marginTop: 10, marginBottom: 8, lineHeight: 1.4 }}>{task.title}</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: p.color, fontFamily: 'monospace' }}>▲ {p.label} priority</span>
              {task.due_date && <span style={{ fontSize: 12, color: new Date(task.due_date) < new Date() ? '#EF4444' : '#64748B', fontFamily: 'monospace' }}>📅 {new Date(task.due_date).toLocaleDateString('en-IN')}</span>}
              {task.assignee_name && <span style={{ fontSize: 12, color: '#64748B' }}>👤 {task.assignee_name}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 22, padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>

        {task.description && (
          <div style={{ background: '#0F172A', borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 13, color: '#94A3B8', lineHeight: 1.7, whiteSpace: 'pre-wrap', border: '1px solid #334155' }}>
            {task.description}
          </div>
        )}

        <div style={{ borderTop: '1px solid #334155', paddingTop: 16 }}>
          <div style={{ fontSize: 12, color: '#475569', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Comments ({comments.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: c.avatar_color || '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {c.name?.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ background: '#0F172A', borderRadius: 8, padding: '8px 12px', flex: 1, border: '1px solid #334155' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 4 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.5 }}>{c.content}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newComment} onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && addComment()}
              placeholder="Add a comment..."
              style={{ flex: 1, background: '#0F172A', border: '1px solid #334155', borderRadius: 8, padding: '9px 12px', color: '#F1F5F9', fontSize: 13, outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
            />
            <button onClick={addComment} disabled={submitting}
              style={{ background: '#0D9488', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inline AI Description Writer in task form ────────────────────────────────
function AIDescriptionButton({ taskTitle, boardName, onGenerated }) {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!taskTitle.trim()) { toast.error('Enter a task title first'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/api/ai/task-description', { taskTitle, boardName });
      onGenerated(data.description);
      toast.success('AI wrote the description ✨');
    } catch { toast.error('AI failed — check GROQ_API_KEY on server'); }
    finally { setLoading(false); }
  };

  return (
    <button onClick={generate} disabled={loading} title="AI: Write task description"
      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '4px 10px', borderRadius: 20, border: '1px solid #8B5CF660', background: loading ? '#8B5CF610' : '#8B5CF620', color: '#A78BFA', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
      {loading ? '✨ Writing...' : '✨ AI Write'}
    </button>
  );
}

// ─── Global Search Bar ────────────────────────────────────────────────────────
function SearchBar({ workspaceId, onNavigateBoard }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounce = useRef(null);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); setOpen(false); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/api/workspaces/${workspaceId}/search?q=${encodeURIComponent(query)}`);
        setResults(data.tasks);
        setOpen(true);
      } catch {} finally { setLoading(false); }
    }, 350);
  }, [query, workspaceId]);

  if (!workspaceId) return null;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0F172A', border: '1px solid #334155', borderRadius: 10, padding: '7px 12px' }}>
        <span style={{ fontSize: 13, color: '#475569' }}>🔍</span>
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Search tasks..."
          style={{ background: 'none', border: 'none', color: '#F1F5F9', fontSize: 13, outline: 'none', width: 180, fontFamily: "'DM Sans', sans-serif" }}
        />
        {loading && <span style={{ fontSize: 11, color: '#475569' }}>...</span>}
      </div>
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1E293B', border: '1px solid #334155', borderRadius: 10, padding: 6, zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', marginTop: 4, minWidth: 280 }}>
          {results.map(t => (
            <button key={t.id} onClick={() => { onNavigateBoard(t.board_id); setQuery(''); setOpen(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#CBD5E1', fontSize: 13, padding: '8px 10px', cursor: 'pointer', borderRadius: 7, fontFamily: "'DM Sans', sans-serif" }}
              onMouseEnter={e => e.currentTarget.style.background = '#334155'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <div style={{ fontWeight: 500 }}>{t.title}</div>
              <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace', marginTop: 2 }}>{t.board_name} › {t.column_name}</div>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && query.length >= 2 && !loading && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1E293B', border: '1px solid #334155', borderRadius: 10, padding: '12px 14px', zIndex: 200, fontSize: 13, color: '#475569', marginTop: 4 }}>
          No tasks found for "{query}"
        </div>
      )}
    </div>
  );
}

// ─── Live Cursors ─────────────────────────────────────────────────────────────
function LiveCursors({ cursors, myId }) {
  return (
    <>
      {Object.entries(cursors)
        .filter(([uid]) => uid !== myId)
        .map(([uid, c]) => (
          <div key={uid} style={{ position: 'fixed', left: c.x, top: c.y, pointerEvents: 'none', zIndex: 9999, transform: 'translate(-4px, -4px)' }}>
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
              <path d="M0 0L0 14L4 10L7 17L9 16L6 9L11 9Z" fill={c.color || '#0D9488'} stroke="#0F172A" strokeWidth="1" />
            </svg>
            <div style={{ background: c.color || '#0D9488', color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, marginTop: 2, whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>
              {c.name}
            </div>
          </div>
        ))}
    </>
  );
}

// ─── AI Task Generator Panel (empty board) ────────────────────────────────────
function AIGeneratePanel({ boardName, columns, onTasksGenerated }) {
  const [loading, setLoading] = useState(false);
  const [desc, setDesc] = useState('');
  const [show, setShow] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/api/ai/generate-tasks', {
        boardName, boardDescription: desc,
        existingColumns: columns.map(c => c.name),
      });
      onTasksGenerated(data);
      setShow(false);
      toast.success('AI generated your task plan ✨');
    } catch { toast.error('AI generation failed'); }
    finally { setLoading(false); }
  };

  if (!show) return (
    <button onClick={() => setShow(true)}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: 'linear-gradient(135deg,#8B5CF620,#0D948820)', border: '1px solid #8B5CF640', borderRadius: 10, color: '#A78BFA', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
      ✦ Generate tasks with AI
    </button>
  );

  return (
    <div style={{ background: '#1E293B', border: '1px solid #8B5CF640', borderRadius: 12, padding: 16, maxWidth: 380 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#A78BFA', marginBottom: 10 }}>✦ AI Task Generator</div>
      <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe the project (optional)..."
        style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px', color: '#F1F5F9', fontSize: 13, outline: 'none', resize: 'none', minHeight: 64, boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={generate} disabled={loading}
          style={{ background: '#8B5CF6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          {loading ? 'Generating...' : 'Generate'}
        </button>
        <button onClick={() => setShow(false)}
          style={{ background: 'none', border: '1px solid #334155', color: '#64748B', borderRadius: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main Board Page ──────────────────────────────────────────────────────────
export default function BoardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const socketRef = useSocket();

  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [cursors, setCursors] = useState({});
  const [loading, setLoading] = useState(true);
  const [newTaskCol, setNewTaskCol] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', tag: 'feat' });
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [showStandup, setShowStandup] = useState(false);
  const [standup, setStandup] = useState('');
  const [standupLoading, setStandupLoading] = useState(false);

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [filterText, setFilterText] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    const load = async () => {
      try {
        const boardRes = await api.get(`/api/boards/${boardId}`);
        setBoard(boardRes.data.board);
        setColumns(boardRes.data.columns);
        setWorkspaceId(boardRes.data.board.workspace_id);
      } catch {
        toast.error('Failed to load board');
        navigate('/');
      } finally { setLoading(false); }
    };
    load();
  }, [boardId]);

  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket || !board) return;
    socket.emit('board:join', boardId);

    socket.on('board:online_users', ({ users }) => setOnlineUsers(users));
    socket.on('user:joined', ({ user: u }) => setOnlineUsers(p => [...p.filter(x => x.id !== u.id), u]));
    socket.on('user:left', ({ userId }) => { setOnlineUsers(p => p.filter(x => x.id !== userId)); setCursors(p => { const n = { ...p }; delete n[userId]; return n; }); });

    socket.on('task:created', ({ task }) => {
      setColumns(prev => prev.map(col =>
        col.id === task.column_id ? { ...col, tasks: [...col.tasks, task] } : col
      ));
    });
    socket.on('task:moved', ({ task }) => {
      setColumns(prev => {
        const cleared = prev.map(col => ({ ...col, tasks: col.tasks.filter(t => t.id !== task.id) }));
        return cleared.map(col => col.id === task.column_id
          ? { ...col, tasks: [...col.tasks, task].sort((a, b) => a.position - b.position) }
          : col
        );
      });
    });
    socket.on('task:updated', ({ task }) => {
      setColumns(prev => prev.map(col => ({ ...col, tasks: col.tasks.map(t => t.id === task.id ? { ...t, ...task } : t) })));
    });
    socket.on('task:deleted', ({ taskId }) => {
      setColumns(prev => prev.map(col => ({ ...col, tasks: col.tasks.filter(t => t.id !== taskId) })));
    });

    socket.on('cursor:move', ({ userId, name, color, x, y }) => {
      setCursors(prev => ({ ...prev, [userId]: { name, color, x, y } }));
    });

    const onMouseMove = (e) => {
      socket.emit('cursor:move', { boardId, x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      socket.emit('board:leave', boardId);
      ['board:online_users','user:joined','user:left','task:created','task:moved','task:updated','task:deleted','cursor:move']
        .forEach(e => socket.off(e));
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [board, boardId, socketRef]);

  // ── Drag and Drop ────────────────────────────────────────────────────────────
  const findColumnByTaskId = (taskId) => columns.find(col => col.tasks.some(t => t.id === taskId));

  const handleDragStart = ({ active }) => {
    const col = findColumnByTaskId(active.id);
    const task = col?.tasks.find(t => t.id === active.id);
    setActiveTask(task || null);
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) return;
    const activeCol = findColumnByTaskId(active.id);
    const overCol = columns.find(c => c.id === over.id) || findColumnByTaskId(over.id);
    if (!activeCol || !overCol || activeCol.id === overCol.id) return;

    setColumns(prev => {
      const task = prev.find(c => c.id === activeCol.id)?.tasks.find(t => t.id === active.id);
      if (!task) return prev;
      return prev.map(col => {
        if (col.id === activeCol.id) return { ...col, tasks: col.tasks.filter(t => t.id !== active.id) };
        if (col.id === overCol.id) return { ...col, tasks: [...col.tasks, { ...task, column_id: overCol.id }] };
        return col;
      });
    });
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveTask(null);
    if (!over) return;

    const activeCol = findColumnByTaskId(active.id);
    const overCol = columns.find(c => c.id === over.id) || findColumnByTaskId(over.id);
    if (!activeCol || !overCol) return;

    const newCol = overCol;
    const position = newCol.tasks.findIndex(t => t.id === over.id);
    const finalPos = position === -1 ? newCol.tasks.length : position;

    if (activeCol.id === overCol.id) {
      setColumns(prev => prev.map(col => {
        if (col.id !== activeCol.id) return col;
        const oldIdx = col.tasks.findIndex(t => t.id === active.id);
        const newIdx = col.tasks.findIndex(t => t.id === over.id);
        if (oldIdx === -1 || newIdx === -1) return col;
        return { ...col, tasks: arrayMove(col.tasks, oldIdx, newIdx) };
      }));
    }

    try {
      const { data } = await api.patch(`/api/tasks/${active.id}/move`, {
        column_id: overCol.id, position: finalPos, board_id: boardId,
      });
      socketRef?.current?.emit('task:moved', { task: data.task, boardId });
    } catch { toast.error('Move failed'); }
  };

  // ── Create Task ───────────────────────────────────────────────────────────────
  const createTask = async (columnId) => {
    if (!taskForm.title.trim()) return;
    setCreating(true);
    const idempotency_key = crypto.randomUUID();
    try {
      const { data } = await api.post(`/api/boards/${boardId}/columns/${columnId}/tasks`, {
        ...taskForm,
        due_date: dueDate || null,
        idempotency_key,
      });
      setColumns(prev => prev.map(col => col.id === columnId ? { ...col, tasks: [...col.tasks, data.task] } : col));
      socketRef?.current?.emit('task:created', { task: data.task, boardId });
      setNewTaskCol(null);
      setTaskForm({ title: '', description: '', priority: 'medium', tag: 'feat' });
      setDueDate('');
      toast.success('Task created');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setCreating(false); }
  };

  const deleteTask = async (taskId, columnId) => {
    try {
      await api.delete(`/api/tasks/${taskId}`);
      setColumns(prev => prev.map(col => col.id === columnId ? { ...col, tasks: col.tasks.filter(t => t.id !== taskId) } : col));
      socketRef?.current?.emit('task:deleted', { taskId, boardId });
    } catch { toast.error('Delete failed'); }
  };

  const handleAITasksGenerated = async (aiData) => {
    const colMap = {};
    columns.forEach(c => { colMap[c.name] = c; });
    for (const [colName, tasks] of Object.entries(aiData.columns || {})) {
      const col = colMap[colName];
      if (!col) continue;
      for (const title of tasks) {
        try {
          const { data } = await api.post(`/api/boards/${boardId}/columns/${col.id}/tasks`, {
            title, priority: 'medium', tag: 'feat', idempotency_key: crypto.randomUUID(),
          });
          setColumns(prev => prev.map(c => c.id === col.id ? { ...c, tasks: [...c.tasks, data.task] } : c));
        } catch {}
      }
    }
  };

  const generateStandup = async () => {
    setStandupLoading(true);
    setShowStandup(true);
    try {
      const { data } = await api.post('/api/ai/standup', { boardId });
      setStandup(data.standup);
    } catch { setStandup('Failed to generate standup report.'); }
    finally { setStandupLoading(false); }
  };

  const totalTasks = columns.reduce((s, c) => s + c.tasks.length, 0);
  const isEmpty = totalTasks === 0;

  // ── Filter helper ─────────────────────────────────────────────────────────────
  const filteredTasks = (colTasks) =>
    colTasks
      .filter(t => filterPriority === 'all' || t.priority === filterPriority)
      .filter(t => !filterText || t.title.toLowerCase().includes(filterText.toLowerCase()));

  const activeFilters = filterText || filterPriority !== 'all';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, background: '#0F172A' }}>
      <div style={{ color: '#64748B', fontSize: 15 }}>Loading board...</div>
    </div>
  );

  return (
    <div id="board-canvas" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0F172A', fontFamily: "'DM Sans', sans-serif", color: '#F1F5F9', position: 'relative' }}>

      {/* Live cursors */}
      <LiveCursors cursors={cursors} myId={user?.id} />

      {/* Topbar */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #1E293B', background: '#1E293B', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 18, padding: 0 }}>←</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#F1F5F9' }}>{board?.name}</div>
          <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>{totalTasks} tasks</div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <SearchBar workspaceId={workspaceId} onNavigateBoard={(bid) => navigate(`/board/${bid}`)} />

          <button onClick={generateStandup}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid #22C97E40', background: '#22C97E15', color: '#22C97E', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, whiteSpace: 'nowrap' }}>
            📋 Standup
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#2DD4BF', background: '#0D948820', padding: '4px 10px', borderRadius: 20, border: '1px solid #0D948840', fontFamily: 'monospace' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2DD4BF', animation: 'pulse 2s infinite' }} /> live
          </div>

          <div style={{ display: 'flex' }}>
            {onlineUsers.filter(u => u.id !== user?.id).slice(0, 4).map((u, i) => (
              <div key={u.id} title={u.name} style={{ width: 26, height: 26, borderRadius: '50%', background: u.avatar_color || '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', border: '2px solid #1E293B', marginLeft: i > 0 ? -7 : 0 }}>
                {u.name?.slice(0, 2).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid #1E293B', background: '#0F172A', flexWrap: 'wrap', flexShrink: 0 }}>
        <input
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          placeholder="🔍  Filter tasks by title..."
          style={{
            background: '#1E293B', border: '1px solid #334155', borderRadius: 8,
            padding: '6px 12px', color: '#F1F5F9', fontSize: 13, outline: 'none',
            width: 210, fontFamily: "'DM Sans', sans-serif",
          }}
        />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace', marginRight: 2 }}>PRIORITY</span>
          {['all', 'high', 'medium', 'low'].map(p => (
            <button key={p} onClick={() => setFilterPriority(p)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                border: filterPriority === p ? 'none' : '1px solid #334155',
                fontFamily: 'monospace',
                background: filterPriority === p ? '#0D9488' : 'transparent',
                color: filterPriority === p ? '#fff' : '#64748B',
                transition: 'all .15s',
              }}>
              {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        {activeFilters && (
          <button onClick={() => { setFilterText(''); setFilterPriority('all'); }}
            style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              border: '1px solid #EF444440', background: '#EF444410', color: '#EF4444',
              fontFamily: 'monospace',
            }}>
            ✕ Clear
          </button>
        )}
        {activeFilters && (
          <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>
            {columns.reduce((acc, col) => acc + filteredTasks(col.tasks).length, 0)} matching
          </span>
        )}
      </div>

      {/* AI Standup Modal */}
      {showStandup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowStandup(false); }}>
          <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 16, padding: 28, maxWidth: 500, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>📋 Daily Standup — AI Generated</div>
              <button onClick={() => setShowStandup(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            {standupLoading
              ? <div style={{ color: '#64748B', fontSize: 14 }}>Analyzing board activity...</div>
              : <pre style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: "'DM Sans', sans-serif", margin: 0 }}>{standup}</pre>
            }
            {!standupLoading && (
              <button onClick={() => { navigator.clipboard.writeText(standup); toast.success('Copied!'); }}
                style={{ marginTop: 16, background: '#334155', color: '#94A3B8', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                📋 Copy
              </button>
            )}
          </div>
        </div>
      )}

      {/* Board Columns */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', minWidth: 'max-content' }}>

            {isEmpty && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, minWidth: 320 }}>
                <AIGeneratePanel boardName={board?.name} columns={columns} onTasksGenerated={handleAITasksGenerated} />
              </div>
            )}

            {columns.map(col => {
              const visibleTasks = filteredTasks(col.tasks);
              return (
                <div key={col.id} style={{ width: 'clamp(250px, 80vw, 285px)', flexShrink: 0, background: '#1E293B', border: '1px solid #334155', borderRadius: 14, overflow: 'visible' }}>
                  {/* Column Header */}
                  <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: 'monospace', color: '#94A3B8' }}>{col.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, background: '#0F172A', color: activeFilters ? '#0D9488' : '#475569', padding: '2px 8px', borderRadius: 20, fontFamily: 'monospace' }}>
                      {activeFilters ? `${visibleTasks.length}/${col.tasks.length}` : col.tasks.length}
                    </span>
                  </div>

                  {/* Tasks */}
                  <div style={{ padding: '10px 10px 6px' }}>
                    <SortableContext items={col.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      <DroppableColumn id={col.id}>
                        {visibleTasks.map(task => (
                          <SortableTaskCard key={task.id} task={task} columns={columns}
                            onMove={(toColId) => handleDragEnd({ active: { id: task.id }, over: { id: toColId } })}
                            onDelete={() => deleteTask(task.id, col.id)}
                            boardName={board?.name} boardId={boardId}
                          />
                        ))}
                        {activeFilters && visibleTasks.length === 0 && (
                          <div style={{ padding: '14px 10px', fontSize: 12, color: '#475569', textAlign: 'center', fontFamily: 'monospace' }}>
                            No matches
                          </div>
                        )}
                      </DroppableColumn>
                    </SortableContext>

                    {/* New Task Form */}
                    {newTaskCol === col.id ? (
                      <div style={{ background: '#0F172A', border: '1px solid #0D948860', borderRadius: 10, padding: 12, marginTop: 6 }}>
                        <input
                          autoFocus value={taskForm.title}
                          onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') createTask(col.id); if (e.key === 'Escape') setNewTaskCol(null); }}
                          placeholder="Task title..."
                          style={{ width: '100%', background: 'transparent', border: 'none', color: '#F1F5F9', fontSize: 14, outline: 'none', marginBottom: 8, boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }}
                        />

                        {/* AI Write button */}
                        <div style={{ marginBottom: 8 }}>
                          <AIDescriptionButton
                            taskTitle={taskForm.title}
                            boardName={board?.name}
                            onGenerated={(desc) => setTaskForm(p => ({ ...p, description: desc }))}
                          />
                          {taskForm.description && (
                            <div style={{ marginTop: 6, fontSize: 11, color: '#64748B', background: '#0F172A', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px', lineHeight: 1.5 }}>
                              {taskForm.description.slice(0, 120)}...
                            </div>
                          )}
                        </div>

                        {/* Priority */}
                        <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
                          {['high', 'medium', 'low'].map(pr => (
                            <button key={pr} onClick={() => setTaskForm(f => ({ ...f, priority: pr }))}
                              style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, border: `1px solid ${taskForm.priority === pr ? PRIORITY_CONFIG[pr].color : '#334155'}`, background: taskForm.priority === pr ? `${PRIORITY_CONFIG[pr].color}20` : 'transparent', color: taskForm.priority === pr ? PRIORITY_CONFIG[pr].color : '#64748B', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                              {PRIORITY_CONFIG[pr].label}
                            </button>
                          ))}
                        </div>

                        {/* Tags */}
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                          {TAG_OPTIONS.map(t => (
                            <button key={t} onClick={() => setTaskForm(f => ({ ...f, tag: t }))}
                              style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, border: `1px solid ${taskForm.tag === t ? '#0D9488' : '#334155'}`, background: taskForm.tag === t ? '#0D948820' : 'transparent', color: taskForm.tag === t ? '#2DD4BF' : '#64748B', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                              {t}
                            </button>
                          ))}
                        </div>

                        {/* Due Date */}
                        <input
                          type="date"
                          value={dueDate}
                          onChange={e => setDueDate(e.target.value)}
                          style={{
                            width: '100%', background: '#0F172A', border: '1px solid #334155',
                            borderRadius: 8, padding: '7px 10px', color: dueDate ? '#F1F5F9' : '#475569',
                            fontSize: 12, outline: 'none', boxSizing: 'border-box',
                            fontFamily: "'DM Sans', sans-serif", marginBottom: 10,
                            colorScheme: 'dark',
                          }}
                        />

                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => createTask(col.id)} disabled={creating}
                            style={{ background: '#0D9488', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                            {creating ? '...' : 'Add'}
                          </button>
                          <button onClick={() => { setNewTaskCol(null); setTaskForm({ title: '', description: '', priority: 'medium', tag: 'feat' }); setDueDate(''); }}
                            style={{ background: 'transparent', color: '#64748B', border: '1px solid #334155', borderRadius: 8, padding: '7px 12px', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setNewTaskCol(col.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', border: '1px dashed #334155', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#475569', fontFamily: "'DM Sans', sans-serif", width: '100%', marginTop: 6, transition: 'all .15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#0D9488'; e.currentTarget.style.color = '#2DD4BF'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#475569'; }}>
                        + Add task
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask && (
            <div style={{ background: '#0F172A', border: '1px solid #0D9488', borderRadius: 10, padding: 12, opacity: 0.95, boxShadow: '0 16px 40px rgba(0,0,0,0.6)', cursor: 'grabbing', maxWidth: 285 }}>
              {activeTask.tag && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#0D948820', color: '#2DD4BF', fontFamily: 'monospace', marginBottom: 6, display: 'inline-block' }}>{activeTask.tag}</span>}
              <div style={{ fontSize: 13, color: '#F1F5F9', fontWeight: 500 }}>{activeTask.title}</div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
