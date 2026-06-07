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
      minHeight: '100vh', background: '#0A0A0B', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif"
    }}>
      <div style={{ width: 380 }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, background: '#6B5CFF', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontFamily: 'monospace', fontSize: 16, color: '#fff', fontWeight: 500
          }}>CB</div>
          <h1 style={{ color: '#E8E8EC', fontSize: 22, fontWeight: 300, letterSpacing: -0.5, margin: 0 }}>
            Welcome back
          </h1>
          <p style={{ color: '#55556A', fontSize: 13, marginTop: 6 }}>Sign in to CollabBoard</p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background: '#111113', border: '1px solid #ffffff10', borderRadius: 16, padding: 28
        }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#8888A0', marginBottom: 6 }}>Email</label>
            <input
              type="email" required value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="you@example.com"
              style={{
                width: '100%', background: '#18181C', border: '1px solid #ffffff15',
                borderRadius: 8, padding: '10px 12px', color: '#E8E8EC', fontSize: 14,
                outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#8888A0', marginBottom: 6 }}>Password</label>
            <input
              type="password" required value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="••••••••"
              style={{
                width: '100%', background: '#18181C', border: '1px solid #ffffff15',
                borderRadius: 8, padding: '10px 12px', color: '#E8E8EC', fontSize: 14,
                outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', background: '#6B5CFF', color: '#fff', border: 'none',
              borderRadius: 8, padding: '11px 0', fontSize: 14, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              fontFamily: "'DM Sans', sans-serif"
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#55556A', fontSize: 13, marginTop: 20 }}>
          No account?{' '}
          <Link to="/register" style={{ color: '#8B7DFF', textDecoration: 'none' }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
