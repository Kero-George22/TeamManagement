import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './lib/toast';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import { ProjectProvider } from './contexts/ProjectContext';

import LandingPage        from './pages/LandingPage';
import LoginPage          from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage      from './pages/DashboardPage';
import ProjectsPage       from './pages/ProjectsPage';
import ProjectPage        from './pages/ProjectPage';
import TaskPage           from './pages/TaskPage';
import MessagesPage       from './pages/MessagesPage';
import ProfilePage        from './pages/ProfilePage';
import OfficePage         from './pages/OfficePage';
import SectionPage        from './pages/SectionPage';
import GoalsPage          from './pages/GoalsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/app"                 element={<LandingPage />} />
            <Route path="/app/"                element={<LandingPage />} />
            <Route path="/"                    element={<LandingPage />} />
            <Route path="/app/login"           element={<LoginPage />} />
            <Route path="/app/forgot-password" element={<ForgotPasswordPage />} />

            {/* Protected routes with layout shell */}
            <Route element={<ProtectedRoute><ProjectProvider><AppShell /></ProjectProvider></ProtectedRoute>}>
              <Route path="/app/dashboard"      element={<DashboardPage />} />
              <Route path="/app/projects"        element={<ProjectsPage />} />
              <Route path="/app/project/:id"     element={<ProjectPage />} />
              <Route path="/app/task/:id"        element={<TaskPage />} />
              <Route path="/app/tasks"           element={<SectionPage />} />
              <Route path="/app/goals"           element={<GoalsPage />} />
              <Route path="/app/messages"        element={<MessagesPage />} />
              <Route path="/app/profile"         element={<ProfilePage />} />
              <Route path="/app/office/:id"      element={<OfficePage />} />
            </Route>

            {/* Catch-all */}
            <Route path="/app/*" element={<Navigate to="/app/dashboard" replace />} />
            <Route path="*"      element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
