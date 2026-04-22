import * as yup from 'yup';

// ─── Form Schemas ───────────────────────────────────────────────────────────

export const questionSchema = yup.object({
  question: yup.string().optional(),
  options: yup
    .array()
    .of(yup.string().required('Opsi tidak boleh kosong'))
    .min(2, 'Minimal harus ada 2 opsi')
    .required(),
  correctAnswer: yup.string().required('Jawaban benar wajib dipilih'),
});

export type QuestionFormValues = yup.InferType<typeof questionSchema>;
