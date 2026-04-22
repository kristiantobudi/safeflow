import * as yup from 'yup';

export const createModuleSchema = yup.object({
  title: yup
    .string()
    .required('Judul modul wajib diisi')
    .min(3, 'Judul modul minimal 3 karakter')
    .max(100, 'Judul modul maksimal 100 karakter')
    .trim(),
  description: yup.string().optional().trim(),
});

export type CreateModuleInput = yup.InferType<typeof createModuleSchema>;