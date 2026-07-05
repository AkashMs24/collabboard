import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function ChurnRadarPanel({ boardId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/api/boards/${boardId}/churn`).then(({ data }) => setData(data)).catch(() => {});
  }, [boardId]);

  if (!data) return null;

  return (
    <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>🔁 Churn Radar</div>
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: data.churn_rate > 20 ? '#EF4444' : '#22C97E' }}>
          {data.churn_rate}% bounced
        </span>
      </div>

      {data.bounciest_tasks.length === 0 ? (
        <div style={{ fontSize: 11, color: '#475569' }}>No rework detected yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {data.bounciest_tasks.map((t) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #33415560', paddingBottom: 5 }}>
              <span style={{ fontSize: 12, color: '#F1F5F9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{t.title}</span>
              <span style={{ fontSize: 10, background: '#F59E0B20', color: '#F59E0B', border: '1px solid #F59E0B40', padding: '2px 7px', borderRadius: 20, fontFamily: 'monospace' }}>
                ×{t.bounce_count}
              </span>
            </div>
          ))}
        </div>
      )}

      {data.retro_notes.length > 0 && (
        <div style={{ borderTop: '1px solid #334155', paddingTop: 8 }}>
          <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#475569', marginBottom: 6 }}>AI ROOT-CAUSE NOTES</div>
          {data.retro_notes.map((n) => (
            <p key={n.task_id} style={{ fontSize: 11, color: '#64748B', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 6 }}>{n.ai_retro_note}</p>
          ))}
        </div>
      )}
    </div>
  );
}
