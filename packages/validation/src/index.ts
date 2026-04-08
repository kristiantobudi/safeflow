import * as yup from 'yup';

export const loginSchema = yup.object({
  email: yup.string().email('Invalid email address'),
  password: yup.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = yup.InferType<typeof loginSchema>;

export const registerSchema = yup.object({
  email: yup.string().email('Invalid email address'),
  password: yup.string().min(6, 'Password must be at least 6 characters'),
  username: yup.string().min(3, 'Username must be at least 3 characters'),
});

export type RegisterInput = yup.InferType<typeof registerSchema>;
