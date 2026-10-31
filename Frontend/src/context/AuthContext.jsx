import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getAuthToken } from '../services/api.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('intellmeet_user') || localStorage.getItem('intellmeet_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(() => getAuthToken());
  const [loading, setLoading] = useState(true);

  // Tab-isolated session initialization
  useEffect(() => {
    const initializeAuth = async () => {
      // Prioritize tab-isolated sessionStorage over shared localStorage
      let activeToken = sessionStorage.getItem('intellmeet_token');
      if (!activeToken) {
        // Seed from localStorage on first open of a tab
        activeToken = localStorage.getItem('intellmeet_token');
        if (activeToken) {
          sessionStorage.setItem('intellmeet_token', activeToken);
          const localUser = localStorage.getItem('intellmeet_user');
          if (localUser) sessionStorage.setItem('intellmeet_user', localUser);
        }
      }

      if (activeToken) {
        setToken(activeToken);
        try {
          const res = await api.getMe();
          if (res?.data) {
            setUser(res.data);
            sessionStorage.setItem('intellmeet_user', JSON.stringify(res.data));
          }
        } catch (err) {
          console.warn('[Auth] Tab session invalid or expired, resetting:', err.message);
          sessionStorage.removeItem('intellmeet_token');
          sessionStorage.removeItem('intellmeet_user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const saveAuthSession = (accessToken, userData) => {
    // Save to tab-isolated sessionStorage so each tab maintains its own independent session
    sessionStorage.setItem('intellmeet_token', accessToken);
    sessionStorage.setItem('intellmeet_user', JSON.stringify(userData));
    // Also save to localStorage for newly opened tabs
    localStorage.setItem('intellmeet_token', accessToken);
    localStorage.setItem('intellmeet_user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
  };

  const login = async (email, password) => {
    const res = await api.login(email, password);
    const { accessToken, ...userData } = res.data;
    saveAuthSession(accessToken, userData);
    return userData;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    const { accessToken, ...createdUser } = res.data;
    saveAuthSession(accessToken, createdUser);
    return createdUser;
  };

  const demoLogin = async (role = 'admin') => {
    const res = await api.demoLogin(role);
    const { accessToken, ...userData } = res.data;
    saveAuthSession(accessToken, userData);
    return userData;
  };

  const logout = () => {
    // Clear only this tab's session
    sessionStorage.removeItem('intellmeet_token');
    sessionStorage.removeItem('intellmeet_user');
    // Clear localStorage if it matches this tab's token
    if (localStorage.getItem('intellmeet_token') === token) {
      localStorage.removeItem('intellmeet_token');
      localStorage.removeItem('intellmeet_user');
    }
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        demoLogin,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
