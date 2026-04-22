import axiosInstance from '../axios';
import {
  trainingService,
  CreateModuleData,
  ModuleDetail,
  ModuleListItem,
  ExamDetail,
  QuestionDetail,
} from './training';

// Mock axios instance
jest.mock('../axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('trainingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Module Operations ─────────────────────────────────────────────────────

  describe('createModule', () => {
    const mockModuleDetail: ModuleDetail = {
      id: 'module-1',
      title: 'Safety Training',
      description: 'Basic safety training module',
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

    it('should create a new module with valid data', async () => {
      const createData: CreateModuleData = {
        title: 'Safety Training',
        description: 'Basic safety training module',
      };

      (axiosInstance.post as jest.Mock).mockResolvedValue({ data: mockModuleDetail });

      const result = await trainingService.createModule(createData);

      expect(axiosInstance.post).toHaveBeenCalledWith('/modules', createData);
      expect(result).toEqual(mockModuleDetail);
    });

    it('should create module with minimal data', async () => {
      const minimalData: CreateModuleData = {
        title: 'Fire Safety',
      };

      (axiosInstance.post as jest.Mock).mockResolvedValue({ data: mockModuleDetail });

      const result = await trainingService.createModule(minimalData);

      expect(axiosInstance.post).toHaveBeenCalledWith('/modules', minimalData);
      expect(result).toEqual(mockModuleDetail);
    });

    it('should handle API errors when creating module', async () => {
      const error = new Error('Network Error');
      (axiosInstance.post as jest.Mock).mockRejectedValue(error);

      await expect(trainingService.createModule({ title: 'Test' })).rejects.toThrow('Network Error');
    });

    it('should handle duplicate title error', async () => {
      const duplicateError = {
        response: {
          status: 400,
          data: { message: 'Module title already exists' },
        },
      };
      (axiosInstance.post as jest.Mock).mockRejectedValue(duplicateError);

      await expect(trainingService.createModule({ title: 'Existing Title' })).rejects.toEqual(duplicateError);
    });
  });

  describe('getModuleList', () => {
    const mockModuleList: { data: ModuleListItem[] } = {
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
        {
          id: 'module-2',
          title: 'Fire Safety',
          description: 'Fire safety procedures',
          createdAt: '2024-01-16T10:00:00Z',
          updatedAt: '2024-01-16T10:00:00Z',
          creator: {
            id: 'user-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
          _count: {
            files: 1,
            exam: 0,
            question: 0,
          },
        },
      ],
    };

    it('should fetch all training modules', async () => {
      (axiosInstance.get as jest.Mock).mockResolvedValue({ data: mockModuleList });

      const result = await trainingService.getModuleList();

      expect(axiosInstance.get).toHaveBeenCalledWith('/modules');
      expect(result).toEqual(mockModuleList);
    });

    it('should return empty array when no modules exist', async () => {
      (axiosInstance.get as jest.Mock).mockResolvedValue({ data: [] });

      const result = await trainingService.getModuleList();

      // The API returns { data: [] } but response.data extracts just the array
      expect(result).toEqual([]);
    });

    it('should handle API errors when fetching list', async () => {
      const error = new Error('Network Error');
      (axiosInstance.get as jest.Mock).mockRejectedValue(error);

      await expect(trainingService.getModuleList()).rejects.toThrow('Network Error');
    });
  });

  describe('getModuleById', () => {
    const mockModuleDetail: ModuleDetail = {
      id: 'module-1',
      title: 'Safety Training',
      description: 'Basic safety training module',
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
      ],
      exam: null,
      question: [],
    };

    it('should fetch module by ID', async () => {
      (axiosInstance.get as jest.Mock).mockResolvedValue({ data: mockModuleDetail });

      const result = await trainingService.getModuleById('module-1');

      expect(axiosInstance.get).toHaveBeenCalledWith('/modules/module-1');
      expect(result).toEqual(mockModuleDetail);
    });

    it('should handle 404 error when module not found', async () => {
      const notFoundError = {
        response: { status: 404, data: { message: 'Module not found' } },
      };
      (axiosInstance.get as jest.Mock).mockRejectedValue(notFoundError);

      await expect(trainingService.getModuleById('nonexistent')).rejects.toEqual(notFoundError);
    });

    it('should handle API errors when fetching by ID', async () => {
      const error = new Error('Network Error');
      (axiosInstance.get as jest.Mock).mockRejectedValue(error);

      await expect(trainingService.getModuleById('module-1')).rejects.toThrow('Network Error');
    });
  });

  describe('updateModule', () => {
    const mockModuleDetail: ModuleDetail = {
      id: 'module-1',
      title: 'Updated Safety Training',
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

    it('should update module title', async () => {
      (axiosInstance.patch as jest.Mock).mockResolvedValue({ data: mockModuleDetail });

      const result = await trainingService.updateModule('module-1', {
        title: 'Updated Safety Training',
      });

      expect(axiosInstance.patch).toHaveBeenCalledWith('/modules/module-1', {
        title: 'Updated Safety Training',
      });
      expect(result).toEqual(mockModuleDetail);
    });

    it('should update module description', async () => {
      (axiosInstance.patch as jest.Mock).mockResolvedValue({ data: mockModuleDetail });

      const result = await trainingService.updateModule('module-1', {
        description: 'Updated description',
      });

      expect(axiosInstance.patch).toHaveBeenCalledWith('/modules/module-1', {
        description: 'Updated description',
      });
      expect(result).toEqual(mockModuleDetail);
    });

    it('should handle API errors when updating module', async () => {
      const error = new Error('Network Error');
      (axiosInstance.patch as jest.Mock).mockRejectedValue(error);

      await expect(trainingService.updateModule('module-1', { title: 'Test' })).rejects.toThrow('Network Error');
    });
  });

  describe('deleteModule', () => {
    it('should soft-delete a module', async () => {
      const mockResponse = { success: true };
      (axiosInstance.delete as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await trainingService.deleteModule('module-1');

      expect(axiosInstance.delete).toHaveBeenCalledWith('/modules/module-1');
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors when deleting module', async () => {
      const error = new Error('Network Error');
      (axiosInstance.delete as jest.Mock).mockRejectedValue(error);

      await expect(trainingService.deleteModule('module-1')).rejects.toThrow('Network Error');
    });
  });

  describe('uploadModuleFile', () => {
    it('should upload a file to module', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const mockFileResponse = {
        id: 'file-1',
        moduleId: 'module-1',
        filename: 'test.pdf',
        url: 'https://minio.example.com/test.pdf',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      };

      (axiosInstance.post as jest.Mock).mockResolvedValue({ data: mockFileResponse });

      const result = await trainingService.uploadModuleFile('module-1', mockFile);

      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/modules/module-1/files',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      expect(result).toEqual(mockFileResponse);
    });

    it('should handle file upload errors', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const error = new Error('Network Error');
      (axiosInstance.post as jest.Mock).mockRejectedValue(error);

      await expect(trainingService.uploadModuleFile('module-1', mockFile)).rejects.toThrow('Network Error');
    });
  });

  describe('deleteModuleFile', () => {
    it('should delete a file from module', async () => {
      const mockResponse = { success: true };
      (axiosInstance.delete as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await trainingService.deleteModuleFile('module-1', 'file-1');

      expect(axiosInstance.delete).toHaveBeenCalledWith('/modules/module-1/files/file-1');
      expect(result).toEqual(mockResponse);
    });

    it('should handle file deletion errors', async () => {
      const error = new Error('Network Error');
      (axiosInstance.delete as jest.Mock).mockRejectedValue(error);

      await expect(trainingService.deleteModuleFile('module-1', 'file-1')).rejects.toThrow('Network Error');
    });
  });

  // ─── Exam Operations ───────────────────────────────────────────────────────

  describe('createExam', () => {
    const mockExamDetail: ExamDetail = {
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

    it('should create a new exam', async () => {
      (axiosInstance.post as jest.Mock).mockResolvedValue({ data: mockExamDetail });

      const result = await trainingService.createExam({
        moduleId: 'module-1',
        duration: 30,
        maxAttempts: 3,
      });

      expect(axiosInstance.post).toHaveBeenCalledWith('/exams', {
        moduleId: 'module-1',
        duration: 30,
        maxAttempts: 3,
      });
      expect(result).toEqual(mockExamDetail);
    });

    it('should create exam without maxAttempts', async () => {
      (axiosInstance.post as jest.Mock).mockResolvedValue({ data: mockExamDetail });

      const result = await trainingService.createExam({
        moduleId: 'module-1',
        duration: 45,
      });

      expect(axiosInstance.post).toHaveBeenCalledWith('/exams', {
        moduleId: 'module-1',
        duration: 45,
      });
      expect(result).toEqual(mockExamDetail);
    });

    it('should handle API errors when creating exam', async () => {
      const error = new Error('Network Error');
      (axiosInstance.post as jest.Mock).mockRejectedValue(error);

      await expect(
        trainingService.createExam({ moduleId: 'module-1', duration: 30 }),
      ).rejects.toThrow('Network Error');
    });
  });

  describe('getExamById', () => {
    const mockExamDetail: ExamDetail = {
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
      ],
      creator: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
    };

    it('should fetch exam by ID with questions', async () => {
      (axiosInstance.get as jest.Mock).mockResolvedValue({ data: mockExamDetail });

      const result = await trainingService.getExamById('exam-1');

      expect(axiosInstance.get).toHaveBeenCalledWith('/exams/exam-1');
      expect(result).toEqual(mockExamDetail);
    });

    it('should handle 404 error when exam not found', async () => {
      const notFoundError = {
        response: { status: 404, data: { message: 'Exam not found' } },
      };
      (axiosInstance.get as jest.Mock).mockRejectedValue(notFoundError);

      await expect(trainingService.getExamById('nonexistent')).rejects.toEqual(notFoundError);
    });

    it('should handle API errors when fetching exam', async () => {
      const error = new Error('Network Error');
      (axiosInstance.get as jest.Mock).mockRejectedValue(error);

      await expect(trainingService.getExamById('exam-1')).rejects.toThrow('Network Error');
    });
  });

  // ─── Question Operations ───────────────────────────────────────────────────

  describe('createQuestion', () => {
    const mockQuestionDetail: QuestionDetail = {
      id: 'q-1',
      examId: 'exam-1',
      question: 'What is the first step in fire safety?',
      options: ['Stop', 'Alert', 'Evacuate', 'All of the above'],
      correctAnswer: 'Stop',
      isDeleted: false,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    };

    it('should create a new question for an exam', async () => {
      (axiosInstance.post as jest.Mock).mockResolvedValue({ data: mockQuestionDetail });

      const result = await trainingService.createQuestion({
        examId: 'exam-1',
        question: 'What is the first step in fire safety?',
        options: ['Stop', 'Alert', 'Evacuate', 'All of the above'],
        correctAnswer: 'Stop',
      });

      expect(axiosInstance.post).toHaveBeenCalledWith('/questions', {
        examId: 'exam-1',
        question: 'What is the first step in fire safety?',
        options: ['Stop', 'Alert', 'Evacuate', 'All of the above'],
        correctAnswer: 'Stop',
      });
      expect(result).toEqual(mockQuestionDetail);
    });

    it('should create a standalone question without exam', async () => {
      (axiosInstance.post as jest.Mock).mockResolvedValue({ data: mockQuestionDetail });

      const result = await trainingService.createQuestion({
        question: 'What is the first step in fire safety?',
        options: ['Stop', 'Alert', 'Evacuate', 'All of the above'],
        correctAnswer: 'Stop',
      });

      expect(axiosInstance.post).toHaveBeenCalledWith('/questions', {
        question: 'What is the first step in fire safety?',
        options: ['Stop', 'Alert', 'Evacuate', 'All of the above'],
        correctAnswer: 'Stop',
      });
      expect(result).toEqual(mockQuestionDetail);
    });

    it('should handle API errors when creating question', async () => {
      const error = new Error('Network Error');
      (axiosInstance.post as jest.Mock).mockRejectedValue(error);

      await expect(
        trainingService.createQuestion({
          question: 'Test question',
          options: ['A', 'B'],
          correctAnswer: 'A',
        }),
      ).rejects.toThrow('Network Error');
    });
  });

  describe('updateQuestion', () => {
    const mockQuestionDetail: QuestionDetail = {
      id: 'q-1',
      examId: 'exam-1',
      question: 'Updated question',
      options: ['Option A', 'Option B', 'Option C'],
      correctAnswer: 'Option A',
      isDeleted: false,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-16T10:00:00Z',
    };

    it('should update question text', async () => {
      (axiosInstance.patch as jest.Mock).mockResolvedValue({ data: mockQuestionDetail });

      const result = await trainingService.updateQuestion('q-1', {
        question: 'Updated question',
      });

      expect(axiosInstance.patch).toHaveBeenCalledWith('/questions/q-1', {
        question: 'Updated question',
      });
      expect(result).toEqual(mockQuestionDetail);
    });

    it('should update question options and correct answer', async () => {
      (axiosInstance.patch as jest.Mock).mockResolvedValue({ data: mockQuestionDetail });

      const result = await trainingService.updateQuestion('q-1', {
        options: ['Option A', 'Option B', 'Option C'],
        correctAnswer: 'Option A',
      });

      expect(axiosInstance.patch).toHaveBeenCalledWith('/questions/q-1', {
        options: ['Option A', 'Option B', 'Option C'],
        correctAnswer: 'Option A',
      });
      expect(result).toEqual(mockQuestionDetail);
    });

    it('should handle API errors when updating question', async () => {
      const error = new Error('Network Error');
      (axiosInstance.patch as jest.Mock).mockRejectedValue(error);

      await expect(trainingService.updateQuestion('q-1', { question: 'Test' })).rejects.toThrow(
        'Network Error',
      );
    });
  });

  describe('deleteQuestion', () => {
    it('should soft-delete a question', async () => {
      const mockResponse: QuestionDetail = {
        id: 'q-1',
        examId: 'exam-1',
        question: 'Deleted question',
        options: ['A', 'B'],
        correctAnswer: 'A',
        isDeleted: true,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-16T10:00:00Z',
      };
      (axiosInstance.delete as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await trainingService.deleteQuestion('q-1');

      expect(axiosInstance.delete).toHaveBeenCalledWith('/questions/q-1');
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors when deleting question', async () => {
      const error = new Error('Network Error');
      (axiosInstance.delete as jest.Mock).mockRejectedValue(error);

      await expect(trainingService.deleteQuestion('q-1')).rejects.toThrow('Network Error');
    });
  });
});