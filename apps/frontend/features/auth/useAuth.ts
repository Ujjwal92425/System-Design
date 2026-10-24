import { useAuthStore, User } from './authStore';
import { api } from '../../lib/api';
import { useState } from 'react';

export function useAuth() {
  const { user, accessToken, setUser, setAccessToken, setRefreshToken, logout: clearStore } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // CHANGE: Keep errorDetails for collapsible diagnostics in development
  const [errorDetails, setErrorDetails] = useState<any>(null);

  const handleRequest = async <T,>(requestFn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    setError(null);
    setErrorDetails(null);
    try {
      return await requestFn();
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || err.message || 'An unexpected error occurred';
      const details = err.response?.data?.error?.details || null;
      setError(errMsg);
      setErrorDetails(details);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password?: string) => {
    return handleRequest(async () => {
      const res = await api.post('/auth/login', { email, password });
      const { user: userData, token, refreshToken } = res.data.data;
      setUser(userData);
      setAccessToken(token);
      // CHANGE: Store refreshToken in Zustand store for fallback rotation
      if (refreshToken) {
        setRefreshToken(refreshToken);
      }
      return userData as User;
    });
  };

  const signup = async (email: string, password?: string, name?: string) => {
    return handleRequest(async () => {
      const res = await api.post('/auth/signup', { email, password, name });
      return res.data.data;
    });
  };

  const logout = async () => {
    return handleRequest(async () => {
      const currentRefresh = useAuthStore.getState().refreshToken;
      await api.post('/auth/logout', { refreshToken: currentRefresh });
      clearStore();
    });
  };

  const refresh = async () => {
    try {
      const currentRefresh = useAuthStore.getState().refreshToken;
      // CHANGE: Send current refreshToken in payload in case browser omitted cookie
      const res = await api.post('/auth/refresh', { refreshToken: currentRefresh });
      const token = res.data?.data?.token;
      const newRefreshToken = res.data?.data?.refreshToken;
      setAccessToken(token);
      if (newRefreshToken) {
        setRefreshToken(newRefreshToken);
      }
      return token;
    } catch (err) {
      clearStore();
      throw err;
    }
  };

  const verifyEmail = async (token: string) => {
    return handleRequest(async () => {
      const res = await api.post('/auth/verify-email', { token });
      return res.data.data;
    });
  };

  const forgotPassword = async (email: string) => {
    return handleRequest(async () => {
      const res = await api.post('/auth/forgot-password', { email });
      return res.data.data;
    });
  };

  const resetPassword = async (token: string, password?: string) => {
    return handleRequest(async () => {
      const res = await api.post('/auth/reset-password', { token, password });
      return res.data.data;
    });
  };

  const fetchMe = async () => {
    return handleRequest(async () => {
      const res = await api.get('/auth/me');
      const userData = res.data.data.user;
      setUser(userData);
      return userData as User;
    });
  };

  return {
    user,
    accessToken,
    isAuthenticated: !!accessToken,
    loading,
    error,
    // CHANGE: Provide errorDetails for debugging in dev mode
    errorDetails,
    login,
    signup,
    logout,
    refresh,
    verifyEmail,
    forgotPassword,
    resetPassword,
    fetchMe
  };
}
