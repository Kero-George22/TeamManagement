import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isLoggedIn, user } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) return <Navigate to="/app/login" replace />;

  if (user && !user.hasCompletedOnboarding && location.pathname !== '/app/onboard') {
    return <Navigate to="/app/onboard" replace />;
  }

  return children;
}
