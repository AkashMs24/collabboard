import { useState, useEffect } from 'react';
import api from '../lib/api';

const dueBadgeStyle = (status) => {
  if (status === 'overdue') return { background: '#EF444420', color: '#EF4444', border: '1px solid #EF444440' };
  if (status === 'due_soon') return { background: '#F59E0B20', color: '#F59E0B', border: '1px solid #F59E0B40' };
  return { background: '#33415520', color: '#64748B', border: '1px solid #33415540' };
};

export default function RiskRadarPanel({ boardId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/boards/${boardId}/risk-radar`);
      setData(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [boardId]);

  return (
    <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>🎯 AI Risk Radar</div>
        <button onClick={load} style={{ background: 'none', border: 'none', color: '#2DD4BF', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace' }}>rescan</button>
      </div>

      {loading ? (
        <div style={{ fontSize: 11, color: '#475569' }}>Scanning board…</div>
      ) : !data ? null : (
        <>
          <p style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 10 }}>{data.narrative}</p>
          {data.risks.length === 0 ? (
            <div style={{ fontSize: 11, color: '#475569' }}>No tasks currently flagged.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.risks.map((r) => (
                <div key={r.task_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #33415560', paddingBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#F1F5F9', fontWeight: 500 }}>{r.title}</div>
                    <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>{r.column} · {r.assignee || 'unassigned'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {r.due_status && (
                      <span style={{ ...dueBadgeStyle(r.due_status), fontSize: 9, padding: '2px 7px', borderRadius: 20, fontFamily: 'monospace' }}>
                        {r.due_status.replace('_', ' ')}
                      </span>
                    )}
                    {r.hours_stale && (
                      <span style={{ ...dueBadgeStyle(), fontSize: 9, padding: '2px 7px', borderRadius: 20, fontFamily: 'monospace' }}>
                        stale {r.hours_stale}h
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
