import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../context/authStore';

const S = {
  page: { minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '16px' },
  box: { width: '100%', maxWidth: 420 },
  logo: { width: 48, height: 48, background: '#0D9488', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontFamily: 'monospace', fontSize: 18, color: '#fff', fontWeight: 700 },
  title: { color: '#F1F5F9', fontSize: 28, fontWeight: 700, letterSpacing: -0.5, margin: 0, textAlign: 'center' },
  subtitle: { color: '#94A3B8', fontSize: 15, marginTop: 8, textAlign: 'center' },
  card: { background: '#1E293B', border: '1px solid #334155', borderRadius: 18, padding: '32px 28px', marginTop: 28 },
  label: { display: 'block', fontSize: 13, color: '#CBD5E1', fontWeight: 500, marginBottom: 8 },
  input: { width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: 10, padding: '13px 14px', color: '#F1F5F9', fontSize: 15, outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' },
  btn: { width: '100%', background: '#0D9488', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 0', fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginTop: 8, transition: 'background .15s' },
  footer: { textAlign: 'center', color: '#64748B', fontSize: 14, marginTop: 24 },
  link: { color: '#2DD4BF', textDecoration: 'none', fontWeight: 600 },
};

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.box}>
        <div style={S.logo}>CB</div>
        <h1 style={S.title}>Welcome back</h1>
        <p style={S.subtitle}>Sign in to CollabBoard</p>
        <div style={S.card}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>Email</label>
              <input
                type="email" required value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com" style={S.input}
                onFocus={e => e.target.style.borderColor = '#0D9488'}
                onBlur={e => e.target.style.borderColor = '#334155'}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={S.label}>Password</label>
              <input
                type="password" required value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••" style={S.input}
                onFocus={e => e.target.style.borderColor = '#0D9488'}
                onBlur={e => e.target.style.borderColor = '#334155'}
              />
            </div>
            <button type="submit" disabled={loading}
              style={{ ...S.btn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
              onMouseEnter={e => { if (!loading) e.target.style.background = '#0F766E'; }}
              onMouseLeave={e => e.target.style.background = '#0D9488'}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
        <p style={S.footer}>
          No account?{' '}
          <Link to="/register" style={S.link}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
