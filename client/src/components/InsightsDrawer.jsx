import TimeMachineSlider from './TimeMachineSlider';
import RiskRadarPanel from './RiskRadarPanel';
import ChurnRadarPanel from './ChurnRadarPanel';

export default function InsightsDrawer({ boardId, open, onClose }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 900, display: 'flex', justifyContent: 'flex-end' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: 380, maxWidth: '92vw', height: '100%', background: '#0F172A', borderLeft: '1px solid #334155', overflowY: 'auto', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#F1F5F9' }}>📊 Board Insights</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <TimeMachineSlider boardId={boardId} />
          <RiskRadarPanel boardId={boardId} />
          <ChurnRadarPanel boardId={boardId} />
        </div>
      </div>
    </div>
  );
}
