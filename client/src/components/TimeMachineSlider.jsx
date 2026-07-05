import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export default function TimeMachineSlider({ boardId }) {
  const [range, setRange] = useState(null);
  const [pct, setPct] = useState(100);
  const [replay, setReplay] = useState(null);
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(true);

  useEffect(() => {
    api.get(`/api/boards/${boardId}/timeline`).then(({ data }) => setRange(data)).catch(() => {});
  }, [boardId]);

  const fetchReplay = useCallback(async (p) => {
    if (!range?.start) return;
    if (p >= 100) { setLive(true); setReplay(null); return; }
    setLive(false);
    setLoading(true);
    const start = new Date(range.start).getTime();
    const end = new Date(range.end || Date.now()).getTime();
    const at = new Date(start + ((end - start) * p) / 100).toISOString();
    try {
      const { data } = await api.get(`/api/boards/${boardId}/replay`, { params: { at } });
      setReplay(data);
    } catch {}
    setLoading(false);
  }, [boardId, range]);

  if (!range?.start) {
    return <div style={{ fontSize: 12, color: '#475569', fontFamily: 'monospace' }}>No history yet on this board.</div>;
  }

  return (
    <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>⏱ Time Machine</div>
        <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>
          {live ? 'live' : new Date(replay?.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <input
        type="range" min={0} max={100} value={pct}
        onChange={(e) => { const v = Number(e.target.value); setPct(v); fetchReplay(v); }}
        style={{ width: '100%', accentColor: '#0D9488' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569', fontFamily: 'monospace', marginTop: 4 }}>
        <span>{new Date(range.start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        <span>now</span>
      </div>

      {loading && <div style={{ fontSize: 11, color: '#475569', marginTop: 8 }}>Reconstructing board state…</div>}

      {!live && !loading && replay && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          {replay.columns.map((col) => (
            <div key={col.id} style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, padding: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', fontFamily: 'monospace', marginBottom: 6 }}>
                {col.name.toUpperCase()} ({col.tasks.length})
              </div>
              {col.tasks.map((t) => (
                <div key={t.id} style={{ fontSize: 11, color: '#CBD5E1', background: '#1E293B', borderRadius: 6, padding: '4px 6px', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.title}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
