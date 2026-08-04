import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function CommandPalette({ workspaces, activeWorkspaceId }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  const staticActions = [
    { type: 'action', icon: '⊞', label: 'Go to Dashboard', run: () => navigate('/') },
    { type: 'action', icon: '✦', label: 'Open AI Assistant', run: () => navigate('/ai') },
  ];

  useEffect(() => {
    const handler = (e) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (isCmdK) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 2 || !activeWorkspaceId) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/api/workspaces/${activeWorkspaceId}/search`, { params: { q: query } });
        setResults(data.tasks.map((t) => ({
          type: 'task',
          icon: '▤',
          label: t.title,
          sublabel: `${t.board_name} · ${t.column_name}`,
          run: () => navigate(`/board/${t.board_id}`),
        })));
        setActiveIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, activeWorkspaceId, navigate]);

  const items = query.trim().length >= 2 ? results : staticActions;

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, items.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && items[activeIndex]) { items[activeIndex].run(); setOpen(false); }
  }, [items, activeIndex]);

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(6,8,15,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh', animation: 'cmdkFadeIn .12s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(560px, 92vw)', background: '#15171F',
          border: '1px solid #2A2D3A', borderRadius: 14,
          boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
          overflow: 'hidden', animation: 'cmdkScaleIn .14s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #23252F' }}>
          <span style={{ fontSize: 15, color: '#5C6270' }}>⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, jump to a page..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#F1F2F6', fontSize: 15, fontFamily: "'DM Sans', sans-serif",
            }}
          />
          {loading && <span style={{ fontSize: 11, color: '#5C6270', fontFamily: 'monospace' }}>searching…</span>}
          <kbd style={{ fontSize: 11, color: '#5C6270', border: '1px solid #2A2D3A', borderRadius: 5, padding: '2px 6px', fontFamily: 'monospace' }}>ESC</kbd>
        </div>

        <div style={{ maxHeight: 340, overflowY: 'auto', padding: 6 }}>
          {items.length === 0 && query.trim().length >= 2 && !loading && (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: '#5C6270', fontSize: 13 }}>
              No matches for "{query}"
            </div>
          )}
          {items.map((item, i) => (
            <div
              key={i}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => { item.run(); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderRadius: 8, cursor: 'pointer',
                background: activeIndex === i ? '#1F2230' : 'transparent',
                transition: 'background .1s',
              }}
            >
              <span style={{ fontSize: 15, width: 20, textAlign: 'center', color: '#2DD4BF' }}>{item.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: '#F1F2F6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                {item.sublabel && (
                  <div style={{ fontSize: 12, color: '#5C6270', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.sublabel}</div>
                )}
              </div>
              {activeIndex === i && <kbd style={{ fontSize: 10, color: '#5C6270', border: '1px solid #2A2D3A', borderRadius: 4, padding: '2px 5px', fontFamily: 'monospace' }}>↵</kbd>}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 14, padding: '9px 16px', borderTop: '1px solid #23252F', fontSize: 11, color: '#454956' }}>
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>

      <style>{`
        @keyframes cmdkFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cmdkScaleIn { from { opacity: 0; transform: scale(0.97) translateY(-4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}
