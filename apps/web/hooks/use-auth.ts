import { useAuthQuery } from '@/store/auth/auth-query';

export function useAuth() {
  const { data } = useAuthQuery();
  return data ?? null;
}
