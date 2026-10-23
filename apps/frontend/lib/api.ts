import axios from 'axios';
import { useAuthStore } from '../features/auth/authStore';

// Retrieve public API URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4007';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true, // Crucial for sending HttpOnly session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach memory JWT access token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Catch 401 and attempt token rotation
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Guard: Prevent loops on auth endpoints themselves (like /login or /refresh)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/signup')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Trigger silent refresh rotation via cookies
        const res = await axios.post(
          `${API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = res.data?.data?.token;

        if (!newAccessToken) {
          throw new Error('No access token returned from rotation');
        }

        // Store new token in Zustand
        useAuthStore.getState().setAccessToken(newAccessToken);

        // Resume queued requests
        processQueue(null, newAccessToken);
        isRefreshing = false;

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Force clear store and redirect to login
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
