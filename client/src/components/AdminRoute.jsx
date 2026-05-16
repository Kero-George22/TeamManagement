import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AdminRoute({ children }) {
  const { user, isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/app/login" replace />;
  if (!user?.isAdmin) return <Navigate to="/app/dashboard" replace />;
  return children;
}
