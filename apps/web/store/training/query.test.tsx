/**
 * @jest-environment jsdom
 */
'use client';

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useModuleList,
  useModule,
  useExam,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
  useUploadModuleFile,
  useDeleteModuleFile,
  useCreateExam,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  trainingKeys,
} from './query';
import { trainingService } from '@/lib/services/training';
import { toast } from 'sonner';

// Mock the trainingService
jest.mock('@/lib/services/training', () => ({
  trainingService: {
    getModuleList: jest.fn(),
    getModuleById: jest.fn(),
    createModule: jest.fn(),
    updateModule: jest.fn(),
    deleteModule: jest.fn(),
    uploadModuleFile: jest.fn(),
    deleteModuleFile: jest.fn(),
    createExam: jest.fn(),
    getExamById: jest.fn(),
    createQuestion: jest.fn(),
    updateQuestion: jest.fn(),
    deleteQuestion: jest.fn(),
  },
}));

// Mock Sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Create a wrapper for React Query hooks
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

describe('Training Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useModuleList', () => {
    const mockModuleList = {
      data: [
        {
          id: 'module-1',
          title: 'Safety Training',
          description: 'Basic safety training',
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
          creator: {
            id: 'user-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
          _count: {
            files: 2,
            exam: 1,
            question: 5,
          },
        },
      ],
    };

    it('should fetch module list successfully', async () => {
      (trainingService.getModuleList as jest.Mock).mockResolvedValue(mockModuleList);

      const { result } = renderHook(() => useModuleList(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockModuleList);
      });
    });

    it('should handle error when fetching list fails', async () => {
      const error = new Error('Network Error');
      (trainingService.getModuleList as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useModuleList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(error);
      });
    });
  });

  describe('useModule', () => {
    const mockModuleDetail = {
      id: 'module-1',
      title: 'Safety Training',
      description: 'Basic safety training',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      creator: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
      files: [],
      exam: null,
      question: [],
    };

    it('should fetch module detail successfully', async () => {
      (trainingService.getModuleById as jest.Mock).mockResolvedValue(mockModuleDetail);

      const { result } = renderHook(() => useModule('module-1'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockModuleDetail);
      });
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useModule(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(trainingService.getModuleById).not.toHaveBeenCalled();
    });

    it('should handle error when fetching detail fails', async () => {
      const error = new Error('Network Error');
      (trainingService.getModuleById as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useModule('module-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(error);
      });
    });
  });

  describe('useExam', () => {
    const mockExamDetail = {
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
      question: [],
      creator: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
    };

    it('should fetch exam detail successfully', async () => {
      (trainingService.getExamById as jest.Mock).mockResolvedValue(mockExamDetail);

      const { result } = renderHook(() => useExam('exam-1'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockExamDetail);
      });
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useExam(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(trainingService.getExamById).not.toHaveBeenCalled();
    });

    it('should handle error when fetching exam fails', async () => {
      const error = new Error('Network Error');
      (trainingService.getExamById as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useExam('exam-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(error);
      });
    });
  });

  describe('useCreateModule', () => {
    const mockModuleDetail = {
      id: 'module-1',
      title: 'Safety Training',
      description: 'Basic safety training',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      creator: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
      files: [],
      exam: null,
      question: [],
    };

    it('should create module successfully', async () => {
      (trainingService.createModule as jest.Mock).mockResolvedValue(mockModuleDetail);

      const { result } = renderHook(() => useCreateModule(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ title: 'Safety Training', description: 'Basic safety training' });

      await waitFor(() => {
        expect(trainingService.createModule).toHaveBeenCalledWith({
          title: 'Safety Training',
          description: 'Basic safety training',
        });
        expect(toast.success).toHaveBeenCalledWith('Modul pelatihan berhasil dibuat');
      });
    });

    it('should handle duplicate title error', async () => {
      const error = {
        response: {
          data: { message: 'Module title already exists' },
        },
      };
      (trainingService.createModule as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateModule(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ title: 'Existing Title' });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Module title already exists');
      });
    });

    it('should handle generic error', async () => {
      const error = {
        response: {
          data: { message: 'Gagal membuat modul pelatihan' },
        },
      };
      (trainingService.createModule as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateModule(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ title: 'Test' });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Gagal membuat modul pelatihan');
      });
    });
  });

  describe('useUpdateModule', () => {
    const mockModuleDetail = {
      id: 'module-1',
      title: 'Updated Training',
      description: 'Updated description',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-16T10:00:00Z',
      creator: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
      files: [],
      exam: null,
      question: [],
    };

    it('should update module successfully', async () => {
      (trainingService.updateModule as jest.Mock).mockResolvedValue(mockModuleDetail);

      const { result } = renderHook(() => useUpdateModule('module-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ title: 'Updated Training' });

      await waitFor(() => {
        expect(trainingService.updateModule).toHaveBeenCalledWith('module-1', {
          title: 'Updated Training',
        });
        expect(toast.success).toHaveBeenCalledWith('Modul pelatihan berhasil diperbarui');
      });
    });

    it('should handle update error', async () => {
      const error = {
        response: {
          data: { message: 'Gagal memperbarui modul pelatihan' },
        },
      };
      (trainingService.updateModule as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateModule('module-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ title: 'Test' });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Gagal memperbarui modul pelatihan');
      });
    });
  });

  describe('useDeleteModule', () => {
    it('should delete module successfully', async () => {
      (trainingService.deleteModule as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useDeleteModule(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('module-1');

      await waitFor(() => {
        expect(trainingService.deleteModule).toHaveBeenCalledWith('module-1');
        expect(toast.success).toHaveBeenCalledWith('Modul pelatihan berhasil dihapus');
      });
    });

    it('should handle delete error', async () => {
      const error = {
        response: {
          data: { message: 'Gagal menghapus modul pelatihan' },
        },
      };
      (trainingService.deleteModule as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteModule(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('module-1');

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Gagal menghapus modul pelatihan');
      });
    });
  });

  describe('useUploadModuleFile', () => {
    it('should upload file successfully', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const mockFileResponse = {
        id: 'file-1',
        moduleId: 'module-1',
        filename: 'test.pdf',
        url: 'https://minio.example.com/test.pdf',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      };
      (trainingService.uploadModuleFile as jest.Mock).mockResolvedValue(mockFileResponse);

      const { result } = renderHook(() => useUploadModuleFile('module-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate(mockFile);

      await waitFor(() => {
        expect(trainingService.uploadModuleFile).toHaveBeenCalledWith('module-1', mockFile);
        expect(toast.success).toHaveBeenCalledWith('File berhasil diunggah');
      });
    });

    it('should handle upload error', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const error = {
        response: {
          data: { message: 'Gagal mengunggah file' },
        },
      };
      (trainingService.uploadModuleFile as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useUploadModuleFile('module-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate(mockFile);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Gagal mengunggah file');
      });
    });
  });

  describe('useDeleteModuleFile', () => {
    it('should delete file successfully', async () => {
      (trainingService.deleteModuleFile as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useDeleteModuleFile('module-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate('file-1');

      await waitFor(() => {
        expect(trainingService.deleteModuleFile).toHaveBeenCalledWith('module-1', 'file-1');
        expect(toast.success).toHaveBeenCalledWith('File berhasil dihapus');
      });
    });

    it('should handle file delete error', async () => {
      const error = {
        response: {
          data: { message: 'Gagal menghapus file' },
        },
      };
      (trainingService.deleteModuleFile as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteModuleFile('module-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate('file-1');

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Gagal menghapus file');
      });
    });
  });

  describe('useCreateExam', () => {
    const mockExamDetail = {
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
      question: [],
      creator: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
    };

    it('should create exam successfully', async () => {
      (trainingService.createExam as jest.Mock).mockResolvedValue(mockExamDetail);

      const { result } = renderHook(() => useCreateExam(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ moduleId: 'module-1', duration: 30, maxAttempts: 3 });

      await waitFor(() => {
        expect(trainingService.createExam).toHaveBeenCalledWith({
          moduleId: 'module-1',
          duration: 30,
          maxAttempts: 3,
        });
        expect(toast.success).toHaveBeenCalledWith('Ujian berhasil dibuat');
      });
    });

    it('should handle exam creation error', async () => {
      const error = {
        response: {
          data: { message: 'Gagal membuat ujian' },
        },
      };
      (trainingService.createExam as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateExam(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ moduleId: 'module-1', duration: 30 });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Gagal membuat ujian');
      });
    });
  });

  describe('useCreateQuestion', () => {
    const mockQuestionDetail = {
      id: 'q-1',
      examId: 'exam-1',
      question: 'What is fire?',
      options: ['Hot stuff', 'Flame', 'Fire', 'All of the above'],
      correctAnswer: 'All of the above',
      isDeleted: false,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    };

    it('should create question successfully', async () => {
      (trainingService.createQuestion as jest.Mock).mockResolvedValue(mockQuestionDetail);

      const { result } = renderHook(() => useCreateQuestion(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        examId: 'exam-1',
        question: 'What is fire?',
        options: ['Hot stuff', 'Flame', 'Fire', 'All of the above'],
        correctAnswer: 'All of the above',
      });

      await waitFor(() => {
        expect(trainingService.createQuestion).toHaveBeenCalledWith({
          examId: 'exam-1',
          question: 'What is fire?',
          options: ['Hot stuff', 'Flame', 'Fire', 'All of the above'],
          correctAnswer: 'All of the above',
        });
        expect(toast.success).toHaveBeenCalledWith('Pertanyaan berhasil dibuat');
      });
    });

    it('should handle question creation error', async () => {
      const error = {
        response: {
          data: { message: 'Gagal membuat pertanyaan' },
        },
      };
      (trainingService.createQuestion as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateQuestion(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        question: 'Test question',
        options: ['A', 'B'],
        correctAnswer: 'A',
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Gagal membuat pertanyaan');
      });
    });
  });

  describe('useUpdateQuestion', () => {
    const mockQuestionDetail = {
      id: 'q-1',
      examId: 'exam-1',
      question: 'Updated question',
      options: ['A', 'B', 'C'],
      correctAnswer: 'A',
      isDeleted: false,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-16T10:00:00Z',
    };

    it('should update question successfully', async () => {
      (trainingService.updateQuestion as jest.Mock).mockResolvedValue(mockQuestionDetail);

      const { result } = renderHook(() => useUpdateQuestion('q-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ question: 'Updated question' });

      await waitFor(() => {
        expect(trainingService.updateQuestion).toHaveBeenCalledWith('q-1', {
          question: 'Updated question',
        });
        expect(toast.success).toHaveBeenCalledWith('Pertanyaan berhasil diperbarui');
      });
    });

    it('should handle question update error', async () => {
      const error = {
        response: {
          data: { message: 'Gagal memperbarui pertanyaan' },
        },
      };
      (trainingService.updateQuestion as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateQuestion('q-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ question: 'Test' });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Gagal memperbarui pertanyaan');
      });
    });
  });

  describe('useDeleteQuestion', () => {
    it('should delete question successfully', async () => {
      (trainingService.deleteQuestion as jest.Mock).mockResolvedValue({ id: 'q-1' });

      const { result } = renderHook(() => useDeleteQuestion(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('q-1');

      await waitFor(() => {
        expect(trainingService.deleteQuestion).toHaveBeenCalledWith('q-1');
        expect(toast.success).toHaveBeenCalledWith('Pertanyaan berhasil dihapus');
      });
    });

    it('should handle question delete error', async () => {
      const error = {
        response: {
          data: { message: 'Gagal menghapus pertanyaan' },
        },
      };
      (trainingService.deleteQuestion as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteQuestion(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('q-1');

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Gagal menghapus pertanyaan');
      });
    });
  });

  describe('trainingKeys', () => {
    it('should have correct query key structure', () => {
      expect(trainingKeys.all).toEqual(['training']);
      expect(trainingKeys.modules.all).toEqual(['training', 'modules']);
      expect(trainingKeys.modules.lists()).toEqual(['training', 'modules', 'list']);
      expect(trainingKeys.modules.details('module-1')).toEqual(['training', 'modules', 'module-1']);
      expect(trainingKeys.modules.files('module-1')).toEqual(['training', 'modules', 'module-1', 'files']);
      expect(trainingKeys.exams.all).toEqual(['training', 'exams']);
      expect(trainingKeys.exams.details('exam-1')).toEqual(['training', 'exams', 'exam-1']);
      expect(trainingKeys.questions.all).toEqual(['training', 'questions']);
      expect(trainingKeys.questions.details('q-1')).toEqual(['training', 'questions', 'q-1']);
      expect(trainingKeys.questions.byExam('exam-1')).toEqual(['training', 'questions', 'exam', 'exam-1']);
    });
  });
});