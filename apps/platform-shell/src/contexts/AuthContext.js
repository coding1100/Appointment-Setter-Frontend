import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { authAPI } from '../services/api';
import { clearSessionTokens, getAccessToken, getRefreshToken, setSessionTokens } from '../shared/auth/session';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(getAccessToken());

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = getAccessToken();
      try {
        const response = await authAPI.getCurrentUser();
        setUser(response.data);
        setToken(storedToken || 'cookie-session');
      } catch (error) {
        if (storedToken) {
          console.error('Failed to get current user:', error);
          clearSessionTokens();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { access_token, refresh_token, user: userData } = response.data;
      
      setSessionTokens({
        accessToken: access_token,
        refreshToken: refresh_token,
      });
      
      setToken(access_token || 'cookie-session');
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      const response = await authAPI.register(userData);
      return { success: true, user: response.data };
    } catch (error) {
      const statusCode = error.response?.status;
      const errorDetail = error.response?.data?.detail;
      
      return { 
        success: false,
        statusCode: statusCode,
        error: typeof errorDetail === 'string' ? errorDetail : 'Registration failed' 
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await authAPI.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearSessionTokens();
      setToken(null);
      setUser(null);
    }
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  }), [user, token, loading, login, register, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
