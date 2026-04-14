export type AuthState = {
  token: string;
  id: string;
  role: 'ADMIN' | 'UNIT' | 'USER' | 'admin' | 'superadmin' | 'unit' | 'user';
  email: string;
  avatarUrl: string;
  name: string;
};
