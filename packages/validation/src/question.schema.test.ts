import { createQuestionSchema } from './question.schema';

describe('createQuestionSchema', () => {
  const validQuestionData = {
    examId: '550e8400-e29b-41d4-a716-446655440000',
    question: 'This is a valid question with at least 10 characters',
    options: ['Option A', 'Option B', 'Option C'],
    correctAnswer: 'Option A',
  };

  describe('valid inputs', () => {
    it('should validate correct input with all required fields', async () => {
      await expect(createQuestionSchema.validate(validQuestionData)).resolves.toBeDefined();
    });

    it('should validate with exactly 2 options', async () => {
      const data = {
        ...validQuestionData,
        options: ['Option A', 'Option B'],
      };
      await expect(createQuestionSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate with correctAnswer as first option', async () => {
      const data = {
        ...validQuestionData,
        correctAnswer: validQuestionData.options[0],
      };
      await expect(createQuestionSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate with correctAnswer as last option', async () => {
      const data = {
        ...validQuestionData,
        correctAnswer: validQuestionData.options[validQuestionData.options.length - 1],
      };
      await expect(createQuestionSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate question with exactly 10 characters', async () => {
      const data = {
        ...validQuestionData,
        question: '1234567890',
      };
      await expect(createQuestionSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate options with single character strings', async () => {
      const data = {
        ...validQuestionData,
        options: ['A', 'B', 'C'],
        correctAnswer: 'A',
      };
      await expect(createQuestionSchema.validate(data)).resolves.toBeDefined();
    });
  });

  describe('examId validation', () => {
    it('should fail when examId is missing', async () => {
      const data = { ...validQuestionData };
      delete (data as Partial<typeof data>).examId;
      await expect(createQuestionSchema.validate(data)).rejects.toThrow('examId is required');
    });

    it('should fail when examId is not a valid UUID', async () => {
      const data = { ...validQuestionData, examId: 'not-a-valid-uuid' };
      await expect(createQuestionSchema.validate(data)).rejects.toThrow('examId must be a valid UUID');
    });

    it('should fail when examId is an empty string', async () => {
      const data = { ...validQuestionData, examId: '' };
      await expect(createQuestionSchema.validate(data)).rejects.toThrow('examId must be a valid UUID');
    });
  });

  describe('question validation', () => {
    it('should fail when question is missing', async () => {
      const data = { ...validQuestionData };
      delete (data as Partial<typeof data>).question;
      await expect(createQuestionSchema.validate(data)).rejects.toThrow('Question is required');
    });

    it('should fail when question has less than 10 characters', async () => {
      const data = { ...validQuestionData, question: 'Short' };
      await expect(createQuestionSchema.validate(data)).rejects.toThrow('Question must be at least 10 characters');
    });

    it('should fail when question is an empty string', async () => {
      const data = { ...validQuestionData, question: '' };
      await expect(createQuestionSchema.validate(data)).rejects.toThrow('Question must be at least 10 characters');
    });

    it('should fail when question has exactly 9 characters', async () => {
      const data = { ...validQuestionData, question: '123456789' };
      await expect(createQuestionSchema.validate(data)).rejects.toThrow('Question must be at least 10 characters');
    });
  });

  describe('options validation', () => {
    it('should fail when options is missing', async () => {
      const data = { ...validQuestionData };
      delete (data as Partial<typeof data>).options;
      await expect(createQuestionSchema.validate(data)).rejects.toThrow('Options are required');
    });

    it('should fail when options has less than 2 items', async () => {
      const data = { ...validQuestionData, options: ['Only One'] };
      // Note: correctAnswer test runs first in Yup's validation order
      await expect(createQuestionSchema.validate(data)).rejects.toThrow();
    });

    it('should fail when options is an empty array', async () => {
      const data = { ...validQuestionData, options: [] };
      // Note: correctAnswer test runs first in Yup's validation order
      await expect(createQuestionSchema.validate(data)).rejects.toThrow();
    });

    it('should fail when options contains empty strings', async () => {
      const data = { ...validQuestionData, options: ['Option A', ''] };
      await expect(createQuestionSchema.validate(data)).rejects.toThrow('Each option must be at least 1 character');
    });
  });

  describe('correctAnswer validation', () => {
    it('should fail when correctAnswer is missing', async () => {
      const data = { ...validQuestionData };
      delete (data as Partial<typeof data>).correctAnswer;
      await expect(createQuestionSchema.validate(data)).rejects.toThrow('Correct answer is required');
    });

    it('should fail when correctAnswer is not in options', async () => {
      const data = { ...validQuestionData, correctAnswer: 'Not An Option' };
      await expect(createQuestionSchema.validate(data)).rejects.toThrow('Correct answer must be one of the options');
    });

    it('should fail when correctAnswer is an empty string', async () => {
      const data = { ...validQuestionData, correctAnswer: '' };
      await expect(createQuestionSchema.validate(data)).rejects.toThrow('Correct answer is required');
    });

    it('should fail when correctAnswer is case-sensitive mismatch', async () => {
      const data = { ...validQuestionData, correctAnswer: 'option a' };
      await expect(createQuestionSchema.validate(data)).rejects.toThrow('Correct answer must be one of the options');
    });
  });
});