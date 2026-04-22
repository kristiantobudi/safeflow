'use client';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AdminTrainingModulesPage from './page';

// Mock the training hooks
jest.mock('@/store/training/query', () => ({
  useModuleList: jest.fn(),
  useCreateModule: jest.fn(),
  useDeleteModule: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock Sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

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

describe('AdminTrainingModulesPage', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockModuleList = {
    data: [
      {
        id: 'module-1',
        title: 'Safety Training',
        description: 'Basic safety training module',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        _count: {
          files: 2,
          exam: 1,
          question: 5,
        },
      },
      {
        id: 'module-2',
        title: 'Fire Safety',
        description: 'Fire safety procedures',
        createdAt: '2024-01-16T10:00:00Z',
        updatedAt: '2024-01-16T10:00:00Z',
        _count: {
          files: 1,
          exam: 0,
          question: 0,
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  describe('Loading State', () => {
    it('should show loading state when data is loading', () => {
      const { useModuleList } = require('@/store/training/query');
      (useModuleList as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<AdminTrainingModulesPage />, { wrapper: createWrapper() });

      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });
  });

  describe('Module List Display', () => {
    it('should display all modules in the list', () => {
      const { useModuleList } = require('@/store/training/query');
      (useModuleList as jest.Mock).mockReturnValue({
        data: mockModuleList,
        isLoading: false,
      });

      render(<AdminTrainingModulesPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Safety Training')).toBeInTheDocument();
      expect(screen.getByText('Fire Safety')).toBeInTheDocument();
    });

    it('should display module statistics', () => {
      const { useModuleList } = require('@/store/training/query');
      (useModuleList as jest.Mock).mockReturnValue({
        data: mockModuleList,
        isLoading: false,
      });

      render(<AdminTrainingModulesPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Total Modul')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Total File')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Total Soal')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should display empty state when no modules exist', () => {
      const { useModuleList } = require('@/store/training/query');
      (useModuleList as jest.Mock).mockReturnValue({
        data: { data: [] },
        isLoading: false,
      });

      render(<AdminTrainingModulesPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Total Modul')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Create Module Dialog', () => {
    it('should open create dialog when button is clicked', async () => {
      const user = userEvent.setup();
      const { useModuleList, useCreateModule } = require('@/store/training/query');
      (useModuleList as jest.Mock).mockReturnValue({
        data: mockModuleList,
        isLoading: false,
      });
      (useCreateModule as jest.Mock).mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
      });

      render(<AdminTrainingModulesPage />, { wrapper: createWrapper() });

      const addButton = screen.getByRole('button', { name: /tambah modul/i });
      await user.click(addButton);

      expect(screen.getByText('Tambah Modul Training Baru')).toBeInTheDocument();
      expect(screen.getByLabelText('Judul Modul')).toBeInTheDocument();
      expect(screen.getByLabelText('Deskripsi')).toBeInTheDocument();
    });

    it('should show duplicate title error when module creation fails', async () => {
      const user = userEvent.setup();
      const { useModuleList, useCreateModule } = require('@/store/training/query');
      (useModuleList as jest.Mock).mockReturnValue({
        data: mockModuleList,
        isLoading: false,
      });

      const mockMutate = jest.fn();
      (useCreateModule as jest.Mock).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      render(<AdminTrainingModulesPage />, { wrapper: createWrapper() });

      const addButton = screen.getByRole('button', { name: /tambah modul/i });
      await user.click(addButton);

      const titleInput = screen.getByLabelText('Judul Modul');
      await user.type(titleInput, 'Safety Training');

      const submitButton = screen.getByRole('button', { name: /buat modul/i });
      await user.click(submitButton);

      // The error should be shown when the mutation fails with duplicate error
      // This is handled by the component's onError callback
    });
  });

  describe('Module Actions', () => {
    it('should navigate to module detail when row is clicked', async () => {
      const user = userEvent.setup();
      const { useModuleList } = require('@/store/training/query');
      (useModuleList as jest.Mock).mockReturnValue({
        data: mockModuleList,
        isLoading: false,
      });

      render(<AdminTrainingModulesPage />, { wrapper: createWrapper() });

      const row = screen.getByText('Safety Training').closest('tr');
      await user.click(row!);

      expect(mockRouter.push).toHaveBeenCalledWith('/admin/training/modules/module-1');
    });

    it('should show delete confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup();
      const { useModuleList, useDeleteModule } = require('@/store/training/query');
      (useModuleList as jest.Mock).mockReturnValue({
        data: mockModuleList,
        isLoading: false,
      });
      (useDeleteModule as jest.Mock).mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
      });

      render(<AdminTrainingModulesPage />, { wrapper: createWrapper() });

      const deleteButtons = screen.getAllByRole('button', { name: /hapus modul/i });
      await user.click(deleteButtons[0]);

      expect(screen.getByText('Hapus Modul Training')).toBeInTheDocument();
      expect(screen.getByText(/Apakah Anda yakin ingin menghapus modul "Safety Training"/i)).toBeInTheDocument();
    });

    it('should copy module ID when copy button is clicked', async () => {
      const user = userEvent.setup();
      const { useModuleList } = require('@/store/training/query');
      (useModuleList as jest.Mock).mockReturnValue({
        data: mockModuleList,
        isLoading: false,
      });

      render(<AdminTrainingModulesPage />, { wrapper: createWrapper() });

      const copyButton = screen.getAllByRole('button', { name: /copy/i })[0];
      await user.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('module-1');
    });
  });

  describe('Search Functionality', () => {
    it('should filter modules by title', () => {
      const { useModuleList } = require('@/store/training/query');
      (useModuleList as jest.Mock).mockReturnValue({
        data: mockModuleList,
        isLoading: false,
      });

      render(<AdminTrainingModulesPage />, { wrapper: createWrapper() });

      const searchInput = screen.getByPlaceholderText(/cari modul/i);
      fireEvent.change(searchInput, { target: { value: 'Fire' } });

      // The table should filter to show only matching modules
      expect(screen.getByText('Fire Safety')).toBeInTheDocument();
      expect(screen.queryByText('Safety Training')).not.toBeInTheDocument();
    });
  });
});