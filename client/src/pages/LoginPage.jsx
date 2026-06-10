import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../context/authStore';

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
    <div style={{
      minHeight: '100vh', background: '#F0FDFA', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif"
    }}>
      <div style={{ width: 380 }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, background: '#0D9488', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontFamily: 'monospace', fontSize: 16, color: '#fff', fontWeight: 600
          }}>CB</div>
          <h1 style={{ color: '#111827', fontSize: 22, fontWeight: 500, letterSpacing: -0.5, margin: 0 }}>
            Welcome back
          </h1>
          <p style={{ color: '#6B7280', fontSize: 13, marginTop: 6 }}>Sign in to CollabBoard</p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 16, padding: 28,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#374151', fontWeight: 500, marginBottom: 6 }}>Email</label>
            <input
              type="email" required value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="you@example.com"
              style={{
                width: '100%', background: '#F9FAFB', border: '1px solid #E5E7EB',
                borderRadius: 8, padding: '10px 12px', color: '#111827', fontSize: 14,
                outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s'
              }}
              onFocus={e => e.target.style.borderColor = '#0D9488'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#374151', fontWeight: 500, marginBottom: 6 }}>Password</label>
            <input
              type="password" required value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="••••••••"
              style={{
                width: '100%', background: '#F9FAFB', border: '1px solid #E5E7EB',
                borderRadius: 8, padding: '10px 12px', color: '#111827', fontSize: 14,
                outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s'
              }}
              onFocus={e => e.target.style.borderColor = '#0D9488'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>
          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', background: '#0D9488', color: '#fff', border: 'none',
              borderRadius: 8, padding: '11px 0', fontSize: 14, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              fontFamily: "'DM Sans', sans-serif", transition: 'background .15s'
            }}
            onMouseEnter={e => { if (!loading) e.target.style.background = '#0F766E'; }}
            onMouseLeave={e => { e.target.style.background = '#0D9488'; }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#6B7280', fontSize: 13, marginTop: 20 }}>
          No account?{' '}
          <Link to="/register" style={{ color: '#0D9488', textDecoration: 'none', fontWeight: 500 }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
