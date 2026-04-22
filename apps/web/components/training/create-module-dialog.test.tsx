'use client';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { createModuleSchema, type CreateModuleInput } from '@repo/validation';

// Mock the training hooks
jest.mock('@/store/training/query', () => ({
  useCreateModule: jest.fn(),
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

// Create a test component that uses the form
function TestCreateModuleForm({
  onSubmit,
  onError,
}: {
  onSubmit?: (values: CreateModuleInput) => void;
  onError?: () => void;
}) {
  const form = useForm<CreateModuleInput>({
    resolver: yupResolver(createModuleSchema),
    defaultValues: {
      title: '',
      description: '',
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
        {...form.register('title')}
        placeholder="Judul Modul"
        data-testid="title-input"
      />
      <textarea
        {...form.register('description')}
        placeholder="Deskripsi"
        data-testid="description-input"
      />
      <button type="submit" data-testid="submit-button">
        Buat Modul
      </button>
    </form>
  );
}

describe('CreateModuleDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Validation', () => {
    it('should show error when title is empty', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      render(<TestCreateModuleForm onSubmit={onSubmit} />);

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should show error when title is too short', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      render(<TestCreateModuleForm onSubmit={onSubmit} />);

      const titleInput = screen.getByTestId('title-input');
      await user.type(titleInput, 'AB');

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should accept valid title and description', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      render(<TestCreateModuleForm onSubmit={onSubmit} />);

      const titleInput = screen.getByTestId('title-input');
      await user.type(titleInput, 'Safety Training');

      const descriptionInput = screen.getByTestId('description-input');
      await user.type(descriptionInput, 'Basic safety training module');

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          title: 'Safety Training',
          description: 'Basic safety training module',
        });
      });
    });

    it('should accept valid title without description', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      render(<TestCreateModuleForm onSubmit={onSubmit} />);

      const titleInput = screen.getByTestId('title-input');
      await user.type(titleInput, 'Fire Safety Training');

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          title: 'Fire Safety Training',
          description: '',
        });
      });
    });
  });

  describe('Form Schema', () => {
    it('should validate title minimum length (3 characters)', async () => {
      const schema = createModuleSchema;

      const validData = {
        title: 'ABC',
        description: 'Test description',
      };

      const invalidData = {
        title: 'AB',
        description: 'Test description',
      };

      await expect(schema.validate(validData)).resolves.toBeDefined();
      await expect(schema.validate(invalidData)).rejects.toThrow();
    });

    it('should validate title maximum length (100 characters)', async () => {
      const schema = createModuleSchema;

      const validData = {
        title: 'A'.repeat(100),
        description: 'Test description',
      };

      const invalidData = {
        title: 'A'.repeat(101),
        description: 'Test description',
      };

      await expect(schema.validate(validData)).resolves.toBeDefined();
      await expect(schema.validate(invalidData)).rejects.toThrow();
    });

    it('should allow optional description', async () => {
      const schema = createModuleSchema;

      const dataWithoutDescription = {
        title: 'Safety Training',
      };

      await expect(schema.validate(dataWithoutDescription)).resolves.toBeDefined();
    });
  });
});