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
import AIAssistantPage from './pages/AIAssistantPage';
import Layout from './components/layout/Layout';

const ADMIN_EMAIL = 'manigarakash@gmail.com';

const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0F172A' }}>
    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6B5CFF,#0D9488)', animation: 'pulse 1.2s infinite' }} />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuthStore();
  // Wait until auth is resolved — never redirect while loading
  if (loading) return <Spinner />;
  return user ? children : <Navigate to="/login" replace />;
};

// KEY FIX: Don't redirect to "/" while still loading.
// Previously this was causing admin page to flash then redirect.
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuthStore();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.email !== ADMIN_EMAIL) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => { init(); }, [init]);

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

        {/* Standalone pages — outside Layout, have their own full page */}
        <Route path="/admin" element={
          <AdminRoute><AdminPage /></AdminRoute>
        } />
        <Route path="/ai" element={
          <ProtectedRoute><AIAssistantPage /></ProtectedRoute>
        } />

        {/* Main app with sidebar layout */}
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
