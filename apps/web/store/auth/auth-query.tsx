'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserProfile } from '@/lib/services/auth-services';
import { AuthState } from '@/types/auth-state';
import { getCookie } from 'cookies-next';
import { useEffect } from 'react';

export function useAuthQuery() {
  const queryClient = useQueryClient();
  const token = getCookie('token');

  const query = useQuery({
    queryKey: ['auth-me'],
    queryFn: getUserProfile,
    enabled: !!token, // Only run if we have a token cookie
    retry: 1,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (query.data?.data) {
      const user = query.data.data;
      
      // Update the global ['auth'] query data that other components use
      queryClient.setQueryData<AuthState>(['auth'], {
        token: token as string,
        id: user.id,
        role: user.role,
        name: user.firstName + ' ' + (user.lastName ?? ''),
        email: user.email,
        avatarUrl: user.avatarUrl,
      });
    }
  }, [query.data, queryClient, token]);

  return query;
}
