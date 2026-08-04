import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../context/authStore';

const S = {
  page: { minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif", padding: '16px' },
  box: { width: '100%', maxWidth: 380 },
  logo: { width: 40, height: 40, background: 'var(--accent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, color: '#fff', fontWeight: 700 },
  title: { color: 'var(--text-primary)', fontSize: 22, fontWeight: 600, letterSpacing: -0.3, margin: 0, textAlign: 'center' },
  subtitle: { color: 'var(--text-secondary)', fontSize: 13.5, marginTop: 6, textAlign: 'center' },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '26px 24px', marginTop: 24 },
  label: { display: 'block', fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 7 },
  input: { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', color: 'var(--text-primary)', fontSize: 13.5, outline: 'none', boxSizing: 'border-box', transition: 'border-color .12s' },
  btn: { width: '100%', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '11px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif", marginTop: 4 },
  footer: { textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, marginTop: 20 },
  link: { color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 },
};

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, name, type = 'text', placeholder }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={S.label}>{label}</label>
      <input
        type={type} required value={form[name]}
        onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
        placeholder={placeholder} style={S.input}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.box}>
        <div style={S.logo}>CB</div>
        <h1 style={S.title}>Create your account</h1>
        <p style={S.subtitle}>Start collaborating in minutes</p>
        <div style={S.card}>
          <form onSubmit={handleSubmit}>
            <Field label="Full name" name="name" placeholder="Akash Ms" />
            <Field label="Email" name="email" type="email" placeholder="you@example.com" />
            <Field label="Password" name="password" type="password" placeholder="At least 8 characters" />
            <button type="submit" disabled={loading}
              style={{ ...S.btn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
              onMouseEnter={e => { if (!loading) e.target.style.background = 'var(--accent-hover)'; }}
              onMouseLeave={e => e.target.style.background = 'var(--accent)'}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>
        <p style={S.footer}>
          Already have an account?{' '}
          <Link to="/login" style={S.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
