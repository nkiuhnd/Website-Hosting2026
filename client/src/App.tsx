import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminProjects from './pages/admin/AdminProjects';
import AdminReports from './pages/admin/AdminReports';
import AdminMessages from './pages/admin/AdminMessages';
import AdminVisitLogs from './pages/admin/AdminVisitLogs';
import AdminStatistics from './pages/admin/AdminStatistics';
import ForgotPassword from './pages/ForgotPassword.tsx';
import Square from './pages/Square';
import ProjectDetail from './pages/ProjectDetail';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';

const ProtectedRoute = ({ children, requireAdmin }: { children: React.ReactElement, requireAdmin?: boolean }) => {
  const { token, role } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (requireAdmin && role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/square" element={<Square />} />
          <Route path="/square/:id" element={<ProjectDetail />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="projects" element={<AdminProjects />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="visit-logs" element={<AdminVisitLogs />} />
            <Route path="statistics" element={<AdminStatistics />} />
          </Route>

          <Route path="/" element={<Home />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
