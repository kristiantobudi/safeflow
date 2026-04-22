import * as yup from 'yup';

export const createJsaSchema = yup.object({
  jenisKegiatan: yup
    .string()
    .required('Jenis kegiatan wajib diisi')
    .min(3, 'Jenis kegiatan minimal 3 karakter')
    .trim(),
  lokasiKegiatan: yup.string().optional().trim(),
  tanggalDibuat: yup.date().optional().nullable(),
  referensiHirarc: yup.string().optional().trim(),
  pelaksanaUtama: yup.string().optional().trim(),
  hseInCharge: yup.string().optional().trim(),
  apd: yup
    .object({
      safetyHelmet: yup.boolean().optional().default(false),
      safetyShoes: yup.boolean().optional().default(false),
      gloves: yup.boolean().optional().default(false),
      safetyGlasses: yup.boolean().optional().default(false),
      safetyVest: yup.boolean().optional().default(false),
      safetyBodyHarness: yup.boolean().optional().default(false),
      lainnya: yup.string().optional().trim(),
    })
    .optional(),
});

export type CreateJsaInput = yup.InferType<typeof createJsaSchema>;