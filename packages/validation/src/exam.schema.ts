import * as yup from 'yup';

export const createExamSchema = yup.object({
  moduleId: yup.string().required('moduleId is required'),
  duration: yup.number().min(1, 'Duration must be at least 1 minute').required('duration is required'),
  maxAttempts: yup.number().min(1, 'maxAttempts must be at least 1').optional(),
});

export type CreateExamInput = yup.InferType<typeof createExamSchema>;