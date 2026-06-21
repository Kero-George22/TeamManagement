import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API, { setOnUnauthorized } from '../lib/api';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(() => API.getUser());
  const [token, setToken] = useState(() => API.getToken());
  const navigate = useNavigate();

  useEffect(() => {
    setOnUnauthorized(() => navigate('/app/login', { replace: true }));
  }, [navigate]);

  const login = useCallback((data) => {
    API.saveAuth(data);
    setUser(data.user);
    setToken(data.token);
  }, []);

  const logout = useCallback(async () => {
    try { await API.auth.logout(); } catch {}
    API.clearAuth();
    setUser(null);
    setToken(null);
    navigate('/app/login', { replace: true });
  }, [navigate]);

  const updateUser = useCallback((userData) => {
    setUser((prev) => {
      const merged = { ...prev, ...userData };
      API.saveAuth({ user: merged });
      return merged;
    });
  }, []);

  const isLoggedIn = !!user;

  return (
    <AuthContext.Provider value={{ user, token, isLoggedIn, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
