import { api } from '@/settings/axios-setting';
import {
  CreateModuleData,
  ExamDetail,
  ExamListItem,
  ModuleDetail,
  ModuleFile,
  ModuleListItem,
  QuestionDetail,
} from '../types/training-types';

// ─── Service ───────────────────────────────────────────────────────────────

export const trainingService = {
  // ─── Module operations ─────────────────────────────────────────────────────

  /**
   * Create a new training module.
   * POST /api/v1/modules
   */
  async createModule(data: CreateModuleData): Promise<ModuleDetail> {
    const response = await api.post('/modules', data);
    return response.data.data;
  },

  /**
   * Get all training modules.
   * GET /api/v1/modules
   */
  async getModuleList(): Promise<ModuleListItem[]> {
    const response = await api.get('/modules');
    return response.data.data;
  },

  /**
   * Get a single module by ID.
   * GET /api/v1/modules/:id
   */
  async getModuleById(id: string): Promise<ModuleDetail> {
    const response = await api.get(`/modules/${id}`);
    return response.data.data;
  },

  /**
   * Update a training module.
   * PATCH /api/v1/modules/:id
   */
  async updateModule(
    id: string,
    data: Partial<CreateModuleData>,
  ): Promise<ModuleDetail> {
    const response = await api.patch(`/modules/${id}`, data);
    return response.data.data;
  },

  /**
   * Soft-delete a training module.
   * DELETE /api/v1/modules/:id
   */
  async deleteModule(id: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/modules/${id}`);
    return response.data.data;
  },

  /**
   * Upload a file to a training module.
   * POST /api/v1/modules/:id/files
   */
  async uploadModuleFile(moduleId: string, file: File): Promise<ModuleFile> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/modules/${moduleId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  /**
   * Delete a file from a training module.
   * DELETE /api/v1/modules/:id/files/:fileId
   */
  async deleteModuleFile(
    moduleId: string,
    fileId: string,
  ): Promise<{ success: boolean }> {
    const response = await api.delete(`/modules/${moduleId}/files/${fileId}`);
    return response.data.data;
  },

  // ─── Exam operations ───────────────────────────────────────────────────────

  /**
   * Create a new exam for a module.
   * POST /api/v1/exams
   */
  async createExam(data: {
    moduleId: string;
    duration: number;
    maxAttempts?: number;
  }): Promise<ExamDetail> {
    const response = await api.post('/exams', data);
    return response.data.data;
  },

  /**
   * Get exam details with questions.
   * GET /api/v1/exams/:id
   */
  async getExamById(id: string): Promise<ExamDetail> {
    const response = await api.get(`/exams/${id}`);
    return response.data.data;
  },

  /**
   * Get all exams.
   * GET /api/v1/exams
   */
  async getExams(): Promise<ExamListItem[]> {
    const response = await api.get('/exams');
    return response.data.data;
  },

  // ─── Question operations ───────────────────────────────────────────────────

  /**
   * Create a new question.
   * POST /api/v1/questions
   */
  async createQuestion(data: {
    examId: string;
    question?: string;
    options: string[];
    correctAnswer: string;
    imageUrl?: string;
  }): Promise<QuestionDetail> {
    const response = await api.post('/questions', data);
    return response.data.data;
  },

  /**
   * Get Excel template for bulk question upload.
   * GET /api/v1/exams/questions/template
   */
  async getQuestionTemplate(): Promise<Blob> {
    const response = await api.get('/exams/questions/template', {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Bulk upload questions for an exam.
   * POST /api/v1/exams/:examId/questions/bulk
   */
  async bulkUploadQuestions(
    examId: string,
    file: File,
  ): Promise<{ success: boolean; count: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(
      `/exams/${examId}/questions/bulk`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data.data;
  },

  /**
   * Upload an image for a question.
   * POST /api/v1/questions/:id/image
   */
  async uploadQuestionImage(
    questionId: string,
    file: File,
  ): Promise<QuestionDetail> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(
      `/questions/${questionId}/image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data.data;
  },

  /**
   * Update a question.
   * PATCH /api/v1/questions/:id
   */
  async updateQuestion(
    id: string,
    data: Partial<{
      question: string;
      options: string[];
      correctAnswer: string;
      imageUrl: string | null;
    }>,
  ): Promise<QuestionDetail> {
    const response = await api.patch(`/questions/${id}`, data);
    return response.data.data;
  },

  /**
   * Soft-delete a question.
   * DELETE /api/v1/questions/:id
   */
  async deleteQuestion(id: string): Promise<QuestionDetail> {
    const response = await api.delete(`/questions/${id}`);
    return response.data.data;
  },
};

export type { ExamListItem };
