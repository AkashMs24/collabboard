import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';

const S = {
  page: { minHeight: '100vh', background: '#0F172A', fontFamily: "'DM Sans', sans-serif", color: '#F1F5F9', padding: '28px 20px' },
  card: { background: '#1E293B', border: '1px solid #334155', borderRadius: 16, padding: '24px 28px', marginBottom: 20 },
  label: { fontSize: 12, color: '#64748B', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'block' },
  input: { width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', color: '#F1F5F9', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" },
  textarea: { width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', color: '#F1F5F9', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", minHeight: 80, resize: 'vertical' },
  btn: (color, disabled) => ({ background: disabled ? '#1E293B' : color, border: `1px solid ${disabled ? '#334155' : color}`, borderRadius: 10, padding: '10px 20px', color: disabled ? '#475569' : '#fff', fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all .15s' }),
  result: { background: '#0F172A', border: '1px solid #334155', borderRadius: 10, padding: '16px', marginTop: 16, fontSize: 14, lineHeight: 1.8, color: '#CBD5E1', whiteSpace: 'pre-wrap' },
  badge: (color) => ({ background: `${color}20`, color, border: `1px solid ${color}40`, borderRadius: 20, padding: '3px 12px', fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }),
};

function TaskGenerator() {
  const [boardName, setBoardName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const colColors = { 'Backlog': '#55556A', 'In Progress': '#3B82F6', 'Review': '#8B5CF6', 'Done': '#22C97E' };

  const generate = async () => {
    if (!boardName.trim()) return toast.error('Enter a board name');
    setLoading(true); setResult(null);
    try {
      const { data } = await api.post('/api/ai/generate-tasks', {
        boardName, boardDescription: desc,
        existingColumns: ['Backlog', 'In Progress', 'Review', 'Done'],
      });
      setResult(data);
    } catch { toast.error('AI failed — make sure GROQ_API_KEY is set on your server'); }
    finally { setLoading(false); }
  };

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#8B5CF6,#6B5CFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🧠</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>AI Task Generator</div>
          <div style={{ fontSize: 13, color: '#64748B' }}>Describe your project — AI builds the full task breakdown</div>
        </div>
        <span style={{ marginLeft: 'auto', ...S.badge('#8B5CF6') }}>LLaMA 3.1</span>
      </div>

      <label style={S.label}>Project / Board Name</label>
      <input style={{ ...S.input, marginBottom: 14 }} value={boardName} onChange={e => setBoardName(e.target.value)} placeholder="e.g. E-commerce Mobile App" />

      <label style={S.label}>Project Description (optional)</label>
      <textarea style={{ ...S.textarea, marginBottom: 16 }} value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. React Native app with Stripe payments, user auth, product catalog and push notifications..." />

      <button style={S.btn('#8B5CF6', loading)} onClick={generate} disabled={loading}>
        {loading ? '✨ Generating...' : '✨ Generate Full Task Plan'}
      </button>

      {result && (
        <div style={{ marginTop: 22 }}>
          {result.summary && (
            <div style={{ fontSize: 13, color: '#0D9488', padding: '10px 14px', background: '#0D948815', borderRadius: 8, border: '1px solid #0D948830', marginBottom: 16 }}>
              💡 {result.summary}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {Object.entries(result.columns || {}).map(([col, tasks]) => (
              <div key={col} style={{ background: '#0F172A', borderRadius: 10, padding: 14, border: `1px solid ${colColors[col] || '#334155'}30` }}>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: colColors[col] || '#64748B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontWeight: 700 }}>
                  {col} · {tasks.length}
                </div>
                {tasks.map((t, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#CBD5E1', padding: '7px 10px', background: '#1E293B', borderRadius: 7, marginBottom: 6, border: '1px solid #334155', lineHeight: 1.4 }}>{t}</div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#475569' }}>
            💡 Go to your board and use the "✦ Generate tasks with AI" button to auto-import these directly.
          </div>
        </div>
      )}
    </div>
  );
}

function SmartTaskWriter() {
  const [title, setTitle] = useState('');
  const [boardName, setBoardName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const generate = async () => {
    if (!title.trim()) return toast.error('Enter a task title');
    setLoading(true);
    try {
      const { data } = await api.post('/api/ai/task-description', { taskTitle: title, boardName });
      setResult(data.description);
    } catch { toast.error('AI failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#F59E0B,#EF4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>✍️</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Smart Task Writer</div>
          <div style={{ fontSize: 13, color: '#64748B' }}>AI writes professional descriptions with acceptance criteria</div>
        </div>
        <span style={{ marginLeft: 'auto', ...S.badge('#F59E0B') }}>AUTO-WRITE</span>
      </div>

      <label style={S.label}>Task Title</label>
      <input style={{ ...S.input, marginBottom: 14 }} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Implement JWT refresh token rotation" />

      <label style={S.label}>Project Name (optional)</label>
      <input style={{ ...S.input, marginBottom: 16 }} value={boardName} onChange={e => setBoardName(e.target.value)} placeholder="e.g. Banking App Backend" />

      <button style={S.btn('#F59E0B', loading)} onClick={generate} disabled={loading}>
        {loading ? '✍️ Writing...' : '✍️ Write Description'}
      </button>

      {result && (
        <>
          <div style={S.result}>{result}</div>
          <button onClick={() => { navigator.clipboard.writeText(result); toast.success('Copied!'); }}
            style={{ ...S.btn('#334155', false), marginTop: 8, fontSize: 12, padding: '7px 14px' }}>
            📋 Copy
          </button>
        </>
      )}
    </div>
  );
}

function StandupBot() {
  const [boardId, setBoardId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const generate = async () => {
    if (!boardId.trim()) return toast.error('Paste your board ID from the URL');
    setLoading(true);
    try {
      const { data } = await api.post('/api/ai/standup', { boardId: boardId.trim() });
      setResult(data.standup);
    } catch { toast.error('Failed to generate standup'); }
    finally { setLoading(false); }
  };

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#22C97E,#0D9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📋</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>AI Standup Bot</div>
          <div style={{ fontSize: 13, color: '#64748B' }}>Auto-generate daily standups from 24h board activity</div>
        </div>
        <span style={{ marginLeft: 'auto', ...S.badge('#22C97E') }}>DAILY BOT</span>
      </div>

      <label style={S.label}>Board ID (copy from URL: /board/YOUR-ID-HERE)</label>
      <input style={{ ...S.input, marginBottom: 16, fontFamily: 'monospace', fontSize: 13 }} value={boardId} onChange={e => setBoardId(e.target.value)} placeholder="e.g. 3f8a2b1c-4d5e-..." />

      <button style={S.btn('#22C97E', loading)} onClick={generate} disabled={loading}>
        {loading ? '⏳ Analyzing...' : '📋 Generate Standup Report'}
      </button>

      {result && (
        <>
          <div style={S.result}>{result}</div>
          <button onClick={() => { navigator.clipboard.writeText(result); toast.success('Copied!'); }}
            style={{ ...S.btn('#334155', false), marginTop: 8, fontSize: 12, padding: '7px 14px' }}>
            📋 Copy for Slack / Teams
          </button>
        </>
      )}
    </div>
  );
}

export default function AIAssistantPage() {
  const navigate = useNavigate();

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 16, padding: 0, marginBottom: 20 }}>← Back to Dashboard</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#8B5CF6,#0D9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>✦</div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, background: 'linear-gradient(90deg,#8B5CF6,#0D9488)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AI Assistant
            </h1>
            <p style={{ color: '#64748B', fontSize: 14, margin: '4px 0 0' }}>
              Powered by LLaMA 3.1 via Groq — free, fast, no credit card
            </p>
          </div>
        </div>

        <TaskGenerator />
        <SmartTaskWriter />
        <StandupBot />
      </div>
    </div>
  );
}
