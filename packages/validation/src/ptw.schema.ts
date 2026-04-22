import * as yup from 'yup';

export const createPtwSchema = yup.object({
  judulPekerjaan: yup
    .string()
    .required('Judul pekerjaan wajib diisi')
    .min(3, 'Judul pekerjaan minimal 3 karakter')
    .max(255, 'Judul pekerjaan maksimal 255 karakter')
    .trim(),
  jsaProjectId: yup
    .string()
    .required('JSA terkait wajib dipilih')
    .uuid('ID JSA tidak valid'),
  lokasiPekerjaan: yup.string().optional().trim(),
  tanggalMulai: yup.date().optional().nullable(),
  tanggalSelesai: yup
    .date()
    .optional()
    .nullable()
    .when('tanggalMulai', {
      is: (tanggalMulai: Date | null | undefined) => tanggalMulai != null,
      then: (schema) =>
        schema.min(
          yup.ref('tanggalMulai'),
          'Tanggal selesai harus setelah tanggal mulai',
        ),
    }),
  keteranganTambahan: yup
    .string()
    .optional()
    .max(1000, 'Keterangan maksimal 1000 karakter')
    .trim(),
});

export type CreatePtwInput = yup.InferType<typeof createPtwSchema>;