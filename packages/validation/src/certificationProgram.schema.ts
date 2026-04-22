import * as yup from 'yup';

export const createCertificationProgramSchema = yup.object({
  name: yup.string().required('Nama program wajib diisi').trim(),
  description: yup.string().optional().trim(),
  validityDays: yup
    .number()
    .typeError('Validity days harus berupa angka')
    .min(1, 'Validity days minimal 1 hari')
    .optional(),
  moduleIds: yup
    .array()
    .of(yup.string().required())
    .optional()
    .default([]),
});

export type CreateCertificationProgramInput = yup.InferType<
  typeof createCertificationProgramSchema
>;

export const updateCertificationProgramSchema = yup.object({
  name: yup.string().optional().trim(),
  description: yup.string().optional().trim(),
  validityDays: yup
    .number()
    .typeError('Validity days harus berupa angka')
    .min(1, 'Validity days minimal 1 hari')
    .optional(),
  moduleIds: yup.array().of(yup.string().required()).optional(),
});

export type UpdateCertificationProgramInput = yup.InferType<
  typeof updateCertificationProgramSchema
>;

export const assignVendorProgramSchema = yup.object({
  certificationProgramId: yup
    .string()
    .required('Program sertifikasi wajib dipilih'),
});

export type AssignVendorProgramInput = yup.InferType<
  typeof assignVendorProgramSchema
>;

export const assignModulesToProgramSchema = yup.object({
  moduleIds: yup
    .array()
    .of(yup.string().required())
    .min(1, 'Minimal satu modul harus dipilih')
    .required('Daftar modul wajib diisi'),
});

export type AssignModulesToProgramInput = yup.InferType<
  typeof assignModulesToProgramSchema
>;
