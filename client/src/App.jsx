import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ToastProvider } from './lib/toast';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
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
const BoardPage = lazy(() => import('./pages/BoardPage'));
const GoalsPage = lazy(() => import('./pages/GoalsPage'));
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage'));
const AdminAnalyticsPage = lazy(() => import('./pages/AdminAnalyticsPage'));
const AdminReviewsPage = lazy(() => import('./pages/AdminReviewsPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));

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
              <Route path="/app/profile/:userId" element={<PublicProfilePage />} />

              {/* Protected routes with layout shell */}
              <Route element={<ProtectedRoute><SocketProvider><ProjectProvider><AppShell /></ProjectProvider></SocketProvider></ProtectedRoute>}>
                <Route path="/app/dashboard"      element={<DashboardPage />} />
                <Route path="/app/projects"       element={<ProjectsPage />} />
                <Route path="/app/explore"       element={<ExplorePage />} />
                <Route path="/app/project/:id"    element={<ProjectPage />} />
                <Route path="/app/task/:id"       element={<TaskPage />} />
                <Route path="/app/tasks"          element={<SectionPage />} />
                <Route path="/app/board/:id"      element={<BoardPage />} />
                <Route path="/app/goals"          element={<GoalsPage />} />
                <Route path="/app/messages"       element={<MessagesPage />} />
                <Route path="/app/profile"        element={<ProfilePage />} />
                <Route path="/app/office/:id"     element={<OfficePage />} />
                <Route path="/app/admin/analytics" element={<AdminRoute><AdminAnalyticsPage /></AdminRoute>} />
                <Route path="/app/admin/reviews"   element={<AdminRoute><AdminReviewsPage /></AdminRoute>} />
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
