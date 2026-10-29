import React, { createContext, useState, useEffect } from 'react';
import { apiRequest, API_URL, IS_MOCK } from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize authentication state on load
  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Optionally refresh profile details from API to ensure it's still valid
        try {
          const profile = await apiRequest('/auth/me');
          const updatedUser = {
            id: profile.id,
            email: profile.email,
            role: profile.role,
            name: profile.name
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
        } catch (error) {
          console.warn('Failed to verify token on load:', error.message);
          // Token is likely invalid or expired
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = (jwtToken, userData) => {
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(jwtToken);
    setUser(userData);
  };

  const logout = () => {
    // Tell the server so the sign-out is in the audit trail. Best effort: it must never block signing out
    // (the token may already have expired, which is why this does not go through apiRequest).
    const current = localStorage.getItem('token');
    if (current && !IS_MOCK) {
      fetch(`${API_URL}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${current}` }, keepalive: true }).catch(() => {});
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
export default AuthProvider;
