'use client';

import { useQuery } from '@tanstack/react-query';
import { getUserProfile } from '@/lib/services/auth-services';
import { AuthState } from '@/types/auth-state';
import { getCookie } from 'cookies-next';

export function useAuthQuery() {
  const token = getCookie('token');

  const query = useQuery<AuthState | null>({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await getUserProfile();
      const user = res?.data ?? res;

      if (!user) return null;

      return {
        token: token as string,
        id: user.id,
        role: user.role,
        name: [user.firstName, user.lastName].filter(Boolean).join(' '),
        email: user.email,
        avatarUrl: user.avatarUrl ?? '',
      } satisfies AuthState;
    },
    enabled: !!token,
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });

  return query;
}
