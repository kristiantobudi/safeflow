import { AuthState } from '@/types/auth-state';
import { ErrorHandling } from '@/lib/error-handling';
import {
  loginUser,
  logoutUser,
  registerUser,
} from '@/lib/services/auth-services';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { deleteCookie, setCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import { CSSProperties } from 'react';
import { toast } from 'sonner';

export default function useAuthMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data, variable) => {
      const authData = data.data;

      queryClient.setQueryData<AuthState>(['auth'], {
        token: authData.accessToken,
        id: authData.user.id,
        role: authData.user.role,
        name: authData.user.firstName + ' ' + (authData.user.lastName ?? ''),
        email: authData.user.email,
        avatarUrl: authData.user.avatarUrl,
      });

      setCookie('userId', authData.user.id);
      setCookie('token', authData.accessToken);

      toast('Login Success', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #22c55e 10%, var(--background))',
          '--normal-text': '#22c55e',
          '--normal-border': '#22c55e',
        } as CSSProperties,
        description: 'You are now logged in as ' + variable.email,
        duration: 5000,
        closeButton: true,
      });

      // if (authData.role === 'admin' || authData.role === 'superadmin') {
      //   router.push('/dashboard');
      // } else {
      //   router.push('/dashboard/');
      // }
    },
    onError: (error: AxiosError<{ message: string }>) => {
      ErrorHandling.handle(error);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: (data, variable) => {
      toast('Logout Success', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #ef4444 10%, var(--background))',
          '--normal-text': '#ef4444',
          '--normal-border': '#ef4444',
        } as CSSProperties,
        description: 'You are now logged out',
        duration: 5000,
        closeButton: true,
      });
      deleteCookie('token');
      deleteCookie('userId');
      deleteCookie('email');
      deleteCookie('role');
      router.push('/auth');
    },
    onError: (error: AxiosError<{ message: string }>) => {
      ErrorHandling.handle(error);
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (data, variable) => {
      toast('Register Success', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #22c55e 10%, var(--background))',
          '--normal-text': '#22c55e',
          '--normal-border': '#22c55e',
        } as CSSProperties,
        description: 'You are now registered as ' + variable.username,
        duration: 5000,
        closeButton: true,
      });
    },
    onError: (error: AxiosError<{ message: string }>) => {
      ErrorHandling.handle(error);
    },
  });

  return {
    loginMutation,
    logoutMutation,
    registerMutation,
  };
}
