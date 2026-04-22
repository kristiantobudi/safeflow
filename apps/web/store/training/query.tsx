'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trainingService } from '@/lib/services/training';
import { toast } from 'sonner';
import { CreateModuleData } from '@/lib/types/training-types';

// ─── Query Key Factory ─────────────────────────────────────────────────────

export const trainingKeys = {
  all: ['training'] as const,
  modules: {
    all: ['training', 'modules'] as const,
    lists: () => ['training', 'modules', 'list'] as const,
    details: (id: string) => ['training', 'modules', id] as const,
    files: (id: string) => ['training', 'modules', id, 'files'] as const,
  },
  exams: {
    all: () => ['training', 'exams'] as const,
    details: (id: string) => ['training', 'exams', id] as const,
  },
  questions: {
    all: ['training', 'questions'] as const,
    details: (id: string) => ['training', 'questions', id] as const,
    byExam: (examId: string) =>
      ['training', 'questions', 'exam', examId] as const,
  },
};

// ─── Query Hooks ───────────────────────────────────────────────────────────

/**
 * Fetch all training modules.
 * GET /api/v1/modules
 */
export const useModuleList = () => {
  return useQuery({
    queryKey: trainingKeys.modules.lists(),
    queryFn: () => trainingService.getModuleList(),
  });
};

/**
 * Fetch a single module by ID.
 * GET /api/v1/modules/:id
 */
export const useModule = (id: string) => {
  return useQuery({
    queryKey: trainingKeys.modules.details(id),
    queryFn: () => trainingService.getModuleById(id),
    enabled: !!id,
  });
};

/**
 * Fetch exam details with questions.
 * GET /api/v1/exams/:id
 */
export const useExam = (id: string) => {
  return useQuery({
    queryKey: trainingKeys.exams.details(id),
    queryFn: () => trainingService.getExamById(id),
    enabled: !!id,
  });
};

/**
 * Fetch all exams.
 * GET /api/v1/exams
 */
export const useExamList = () => {
  return useQuery({
    queryKey: trainingKeys.exams.all(),
    queryFn: () => trainingService.getExams(),
  });
};

// ─── Module Mutation Hooks ─────────────────────────────────────────────────

/**
 * Create a new training module.
 * POST /api/v1/modules
 */
export const useCreateModule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateModuleData) => trainingService.createModule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.modules.lists() });
      toast.success('Modul pelatihan berhasil dibuat');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err.response?.data?.message || 'Gagal membuat modul pelatihan',
      );
    },
  });
};

/**
 * Update a training module.
 * PATCH /api/v1/modules/:id
 */
export const useUpdateModule = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<CreateModuleData>) =>
      trainingService.updateModule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trainingKeys.modules.details(id),
      });
      toast.success('Modul pelatihan berhasil diperbarui');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err.response?.data?.message || 'Gagal memperbarui modul pelatihan',
      );
    },
  });
};

/**
 * Soft-delete a training module.
 * DELETE /api/v1/modules/:id
 */
export const useDeleteModule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => trainingService.deleteModule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.modules.lists() });
      toast.success('Modul pelatihan berhasil dihapus');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err.response?.data?.message || 'Gagal menghapus modul pelatihan',
      );
    },
  });
};

/**
 * Upload a file to a training module.
 * POST /api/v1/modules/:id/files
 */
export const useUploadModuleFile = (moduleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) =>
      trainingService.uploadModuleFile(moduleId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trainingKeys.modules.details(moduleId),
      });
      toast.success('File berhasil diunggah');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Gagal mengunggah file');
    },
  });
};

/**
 * Delete a file from a training module.
 * DELETE /api/v1/modules/:id/files/:fileId
 */
export const useDeleteModuleFile = (moduleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) =>
      trainingService.deleteModuleFile(moduleId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trainingKeys.modules.details(moduleId),
      });
      toast.success('File berhasil dihapus');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Gagal menghapus file');
    },
  });
};

// ─── Exam Mutation Hooks ───────────────────────────────────────────────────

/**
 * Create a new exam for a module.
 * POST /api/v1/exams
 */
export const useCreateExam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      moduleId: string;
      duration: number;
      maxAttempts?: number;
    }) => trainingService.createExam(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: trainingKeys.modules.details(variables.moduleId),
      });
      toast.success('Ujian berhasil dibuat');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Gagal membuat ujian');
    },
  });
};

// ─── Question Mutation Hooks ───────────────────────────────────────────────

/**
 * Create a new question.
 * POST /api/v1/questions
 */
export const useCreateQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      examId: string;
      question?: string;
      options: string[];
      correctAnswer: string;
      imageUrl?: string;
    }) => trainingService.createQuestion(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: trainingKeys.exams.details(variables.examId),
      });
      toast.success('Pertanyaan berhasil dibuat');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Gagal membuat pertanyaan');
    },
  });
};

/**
 * Bulk upload questions.
 * POST /api/v1/exams/:examId/questions/bulk
 */
export const useBulkUploadQuestions = (examId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) =>
      trainingService.bulkUploadQuestions(examId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trainingKeys.exams.details(examId),
      });
      toast.success('Berhasil mengimpor soal massal');
    },
    onError: (error: unknown) => {
      const err = error as {
        response?: { data?: { message?: string; errors?: string[] } };
      };
      const message =
        err.response?.data?.message || 'Gagal mengimpor soal massal';
      toast.error(message);
    },
  });
};

/**
 * Update a question.
 * PATCH /api/v1/questions/:id
 */
export const useUpdateQuestion = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: Partial<{
        question: string;
        options: string[];
        correctAnswer: string;
        imageUrl: string | null;
      }>,
    ) => trainingService.updateQuestion(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: trainingKeys.questions.details(id),
      });
      // Also invalidate the exam that contains this question
      queryClient.invalidateQueries({
        queryKey: trainingKeys.exams.all(),
      });
      toast.success('Pertanyaan berhasil diperbarui');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err.response?.data?.message || 'Gagal memperbarui pertanyaan',
      );
    },
  });
};

/**
 * Soft-delete a question.
 * DELETE /api/v1/questions/:id
 */
export const useDeleteQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => trainingService.deleteQuestion(id),
    onSuccess: () => {
      // Invalidate all exams to ensure the deleted question is removed
      queryClient.invalidateQueries({ queryKey: trainingKeys.exams.all() });
      toast.success('Pertanyaan berhasil dihapus');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Gagal menghapus pertanyaan');
    },
  });
};

/**
 * Upload an image for a question.
 * POST /api/v1/questions/:id/image
 */
export const useUploadQuestionImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questionId, file }: { questionId: string; file: File }) =>
      trainingService.uploadQuestionImage(questionId, file),
    onSuccess: (_, { questionId }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: trainingKeys.exams.all() });
      toast.success('Gambar pertanyaan berhasil diunggah');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Gagal mengunggah gambar');
    },
  });
};

/**
 * Get Excel template for bulk question upload.
 * GET /api/v1/exams/questions/template
 */
export const useDownloadQuestionTemplate = () => {
  return useMutation({
    mutationFn: () => trainingService.getQuestionTemplate(),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_soal_ujian.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Template berhasil diunduh');
    },
    onError: () => {
      toast.error('Gagal mengunduh template');
    },
  });
};
