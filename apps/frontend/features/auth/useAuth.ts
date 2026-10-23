import { useAuthStore, User } from './authStore';
import { api } from '../../lib/api';
import { useState } from 'react';

export function useAuth() {
  const { user, accessToken, setUser, setAccessToken, logout: clearStore } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = async <T,>(requestFn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      return await requestFn();
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || err.message || 'An unexpected error occurred';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password?: string) => {
    return handleRequest(async () => {
      const res = await api.post('/auth/login', { email, password });
      const { user: userData, token } = res.data.data;
      setUser(userData);
      setAccessToken(token);
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
      await api.post('/auth/logout');
      clearStore();
    });
  };

  const refresh = async () => {
    try {
      const res = await api.post('/auth/refresh');
      const token = res.data?.data?.token;
      setAccessToken(token);
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
