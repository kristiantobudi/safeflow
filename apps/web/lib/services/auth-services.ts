import { api } from '@/settings/axios-setting';
import axios from 'axios';

export interface LoginProps {
  email: string;
  password: string;
}

export interface RegisterProps {
  username: string;
  password: string;
  name: string;
  role: string;
  unit: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function loginUser({ email, password }: LoginProps) {
  const res = await axios.post(
    `${API_URL}/auth/login`,
    { email, password },
    {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    },
  );

  if (res.status === 200) {
    return res.data;
  }

  throw new Error('Login failed');
}

export async function registerUser({
  username,
  password,
  name,
  role,
  unit,
}: RegisterProps) {
  const res = await api.post(
    `${API_URL}/auth/sign-up`,
    {
      username,
      password,
      name,
      role,
      unit,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    },
  );

  return res.data;
}

export async function logoutUser() {
  const res = await api.post(
    `${API_URL}/auth/logout`,
    {},
    {
      withCredentials: true,
    },
  );

  return res.data;
}

export async function refreshAccessToken(userId: string) {
  const res = await axios.post(
    `${API_URL}/auth/refresh`,
    { userId },
    {
      withCredentials: true,
    },
  );

  return res.data;
}

export async function getUserProfile() {
  const res = await api.get(`${API_URL}/users/me`);
  return res.data;
}
