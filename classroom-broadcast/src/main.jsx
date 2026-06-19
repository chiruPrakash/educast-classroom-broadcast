import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import LecturerPage from './pages/LecturerPage';
import ClassroomPage from './pages/ClassroomPage';
import SetupPage from './pages/SetupPage';
import LoadingScreen from './components/shared/LoadingScreen';
import { useAuth } from './context/AuthContext';
import './index.css';

function ProtectedRoute({ children, requiredRole }) {
  const { user, role, loading } = useAuth();
  if (loading) return <LoadingScreen message="Authenticating…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && role !== requiredRole) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"        element={<Navigate to="/classroom" replace />} />
      <Route path="/login"   element={<LoginPage />} />
      <Route path="/setup"   element={<SetupPage />} />
      <Route path="/classroom" element={<ClassroomPage />} />
      <Route path="/admin"   element={
        <ProtectedRoute requiredRole="admin">
          <AdminPage />
        </ProtectedRoute>
      } />
      <Route path="/lecturer" element={
        <ProtectedRoute>
          <LecturerPage />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
