import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { deleteCookie, getCookie, setCookie } from 'cookies-next';
import { AxiosInterceptors } from './interceptor';
import { refreshAccessToken } from '@/lib/services/auth-services';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

// Flag to prevent multiple refresh calls
let isRefreshing = false;
// Queue to store requests while refreshing
let failedQueue: any[] = [];

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

api.interceptors.request.use(
  (config) => {
    const token = getCookie('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and not already retrying
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      typeof window !== 'undefined' &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
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

      const userId = getCookie('userId') as string;

      if (!userId) {
        // No userId in cookies, cannot refresh
        deleteCookie('token');
        deleteCookie('userId');
        window.location.href = '/auth';
        return Promise.reject(error);
      }

      try {
        const res = await refreshAccessToken(userId);
        // Correcting extraction path: res.data is the axios body, res.data.data is the tokens from TransformInterceptor
        const { accessToken } = res.data.data;

        if (accessToken) {
          setCookie('token', accessToken);
          setCookie('access_token', accessToken);

          api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          processQueue(null, accessToken);
          return api(originalRequest);
        } else {
          throw new Error('No access token received');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        deleteCookie('token');
        deleteCookie('userId');
        deleteCookie('role');
        window.location.href = '/auth';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Default error handling
    if (error.response) {
      if (
        typeof window !== 'undefined' &&
        AxiosInterceptors.checkUnauthorizedError(error) &&
        !window.location.href.includes('/auth')
      ) {
        // If it still fails after retry or is not a retryable 401
        deleteCookie('token');
        deleteCookie('userId');
        window.location.href = '/auth';
      }
    }

    return Promise.reject(error);
  },
);
