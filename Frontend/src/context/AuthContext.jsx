import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('intellmeet_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('intellmeet_token');
      if (storedToken) {
        try {
          const res = await api.getMe();
          setUser(res.data);
        } catch (err) {
          console.warn('[Auth] Token invalid or expired, resetting:', err.message);
          localStorage.removeItem('intellmeet_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    const { accessToken, ...userData } = res.data;
    localStorage.setItem('intellmeet_token', accessToken);
    setToken(accessToken);
    setUser(userData);
    return userData;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    const { accessToken, ...createdUser } = res.data;
    localStorage.setItem('intellmeet_token', accessToken);
    setToken(accessToken);
    setUser(createdUser);
    return createdUser;
  };

  const demoLogin = async (role = 'admin') => {
    const res = await api.demoLogin(role);
    const { accessToken, ...userData } = res.data;
    localStorage.setItem('intellmeet_token', accessToken);
    setToken(accessToken);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('intellmeet_token');
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
