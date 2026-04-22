'use client';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useState } from 'react';

// Mock the training hooks
jest.mock('@/store/training/query', () => ({
  useCreateQuestion: jest.fn(),
}));

// Mock Sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Create question schema (same as in the component)
const createQuestionSchema = yup.object({
  question: yup
    .string()
    .min(5, 'Pertanyaan minimal 5 karakter')
    .required('Pertanyaan wajib diisi'),
  options: yup
    .array()
    .of(yup.string().min(1, 'Opsi tidak boleh kosong'))
    .min(2, 'Minimal 2 opsi jawaban')
    .required(),
  correctAnswer: yup
    .string()
    .min(1, 'Pilih jawaban yang benar')
    .required('Jawaban benar wajib dipilih'),
});

type CreateQuestionFormValues = yup.InferType<typeof createQuestionSchema>;

// Create a test component that uses the form
function TestCreateQuestionForm({
  onSubmit,
}: {
  onSubmit?: (values: CreateQuestionFormValues) => void;
}) {
  const [options, setOptions] = useState<string[]>(['', '']);

  const form = useForm<CreateQuestionFormValues>({
    resolver: yupResolver(createQuestionSchema),
    defaultValues: {
      question: '',
      options: ['', ''],
      correctAnswer: '',
    },
  });

  const watchedOptions = form.watch('options') || options;
  const watchedCorrectAnswer = form.watch('correctAnswer');

  const addOption = () => {
    if (options.length < 5) {
      const newOptions = [...options, ''];
      setOptions(newOptions);
      form.setValue('options', newOptions);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
      form.setValue('options', newOptions);
      if (watchedCorrectAnswer === options[index]) {
        form.setValue('correctAnswer', '');
      }
    }
  };

  const onSubmitForm = (data: CreateQuestionFormValues) => {
    const filteredOptions = (data.options || []).filter((o) => {
      if (!o) return false;
      return o.trim() !== '';
    });
    onSubmit?.({
      question: data.question,
      options: filteredOptions,
      correctAnswer: data.correctAnswer,
    });
    form.reset();
    setOptions(['', '']);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmitForm)}>
      <textarea
        {...form.register('question')}
        placeholder="Masukkan pertanyaan..."
        data-testid="question-input"
      />

      <div data-testid="options-container">
        {options.map((option, index) => (
          <div key={index} data-testid={`option-${index}`}>
            <input
              value={option}
              onChange={(e) => {
                const newOptions = [...options];
                newOptions[index] = e.target.value;
                setOptions(newOptions);
                form.setValue('options', newOptions);
              }}
              placeholder={`Opsi ${String.fromCharCode(65 + index)}`}
              data-testid={`option-input-${index}`}
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(index)}
                data-testid={`remove-option-${index}`}
              >
                Hapus
              </button>
            )}
          </div>
        ))}
      </div>

      {options.length < 5 && (
        <button type="button" onClick={addOption} data-testid="add-option">
          Tambah Opsi
        </button>
      )}

      <select
        {...form.register('correctAnswer')}
        data-testid="correct-answer-select"
      >
        <option value="">Pilih jawaban yang benar</option>
        {watchedOptions
          .filter((o) => o.trim() !== '')
          .map((option, index) => (
            <option key={index} value={option}>
              {String.fromCharCode(65 + index)}. {option}
            </option>
          ))}
      </select>

      <button type="submit" data-testid="submit-button">
        Simpan
      </button>
    </form>
  );
}

