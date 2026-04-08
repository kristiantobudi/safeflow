import axios, { AxiosError, AxiosResponse } from 'axios';
import { deleteCookie, getCookie } from 'cookies-next';
import { AxiosInterceptors } from './interceptor';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

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
  (error: AxiosError) => {
    if (error.response) {
      if (
        typeof window !== 'undefined' &&
        AxiosInterceptors.checkUnauthorizedError(error) &&
        !window.location.href.includes('/login')
      ) {
        deleteCookie('token');
        deleteCookie('role');
        window.location.href = '/login';
      }
    } else if (error.request) {
      console.error('Request Error:', error.request);
    } else {
      console.error('Unexpected Error:', error.message);
    }

    return Promise.reject(error);
  },
);
