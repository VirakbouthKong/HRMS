import axios from 'axios';

export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_GATEWAY_URL) ??
  (typeof window !== 'undefined' ? '' : 'http://localhost:8080');
export const MAILPIT_API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAILPIT_URL) || 'http://localhost:8025';
export const IS_MOCK_MODE = typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_MOCK === 'true';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Automatic JWT Gateway Interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Attach Bearer token only when token exists
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('hrms_jwt_token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response error handler with RBAC clearance audit
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Unauthorized request to API Gateway (:8080). Token may be expired or missing.');
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const reqUrl = error.config?.url || '';
      const isAuthRoute =
        currentPath.includes('/login') ||
        currentPath.includes('/verify') ||
        reqUrl.includes('/api/auth/login') ||
        reqUrl.includes('/api/auth/verify-otp');

      if (!isAuthRoute && typeof window !== 'undefined') {
        localStorage.removeItem('hrms_jwt_token');
        localStorage.removeItem('hrms_user');
      }
    } else if (error.response?.status === 403) {
      console.warn('Access forbidden by Spring Cloud Gateway RBAC policy for endpoint:', error.config?.url);
    }
    return Promise.reject(error);
  }
);
