import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import ThemeSwitcher from './components/ThemeSwitcher.jsx';

// Pages
import Landing       from './pages/Landing.jsx';
import Login         from './pages/auth/Login.jsx';
import Register      from './pages/auth/Register.jsx';
import Verify        from './pages/auth/Verify.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword  from './pages/auth/ResetPassword.jsx';
import Dashboard     from './pages/Dashboard.jsx';
import Projects      from './pages/Projects.jsx';
import ProjectDetail from './pages/ProjectDetail.jsx';
import Tasks         from './pages/Tasks.jsx';
import TaskDetail    from './pages/TaskDetail.jsx';
import Profile       from './pages/Profile.jsx';
import Leaderboard   from './pages/Leaderboard.jsx';
import Assessment    from './pages/Assessment.jsx';
import Portfolio     from './pages/Portfolio.jsx';
import Office        from './pages/Office.jsx';
import Admin         from './pages/Admin.jsx';

// Route guards
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center' }}><div className="spinner" /></div>;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center' }}><div className="spinner" /></div>;
  if (!user)         return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user)    return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"               element={<Landing />} />
      <Route path="/login"          element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register"       element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/verify"         element={<Verify />} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password"  element={<ResetPassword />} />

      {/* Protected */}
      <Route path="/dashboard"        element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/projects"         element={<PrivateRoute><Projects /></PrivateRoute>} />
      <Route path="/projects/:id"     element={<PrivateRoute><ProjectDetail /></PrivateRoute>} />
      <Route path="/tasks"            element={<PrivateRoute><Tasks /></PrivateRoute>} />
      <Route path="/tasks/:taskId"    element={<PrivateRoute><TaskDetail /></PrivateRoute>} />
      <Route path="/profile"          element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/profile/:userId"  element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/leaderboard"      element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
      <Route path="/assessment"       element={<PrivateRoute><Assessment /></PrivateRoute>} />
      <Route path="/portfolio"        element={<PrivateRoute><Portfolio /></PrivateRoute>} />
      <Route path="/office"           element={<PrivateRoute><Office /></PrivateRoute>} />
      <Route path="/office/:projectId" element={<PrivateRoute><Office /></PrivateRoute>} />
      <Route path="/admin"             element={<AdminRoute><Admin /></AdminRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
            <ThemeSwitcher />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
