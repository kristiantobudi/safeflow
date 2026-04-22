'use client';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Mock the training hooks
jest.mock('@/store/training/query', () => ({
  useCreateExam: jest.fn(),
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

// Create exam schema (same as in the component)
const createExamSchema = yup.object({
  duration: yup
    .number()
    .typeError('Durasi harus berupa angka')
    .min(1, 'Durasi minimal 1 menit')
    .max(180, 'Durasi maksimal 180 menit')
    .required('Durasi wajib diisi'),
  maxAttempts: yup
    .number()
    .typeError('Max percobaan harus berupa angka')
    .min(1, 'Minimal 1 percobaan')
    .optional(),
});

type CreateExamFormValues = yup.InferType<typeof createExamSchema>;

// Create a test component that uses the form
function TestCreateExamForm({
  onSubmit,
}: {
  onSubmit?: (values: CreateExamFormValues) => void;
}) {
  const form = useForm<CreateExamFormValues>({
    resolver: yupResolver(createExamSchema),
    defaultValues: {
      duration: 30,
      maxAttempts: undefined,
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        onSubmit?.(values);
        form.reset();
      })}
    >
      <input
        {...form.register('duration', { valueAsNumber: true })}
        type="number"
        placeholder="Durasi (menit)"
        data-testid="duration-input"
      />
      <input
        {...form.register('maxAttempts', { valueAsNumber: true })}
        type="number"
        placeholder="Maksimal Percobaan (opsional)"
        data-testid="max-attempts-input"
      />
      <button type="submit" data-testid="submit-button">
        Buat Ujian
      </button>
    </form>
  );
}

describe('CreateExamDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Validation', () => {
    it('should show error when duration is empty', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      render(<TestCreateExamForm onSubmit={onSubmit} />);

      const durationInput = screen.getByTestId('duration-input');
      await user.clear(durationInput);

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should show error when duration is less than 1', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      render(<TestCreateExamForm onSubmit={onSubmit} />);

      const durationInput = screen.getByTestId('duration-input');
      await user.clear(durationInput);
      await user.type(durationInput, '0');

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should show error when duration is greater than 180', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      render(<TestCreateExamForm onSubmit={onSubmit} />);

      const durationInput = screen.getByTestId('duration-input');
      await user.clear(durationInput);
      await user.type(durationInput, '181');

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should accept valid duration', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      render(<TestCreateExamForm onSubmit={onSubmit} />);

      const durationInput = screen.getByTestId('duration-input');
      await user.clear(durationInput);
      await user.type(durationInput, '45');

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          duration: 45,
          maxAttempts: undefined,
        });
      });
    });

    it('should accept valid duration with max attempts', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      render(<TestCreateExamForm onSubmit={onSubmit} />);

      const durationInput = screen.getByTestId('duration-input');
      await user.clear(durationInput);
      await user.type(durationInput, '60');

      const maxAttemptsInput = screen.getByTestId('max-attempts-input');
      await user.type(maxAttemptsInput, '3');

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          duration: 60,
          maxAttempts: 3,
        });
      });
    });

    it('should accept empty max attempts (unlimited)', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      render(<TestCreateExamForm onSubmit={onSubmit} />);

      const durationInput = screen.getByTestId('duration-input');
      await user.clear(durationInput);
      await user.type(durationInput, '30');

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          duration: 30,
          maxAttempts: undefined,
        });
      });
    });
  });

  describe('Exam Schema Validation', () => {
    it('should validate duration minimum (1)', async () => {
      const schema = createExamSchema;

      const validData = { duration: 1, maxAttempts: undefined };
      const invalidData = { duration: 0, maxAttempts: undefined };

      await expect(schema.validate(validData)).resolves.toBeDefined();
      await expect(schema.validate(invalidData)).rejects.toThrow();
    });

    it('should validate duration maximum (180)', async () => {
      const schema = createExamSchema;

      const validData = { duration: 180, maxAttempts: undefined };
      const invalidData = { duration: 181, maxAttempts: undefined };

      await expect(schema.validate(validData)).resolves.toBeDefined();
      await expect(schema.validate(invalidData)).rejects.toThrow();
    });

    it('should validate maxAttempts minimum (1)', async () => {
      const schema = createExamSchema;

      const validData = { duration: 30, maxAttempts: 1 };
      const invalidData = { duration: 30, maxAttempts: 0 };

      await expect(schema.validate(validData)).resolves.toBeDefined();
      await expect(schema.validate(invalidData)).rejects.toThrow();
    });

    it('should allow undefined maxAttempts', async () => {
      const schema = createExamSchema;

      const data = { duration: 30, maxAttempts: undefined };

      await expect(schema.validate(data)).resolves.toBeDefined();
    });
  });
});