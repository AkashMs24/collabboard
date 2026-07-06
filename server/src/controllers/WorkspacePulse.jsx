import { useState, useEffect } from 'react';
import api from '../lib/api';

function HealthRing({ score }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? '#22C97E' : score >= 45 ? '#F59E0B' : '#EF4444';

  return (
    <div style={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}>
      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle cx="42" cy="42" r={radius} fill="none" stroke="#334155" strokeWidth="7" />
        <circle
          cx="42" cy="42" r={radius} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 42 42)" style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>{score}</span>
        <span style={{ fontSize: 9, color: '#64748B', fontFamily: 'monospace' }}>HEALTH</span>
      </div>
    </div>
  );
}

export default function WorkspacePulse({ workspaceId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!workspaceId) return;
    api.get(`/api/workspaces/${workspaceId}/pulse`).then(({ data }) => setData(data)).catch(() => {});
  }, [workspaceId]);

  if (!data) return null;

  const cardStyle = {
    background: 'linear-gradient(160deg,#1E293B,#16202E)',
    border: '1px solid #334155', borderRadius: 16, padding: 18,
    display: 'flex', alignItems: 'center', gap: 14,
    transition: 'transform .2s, border-color .2s',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 28, animation: 'fadeInUp .5s ease-out' }}>
      <div style={cardStyle} onMouseEnter={e => e.currentTarget.style.borderColor = '#0D948880'} onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}>
        <HealthRing score={data.health_score} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', marginBottom: 4 }}>Team Health</div>
          <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.5 }}>{data.overdue_count} overdue · {data.stale_count} stale</div>
        </div>
      </div>

      <div style={cardStyle} onMouseEnter={e => e.currentTarget.style.borderColor = '#F59E0B80'} onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}>
        <div style={{ fontSize: 32 }}>{data.streak_days > 0 ? '🔥' : '💤'}</div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>{data.streak_days} day{data.streak_days === 1 ? '' : 's'}</div>
          <div style={{ fontSize: 11, color: '#64748B' }}>completion streak</div>
        </div>
      </div>

      <div style={cardStyle} onMouseEnter={e => e.currentTarget.style.borderColor = '#2DD4BF80'} onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#0D948820', border: '1px solid #0D948860', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2DD4BF', animation: 'pulseDot 2s infinite' }} />
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>{data.online_count}</div>
          <div style={{ fontSize: 11, color: '#64748B' }}>online right now</div>
        </div>
      </div>

      <div style={{ ...cardStyle, gridColumn: 'span 2', alignItems: 'flex-start', flexDirection: 'column' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 10, fontFamily: 'monospace', letterSpacing: 0.5 }}>
          🏆 THIS WEEK'S TOP CONTRIBUTORS
        </div>
        {data.leaderboard.length === 0 ? (
          <div style={{ fontSize: 12, color: '#475569' }}>No completions logged yet this week.</div>
        ) : (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {data.leaderboard.map((u, i) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: u.avatar_color || '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                  {u.name?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#F1F5F9', fontWeight: 500 }}>{['🥇 ', '🥈 ', '🥉 '][i] || ''}{u.name}</div>
                  <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>{u.completed} completed</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseDot { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
      `}</style>
    </div>
  );
}
