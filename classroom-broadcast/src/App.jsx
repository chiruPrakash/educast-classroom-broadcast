// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import LoginPage        from './pages/LoginPage';
import AdminDashboard   from './pages/AdminDashboard';
import LecturerPage     from './pages/LecturerPage';
import ClassroomPage    from './pages/ClassroomPage';
import LoadingScreen    from './components/shared/LoadingScreen';

// Admin-only guard
const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="noise">
          <Routes>
            {/* Public */}
            <Route path="/login"     element={<LoginPage />} />
            <Route path="/lecturer"  element={<LecturerPage />} />
            <Route path="/classroom" element={<ClassroomPage />} />

            {/* Admin-protected */}
            <Route path="/admin" element={
              <AdminRoute><AdminDashboard /></AdminRoute>
            } />

            {/* Default: show role selector */}
            <Route path="/" element={<Navigate to="/classroom" replace />} />
            <Route path="*" element={<Navigate to="/classroom" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
