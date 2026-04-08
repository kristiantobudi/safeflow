import { AuthState } from '@/types/auth-state';
import { useQueryClient } from '@tanstack/react-query';

export function useAuth() {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<AuthState>(['auth']);
}