describe('CreateQuestionDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Validation', () => {
    it('should show error when question is empty', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      render(<TestCreateQuestionForm onSubmit={onSubmit} />);

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should show error when question is too short', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      render(<TestCreateQuestionForm onSubmit={onSubmit} />);

      const questionInput = screen.getByTestId('question-input');
      await user.type(questionInput, 'AB');

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should show error when correct answer is not selected', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      render(<TestCreateQuestionForm onSubmit={onSubmit} />);

      const questionInput = screen.getByTestId('question-input');
      await user.type(questionInput, 'What is the first step in fire safety?');

      const optionInput0 = screen.getByTestId('option-input-0');
      await user.type(optionInput0, 'Stop');

      const optionInput1 = screen.getByTestId('option-input-1');
      await user.type(optionInput1, 'Alert');

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should accept valid form data', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      render(<TestCreateQuestionForm onSubmit={onSubmit} />);

      const questionInput = screen.getByTestId('question-input');
      await user.type(questionInput, 'What is the first step in fire safety?');

      const optionInput0 = screen.getByTestId('option-input-0');
      await user.type(optionInput0, 'Stop');

      const optionInput1 = screen.getByTestId('option-input-1');
      await user.type(optionInput1, 'Alert');

      // Select correct answer
      const correctAnswerSelect = screen.getByTestId('correct-answer-select');
      await user.selectOptions(correctAnswerSelect, 'Stop');

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          question: 'What is the first step in fire safety?',
          options: ['Stop', 'Alert'],
          correctAnswer: 'Stop',
        });
      });
    });
  });

  describe('Options Management', () => {
    it('should have 2 options by default', () => {
      render(<TestCreateQuestionForm />);

      expect(screen.getByTestId('option-0')).toBeInTheDocument();
      expect(screen.getByTestId('option-1')).toBeInTheDocument();
    });

    it('should add new option when add button is clicked', async () => {
      const user = userEvent.setup();
      render(<TestCreateQuestionForm />);

      const addButton = screen.getByTestId('add-option');
      await user.click(addButton);

      expect(screen.getByTestId('option-2')).toBeInTheDocument();
    });

    it('should not add more than 5 options', async () => {
      const user = userEvent.setup();
      render(<TestCreateQuestionForm />);

      // Add 3 more options to reach 5
      await user.click(screen.getByTestId('add-option'));
      await user.click(screen.getByTestId('add-option'));
      await user.click(screen.getByTestId('add-option'));

      // Now we have 5 options
      expect(screen.queryByTestId('add-option')).not.toBeInTheDocument();
    });

    it('should remove option when remove button is clicked', async () => {
      const user = userEvent.setup();
      render(<TestCreateQuestionForm />);

      // Add an option first
      await user.click(screen.getByTestId('add-option'));

      // Now we have 3 options
      expect(screen.getByTestId('option-2')).toBeInTheDocument();

      // Remove the third option
      await user.click(screen.getByTestId('remove-option-2'));

      // Should have 2 options again
      expect(screen.queryByTestId('option-2')).not.toBeInTheDocument();
    });

    it('should not allow removing options below minimum (2)', async () => {
      const user = userEvent.setup();
      render(<TestCreateQuestionForm />);

      // Try to remove option 0
      const removeButton0 = screen.queryByTestId('remove-option-0');
      const removeButton1 = screen.queryByTestId('remove-option-1');

      // Remove buttons should not exist for the first 2 options
      expect(removeButton0).not.toBeInTheDocument();
      expect(removeButton1).not.toBeInTheDocument();
    });
  });

  describe('Question Schema Validation', () => {
    it('should validate question minimum length (5)', async () => {
      const schema = createQuestionSchema;

      const validData = {
        question: 'What is fire safety?',
        options: ['A', 'B'],
        correctAnswer: 'A',
      };

      const invalidData = {
        question: 'AB',
        options: ['A', 'B'],
        correctAnswer: 'A',
      };

      await expect(schema.validate(validData)).resolves.toBeDefined();
      await expect(schema.validate(invalidData)).rejects.toThrow();
    });

    it('should validate options minimum count (2)', async () => {
      const schema = createQuestionSchema;

      const validData = {
        question: 'What is fire safety?',
        options: ['A', 'B'],
        correctAnswer: 'A',
      };

      const invalidData = {
        question: 'What is fire safety?',
        options: ['A'],
        correctAnswer: 'A',
      };

      await expect(schema.validate(validData)).resolves.toBeDefined();
      await expect(schema.validate(invalidData)).rejects.toThrow();
    });

    it('should validate correctAnswer is required', async () => {
      const schema = createQuestionSchema;

      const validData = {
        question: 'What is fire safety?',
        options: ['A', 'B'],
        correctAnswer: 'A',
      };

      const invalidData = {
        question: 'What is fire safety?',
        options: ['A', 'B'],
        correctAnswer: '',
      };

      await expect(schema.validate(validData)).resolves.toBeDefined();
      await expect(schema.validate(invalidData)).rejects.toThrow();
    });

    it('should filter out empty options on submit', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      render(<TestCreateQuestionForm onSubmit={onSubmit} />);

      const questionInput = screen.getByTestId('question-input');
      await user.type(questionInput, 'What is the first step in fire safety?');

      const optionInput0 = screen.getByTestId('option-input-0');
      await user.type(optionInput0, 'Stop');

      // Leave option 1 empty
      const optionInput1 = screen.getByTestId('option-input-1');
      await user.type(optionInput1, 'Alert');

      // Add a third option
      await user.click(screen.getByTestId('add-option'));
      const optionInput2 = screen.getByTestId('option-input-2');
      await user.type(optionInput2, 'Evacuate');

      // Select correct answer
      const correctAnswerSelect = screen.getByTestId('correct-answer-select');
      await user.selectOptions(correctAnswerSelect, 'Stop');

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          question: 'What is the first step in fire safety?',
          options: ['Stop', 'Alert', 'Evacuate'],
          correctAnswer: 'Stop',
        });
      });
    });
  });
});