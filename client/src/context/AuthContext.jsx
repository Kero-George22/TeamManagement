import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Auth } from '../api/index.js';
import api from '../api/index.js';

const AuthContext = createContext(null);

function normalizeUser(user) {
  if (!user) return null;
  const normalizedId = user._id || user.id || null;
  return { ...user, _id: normalizedId, id: normalizedId };
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => normalizeUser(Auth.user()));
  const [loading, setLoading] = useState(true);

  // On mount, try to refresh user from server
  useEffect(() => {
    if (!Auth.isLoggedIn()) { setLoading(false); return; }
    api.get('/profile/me')
      .then((data) => {
        const u = normalizeUser(data.user || data);
        Auth.updateUser(u);
        setUser(normalizeUser({ ...Auth.user(), ...u }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((token, userData) => {
    const u = normalizeUser(userData);
    Auth.save(token, u);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    Auth.clear();
    setUser(null);
    window.location.href = '/';
  }, []);

  const refreshUser = useCallback(async () => {
    if (!Auth.isLoggedIn()) return;
    try {
      const data = await api.get('/profile/me');
      const u = normalizeUser(data.user || data);
      Auth.updateUser(u);
      setUser(prev => normalizeUser({ ...prev, ...u }));
    } catch {}
  }, []);

  const updateUser = useCallback((patch) => {
    const p = normalizeUser(patch);
    Auth.updateUser(p);
    setUser(prev => normalizeUser({ ...prev, ...p }));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
