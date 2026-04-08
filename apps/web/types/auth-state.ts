export type AuthState = {
  token: string;
  role: "admin" | "superadmin" | "unit" | "user";
  isUpt: boolean;
  ultg: string | null;
};
