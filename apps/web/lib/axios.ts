import axios, { AxiosError } from "axios";
import { getCookie } from "cookies-next";
import { ErrorHandling } from "./error-handling";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = getCookie("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Standardized error handling via the existing ErrorHandling utility
    ErrorHandling.handle(error);
    return Promise.reject(error);
  }
);

export default axiosInstance;
