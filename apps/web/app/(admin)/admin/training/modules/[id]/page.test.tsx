'use client';

import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import ModuleDetailPage from './page';

// Mock the training hooks
jest.mock('@/store/training/query', () => ({
  useModule: jest.fn(),
  useUploadModuleFile: jest.fn(),
  useDeleteModuleFile: jest.fn(),
  useCreateExam: jest.fn(),
  useCreateQuestion: jest.fn(),
  useUpdateQuestion: jest.fn(),
  useDeleteQuestion: jest.fn(),
}));

// Mock Next.js router and params
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock Sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock window.URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:http://localhost/mock-url');
global.URL.revokeObjectURL = jest.fn();

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

describe('ModuleDetailPage', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockModuleDetail = {
    id: 'module-1',
    title: 'Safety Training',
    description: 'Basic safety training module for all employees',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    creator: {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    },
    files: [
      {
        id: 'file-1',
        moduleId: 'module-1',
        filename: 'safety-guide.pdf',
        url: 'https://minio.example.com/safety-guide.pdf',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      },
      {
        id: 'file-2',
        moduleId: 'module-1',
        filename: 'training-video.mp4',
        url: 'https://minio.example.com/training-video.mp4',
        createdAt: '2024-01-16T10:00:00Z',
        updatedAt: '2024-01-16T10:00:00Z',
      },
    ],
    exam: {
      id: 'exam-1',
      moduleId: 'module-1',
      duration: 30,
      maxAttempts: 3,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      module: {
        id: 'module-1',
        title: 'Safety Training',
        description: 'Basic safety training',
      },
      question: [
        {
          id: 'q-1',
          examId: 'exam-1',
          question: 'What is the first step in fire safety?',
          options: ['Stop', 'Alert', 'Evacuate', 'All of the above'],
          correctAnswer: 'Stop',
          isDeleted: false,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
        },
        {
          id: 'q-2',
          examId: 'exam-1',
          question: 'What should you do when you see a hazard?',
          options: ['Ignore it', 'Report it', 'Fix it yourself', 'Wait for someone else'],
          correctAnswer: 'Report it',
          isDeleted: false,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
        },
      ],
      creator: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue({ id: 'module-1' });
  });

  describe('Loading State', () => {
    it('should show skeleton loading state when data is loading', () => {
      const { useModule } = require('@/store/training/query');
      (useModule as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
      });

      render(<ModuleDetailPage />, { wrapper: createWrapper() });

      expect(screen.getByTestId('module-detail-skeleton')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error state when module is not found', () => {
      const { useModule } = require('@/store/training/query');
      (useModule as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
      });

      render(<ModuleDetailPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/modul tidak ditemukan/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /kembali ke daftar/i })).toBeInTheDocument();
    });
  });

  describe('Module Detail Display', () => {
    it('should display module information correctly', () => {
      const { useModule } = require('@/store/training/query');
      (useModule as jest.Mock).mockReturnValue({
        data: mockModuleDetail,
        isLoading: false,
        isError: false,
      });

      render(<ModuleDetailPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Safety Training')).toBeInTheDocument();
      expect(screen.getByText('Basic safety training module for all employees')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display module creator information', () => {
      const { useModule } = require('@/store/training/query');
      (useModule as jest.Mock).mockReturnValue({
        data: mockModuleDetail,
        isLoading: false,
        isError: false,
      });

      render(<ModuleDetailPage />, { wrapper: createWrapper() });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should display module ID badge', () => {
      const { useModule } = require('@/store/training/query');
      (useModule as jest.Mock).mockReturnValue({
        data: mockModuleDetail,
        isLoading: false,
        isError: false,
      });

      render(<ModuleDetailPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/id: module-1/i)).toBeInTheDocument();
    });
  });

  describe('File Upload Section', () => {
    it('should display uploaded files', () => {
      const { useModule } = require('@/store/training/query');
      (useModule as jest.Mock).mockReturnValue({
        data: mockModuleDetail,
        isLoading: false,
        isError: false,
      });

      render(<ModuleDetailPage />, { wrapper: createWrapper() });

      expect(screen.getByText('safety-guide.pdf')).toBeInTheDocument();
      expect(screen.getByText('training-video.mp4')).toBeInTheDocument();
    });

    it('should show empty state when no files exist', () => {
      const { useModule } = require('@/store/training/query');
      (useModule as jest.Mock).mockReturnValue({
        data: { ...mockModuleDetail, files: [] },
        isLoading: false,
        isError: false,
      });

      render(<ModuleDetailPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/belum ada file materi/i)).toBeInTheDocument();
    });

    it('should show file count badge', () => {
      const { useModule } = require('@/store/training/query');
      (useModule as jest.Mock).mockReturnValue({
        data: mockModuleDetail,
        isLoading: false,
        isError: false,
      });

      render(<ModuleDetailPage />, { wrapper: createWrapper() });

      expect(screen.getByText('2 File')).toBeInTheDocument();
    });
  });

  describe('Exam Section', () => {
    it('should display exam information when exam exists', () => {
      const { useModule } = require('@/store/training/query');
      (useModule as jest.Mock).mockReturnValue({
        data: mockModuleDetail,
        isLoading: false,
        isError: false,
      });

      render(<ModuleDetailPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Ujian & Soal')).toBeInTheDocument();
      expect(screen.getByText('Ujian Aktif')).toBeInTheDocument();
      expect(screen.getByText('30 menit')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should show empty state when no exam exists', () => {
      const { useModule } = require('@/store/training/query');
      (useModule as jest.Mock).mockReturnValue({
        data: { ...mockModuleDetail, exam: null },
        isLoading: false,
        isError: false,
      });

      render(<ModuleDetailPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/modul ini belum memiliki ujian/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /buat exam/i })).toBeInTheDocument();
    });
  });

  describe('Question List', () => {
    it('should display all questions', () => {
      const { useModule } = require('@/store/training/query');
      (useModule as jest.Mock).mockReturnValue({
        data: mockModuleDetail,
        isLoading: false,
        isError: false,
      });

      render(<ModuleDetailPage />, { wrapper: createWrapper() });

      expect(screen.getByText('What is the first step in fire safety?')).toBeInTheDocument();
      expect(screen.getByText('What should you do when you see a hazard?')).toBeInTheDocument();
    });

    it('should highlight correct answer', () => {
      const { useModule } = require('@/store/training/query');
      (useModule as jest.Mock).mockReturnValue({
        data: mockModuleDetail,
        isLoading: false,
        isError: false,
      });

      render(<ModuleDetailPage />, { wrapper: createWrapper() });

      const correctAnswer = screen.getByText('Stop');
      expect(correctAnswer).toHaveClass('text-emerald-600');
    });

    it('should show question count', () => {
      const { useModule } = require('@/store/training/query');
      (useModule as jest.Mock).mockReturnValue({
        data: mockModuleDetail,
        isLoading: false,
        isError: false,
      });

      render(<ModuleDetailPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Jumlah Soal: 2')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate back to module list', async () => {
      const user = userEvent.setup();
      const { useModule } = require('@/store/training/query');
      (useModule as jest.Mock).mockReturnValue({
        data: mockModuleDetail,
        isLoading: false,
        isError: false,
      });

      render(<ModuleDetailPage />, { wrapper: createWrapper() });

      const backButton = screen.getByRole('button', { name: /daftar modul/i });
      await user.click(backButton);

      expect(mockRouter.push).toHaveBeenCalledWith('/admin/training/modules');
    });
  });
});