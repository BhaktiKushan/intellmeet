import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getAuthToken } from '../services/api.js';

const AuthContext = createContext();

const getTabId = () => {
  if (typeof window === 'undefined') return 'tab_ssr';
  let id = sessionStorage.getItem('intellmeet_tab_id');
  if (!id) {
    id = `tab_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    sessionStorage.setItem('intellmeet_tab_id', id);
  }
  return id;
};

export const AuthProvider = ({ children }) => {
  const [tabId] = useState(getTabId);

  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('intellmeet_user') || localStorage.getItem('intellmeet_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.userId && parsed._id) {
          parsed.userId = `USR-${parsed._id.toString().slice(-6).toUpperCase()}`;
        }
        return parsed;
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  const [token, setToken] = useState(() => getAuthToken());
  const [loading, setLoading] = useState(true);

  // Initialize and isolate session for this specific browser tab
  useEffect(() => {
    const initializeAuth = async () => {
      let activeToken = sessionStorage.getItem('intellmeet_token');
      let activeUser = sessionStorage.getItem('intellmeet_user');

      // Seed from localStorage on first open of a new tab if sessionStorage is empty
      if (!activeToken) {
        activeToken = localStorage.getItem('intellmeet_token');
        activeUser = localStorage.getItem('intellmeet_user');
        if (activeToken) {
          sessionStorage.setItem('intellmeet_token', activeToken);
          if (activeUser) sessionStorage.setItem('intellmeet_user', activeUser);
        }
      }

      if (activeToken) {
        setToken(activeToken);
        try {
          const res = await api.getMe();
          if (res?.data) {
            const enriched = {
              ...res.data,
              userId: res.data.userId || `USR-${res.data._id.toString().slice(-6).toUpperCase()}`,
              tabId
            };
            setUser(enriched);
            sessionStorage.setItem('intellmeet_user', JSON.stringify(enriched));
          }
        } catch (err) {
          console.warn('[Auth] Session expired or invalid, resetting tab session:', err.message);
          sessionStorage.removeItem('intellmeet_token');
          sessionStorage.removeItem('intellmeet_user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [tabId]);

  const saveAuthSession = (accessToken, rawUserData) => {
    const currentTabId = getTabId();
    const enrichedUser = {
      ...rawUserData,
      userId: rawUserData.userId || `USR-${rawUserData._id.toString().slice(-6).toUpperCase()}`,
      tabId: currentTabId
    };

    // Tab-isolated storage: each tab maintains its own active user and token
    sessionStorage.setItem('intellmeet_token', accessToken);
    sessionStorage.setItem('intellmeet_user', JSON.stringify(enrichedUser));

    // Shared backup for opening subsequent new tabs
    localStorage.setItem('intellmeet_token', accessToken);
    localStorage.setItem('intellmeet_user', JSON.stringify(enrichedUser));

    setToken(accessToken);
    setUser(enrichedUser);
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

    // If localStorage has the same token as this tab, remove it too
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
        tabId,
        sessionId: user?.sessionId || tabId,
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
