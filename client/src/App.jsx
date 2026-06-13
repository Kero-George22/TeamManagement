import { Suspense, lazy, Component } from 'react';
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
const MyTasksPageWrapper = lazy(() => import('./pages/MyTasksPageWrapper'));
const BoardPage = lazy(() => import('./pages/BoardPage'));
const GoalsPage = lazy(() => import('./pages/GoalsPage'));
const OnboardPage = lazy(() => import('./pages/OnboardPage'));
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage'));
const AdminAnalyticsPage = lazy(() => import('./pages/AdminAnalyticsPage'));
const AdminReviewsPage = lazy(() => import('./pages/AdminReviewsPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const InvitePage = lazy(() => import('./pages/InvitePage'));
const TermsPage = lazy(() => import('./pages/legal/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'));
const CookiesPage = lazy(() => import('./pages/legal/CookiesPage'));
const AUPPage = lazy(() => import('./pages/legal/AUPPage'));

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lazy load error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
          <div className="card" style={{ padding: '24px 32px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: 8 }}>Failed to load page</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>{this.state.error?.message || 'Unknown error'}</p>
            <button className="btn btn--green" onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
          <ErrorBoundary>
            <Suspense fallback={<RouteLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/"                    element={<LandingPage />} />
                <Route path="/login"               element={<LoginPage />} />
                <Route path="/forgot-password"     element={<ForgotPasswordPage />} />
                <Route path="/profile/:userId"     element={<PublicProfilePage />} />
                <Route path="/invite/:token"       element={<InvitePage />} />
                <Route path="/terms"               element={<TermsPage />} />
                <Route path="/privacy"             element={<PrivacyPage />} />
                <Route path="/cookies"             element={<CookiesPage />} />
                <Route path="/aup"                 element={<AUPPage />} />

                {/* Protected route — no shell (fullscreen) */}
                <Route path="/onboard" element={<ProtectedRoute><OnboardPage /></ProtectedRoute>} />

                {/* Protected routes with layout shell */}
                <Route element={<ProtectedRoute><SocketProvider><ProjectProvider><AppShell /></ProjectProvider></SocketProvider></ProtectedRoute>}>
                  <Route path="/dashboard"      element={<DashboardPage />} />
                  <Route path="/projects"       element={<ProjectsPage />} />
                  <Route path="/explore"        element={<ExplorePage />} />
                  <Route path="/project/:id"    element={<ProjectPage />} />
                  <Route path="/task/:id"       element={<TaskPage />} />
                  <Route path="/tasks"          element={<MyTasksPageWrapper />} />
                  <Route path="/board/:id"      element={<BoardPage />} />
                  <Route path="/goals"          element={<GoalsPage />} />
                  <Route path="/messages"       element={<MessagesPage />} />
                  <Route path="/profile"        element={<ProfilePage />} />
                  <Route path="/office/:id"     element={<OfficePage />} />
                  <Route path="/admin"          element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
                  <Route path="/admin/analytics" element={<AdminRoute><AdminAnalyticsPage /></AdminRoute>} />
                  <Route path="/admin/reviews"  element={<AdminRoute><AdminReviewsPage /></AdminRoute>} />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
