import * as yup from 'yup';

export const createQuestionSchema = yup.object({
  examId: yup.string().required('examId is required'),
  question: yup.string().when('imageUrl', {
    is: (val: string) => !val || val.length === 0,
    then: (schema) =>
      schema.min(5, 'Question must be at least 5 characters').required('Question is required when no image is provided'),
    otherwise: (schema) => schema.optional(),
  }),
  imageUrl: yup.string().optional(),
  options: yup
    .array()
    .of(yup.string().min(1, 'Each option must be at least 1 character'))
    .min(2, 'At least 2 options are required')
    .required('Options are required'),
  correctAnswer: yup
    .string()
    .required('Correct answer is required')
    .test(
      'is-in-options',
      'Correct answer must be one of the options',
      function (value) {
        const options = this.parent.options;
        if (!Array.isArray(options)) {
          return true;
        }
        return options.includes(value);
      },
    ),
});

export type CreateQuestionInput = yup.InferType<typeof createQuestionSchema>;
