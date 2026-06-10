import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './context/authStore';
import { SocketProvider } from './context/SocketContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import BoardPage from './pages/BoardPage';
import AdminPage from './pages/AdminPage';
import Layout from './components/layout/Layout';

const ADMIN_EMAIL = 'manigarakash@gmail.com';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuthStore();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0A0A0B' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#6B5CFF', animation: 'pulse 1.5s infinite' }} />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuthStore();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0A0A0B' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#6B5CFF', animation: 'pulse 1.5s infinite' }} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.email !== ADMIN_EMAIL) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => { init(); }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#18181C', color: '#E8E8EC', border: '1px solid #ffffff15', fontSize: 13 },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ✅ Admin is OUTSIDE the Layout route — this was the bug */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        } />

        {/* Layout wraps dashboard + board only */}
        <Route path="/" element={
          <ProtectedRoute>
            <SocketProvider>
              <Layout />
            </SocketProvider>
          </ProtectedRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="board/:boardId" element={<BoardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
