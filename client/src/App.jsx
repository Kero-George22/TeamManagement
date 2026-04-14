import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './lib/toast';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import { ProjectProvider } from './contexts/ProjectContext';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const ProjectPage = lazy(() => import('./pages/ProjectPage'));
const TaskPage = lazy(() => import('./pages/TaskPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const OfficePage = lazy(() => import('./pages/OfficePage'));
const SectionPage = lazy(() => import('./pages/SectionPage'));
const GoalsPage = lazy(() => import('./pages/GoalsPage'));

function RouteLoader() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg)',
      }}
    >
      <div className="card" style={{ padding: '16px 20px', fontWeight: 700 }}>
        Loading...
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<RouteLoader />}>
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
                <Route path="/app/projects"       element={<ProjectsPage />} />
                <Route path="/app/project/:id"    element={<ProjectPage />} />
                <Route path="/app/task/:id"       element={<TaskPage />} />
                <Route path="/app/tasks"          element={<SectionPage />} />
                <Route path="/app/goals"          element={<GoalsPage />} />
                <Route path="/app/messages"       element={<MessagesPage />} />
                <Route path="/app/profile"        element={<ProfilePage />} />
                <Route path="/app/office/:id"     element={<OfficePage />} />
              </Route>

              {/* Catch-all */}
              <Route path="/app/*" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="*"      element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
