import * as yup from 'yup';

export const createProgramSchema = yup.object({
  name: yup.string().required('Nama program wajib diisi').trim(),
  description: yup.string().optional().trim(),
});

export type CreateProgramInput = yup.InferType<typeof createProgramSchema>;

export const updateProgramSchema = yup.object({
  name: yup.string().optional().trim(),
  description: yup.string().optional().trim(),
  isActive: yup.boolean().optional(),
});

export type UpdateProgramInput = yup.InferType<typeof updateProgramSchema>;

export const addModuleSchema = yup.object({
  moduleId: yup.string().required('Module ID wajib diisi'),
  isRequired: yup.boolean().optional().default(true),
  order: yup.number().typeError('Order harus berupa angka').integer('Order harus bilangan bulat').min(0, 'Order minimal 0').optional().default(0),
});

export type AddModuleInput = yup.InferType<typeof addModuleSchema>;

export const revokeCertificationSchema = yup.object({
  reason: yup.string().required('Alasan pencabutan sertifikasi wajib diisi').trim(),
});

export type RevokeCertificationInput = yup.InferType<typeof revokeCertificationSchema>;
