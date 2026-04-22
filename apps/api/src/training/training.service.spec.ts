import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TrainingService } from './training.service';
import { PrismaService } from '../database/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RedisService } from '../common/redis/redis.service';
import { MinioService } from '../common/minio/minio.service';

// ─── Mock factories ────────────────────────────────────────────────────────

const mockPrismaService = {
  module: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  moduleFile: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  exam: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  question: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockAuditLogService = {
  log: jest.fn(),
};

const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockMinioService = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function createMockFile(
  originalname: string,
  mimetype: string,
  size: number,
): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname,
    encoding: '7bit',
    mimetype,
    size,
    buffer: Buffer.alloc(size),
    destination: '',
    filename: originalname,
    path: '',
    stream: null as any,
  };
}

const mockModule = {
  id: 'module-1',
  title: 'Safety Training',
  description: 'Basic safety training',
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'user-1',
};

const mockModuleFile = {
  id: 'file-1',
  moduleId: 'module-1',
  filename: 'safety-guide.pdf',
  url: 'https://minio.example.com/module-1/12345-safety-guide.pdf',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Test suite ────────────────────────────────────────────────────────────

describe('TrainingService', () => {
  let service: TrainingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: MinioService, useValue: mockMinioService },
      ],
    }).compile();

    service = module.get<TrainingService>(TrainingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── createModule ────────────────────────────────────────────────────────

  describe('createModule', () => {
    const userId = 'user-1';

    it('should create a module successfully when title is unique', async () => {
      mockPrismaService.module.findFirst.mockResolvedValue(null);
      mockPrismaService.module.create.mockResolvedValue(mockModule);
      mockRedisService.del.mockResolvedValue(undefined);
      mockAuditLogService.log.mockResolvedValue(undefined);

      const result = await service.createModule(
        { title: 'Safety Training', description: 'Basic safety' },
        userId,
      );

      expect(mockPrismaService.module.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Safety Training',
          createdBy: userId,
          isDeleted: false,
        }),
      });
      expect(result).toEqual(mockModule);
    });

    it('should throw BadRequestException when a module with the same title already exists', async () => {
      mockPrismaService.module.findFirst.mockResolvedValue(mockModule);

      await expect(
        service.createModule({ title: 'Safety Training' }, userId),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.module.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException with correct message for duplicate title', async () => {
      mockPrismaService.module.findFirst.mockResolvedValue(mockModule);

      await expect(
        service.createModule({ title: 'Safety Training' }, userId),
      ).rejects.toThrow('Module with this title already exists');
    });

    it('should check for duplicate title with isDeleted: false filter', async () => {
      mockPrismaService.module.findFirst.mockResolvedValue(null);
      mockPrismaService.module.create.mockResolvedValue(mockModule);

      await service.createModule({ title: 'New Module' }, userId);

      expect(mockPrismaService.module.findFirst).toHaveBeenCalledWith({
        where: { title: 'New Module', isDeleted: false },
      });
    });

    it('should create module with null description when not provided', async () => {
      mockPrismaService.module.findFirst.mockResolvedValue(null);
      mockPrismaService.module.create.mockResolvedValue(mockModule);

      await service.createModule({ title: 'New Module' }, userId);

      expect(mockPrismaService.module.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ description: null }),
      });
    });

    it('should invalidate module cache after creation', async () => {
      mockPrismaService.module.findFirst.mockResolvedValue(null);
      mockPrismaService.module.create.mockResolvedValue(mockModule);

      await service.createModule({ title: 'New Module' }, userId);

      expect(mockRedisService.del).toHaveBeenCalledWith('modules:all');
    });

    it('should log audit after module creation', async () => {
      mockPrismaService.module.findFirst.mockResolvedValue(null);
      mockPrismaService.module.create.mockResolvedValue(mockModule);

      await service.createModule({ title: 'New Module' }, userId);

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'TRAINING_MODULE_CREATED',
          entity: 'Module',
        }),
      );
    });
  });

  // ─── createExam ──────────────────────────────────────────────────────────

  describe('createExam', () => {
    const userId = 'user-1';
    const mockExam = {
      id: 'exam-1',
      moduleId: 'module-1',
      duration: 60,
      maxAttempts: 3,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
    };

    beforeEach(() => {
      // Module lookup: no cache, DB returns module
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
    });

    it('should create an exam successfully when none exists for the module', async () => {
      mockPrismaService.exam.findFirst.mockResolvedValue(null);
      mockPrismaService.exam.create.mockResolvedValue(mockExam);

      const result = await service.createExam(
        { moduleId: 'module-1', duration: 60, maxAttempts: 3 },
        userId,
      );

      expect(mockPrismaService.exam.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          moduleId: 'module-1',
          duration: 60,
          createdBy: userId,
          isDeleted: false,
        }),
      });
      expect(result).toEqual(mockExam);
    });

    it('should throw BadRequestException when exam already exists for the module', async () => {
      mockPrismaService.exam.findFirst.mockResolvedValue(mockExam);

      await expect(
        service.createExam({ moduleId: 'module-1', duration: 60 }, userId),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.exam.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException with correct message for duplicate exam', async () => {
      mockPrismaService.exam.findFirst.mockResolvedValue(mockExam);

      await expect(
        service.createExam({ moduleId: 'module-1', duration: 60 }, userId),
      ).rejects.toThrow('Exam already exists for this module');
    });

    it('should check for existing exam with isDeleted: false filter', async () => {
      mockPrismaService.exam.findFirst.mockResolvedValue(null);
      mockPrismaService.exam.create.mockResolvedValue(mockExam);

      await service.createExam({ moduleId: 'module-1', duration: 60 }, userId);

      expect(mockPrismaService.exam.findFirst).toHaveBeenCalledWith({
        where: { moduleId: 'module-1', isDeleted: false },
      });
    });

    it('should throw NotFoundException when module does not exist', async () => {
      mockPrismaService.module.findUnique.mockResolvedValue(null);

      await expect(
        service.createExam({ moduleId: 'nonexistent', duration: 60 }, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create exam with null maxAttempts when not provided', async () => {
      mockPrismaService.exam.findFirst.mockResolvedValue(null);
      mockPrismaService.exam.create.mockResolvedValue(mockExam);

      await service.createExam({ moduleId: 'module-1', duration: 60 }, userId);

      expect(mockPrismaService.exam.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ maxAttempts: null }),
      });
    });

    it('should log audit after exam creation', async () => {
      mockPrismaService.exam.findFirst.mockResolvedValue(null);
      mockPrismaService.exam.create.mockResolvedValue(mockExam);

      await service.createExam({ moduleId: 'module-1', duration: 60 }, userId);

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'TRAINING_EXAM_CREATED',
          entity: 'Exam',
        }),
      );
    });
  });

  // ─── createQuestion ──────────────────────────────────────────────────────

  describe('createQuestion', () => {
    const userId = 'user-1';
    const mockExam = {
      id: 'exam-1',
      moduleId: 'module-1',
      duration: 60,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockQuestion = {
      id: 'question-1',
      examId: 'exam-1',
      question: 'What is the minimum PPE required for welding?',
      options: ['Safety helmet only', 'Full PPE including face shield', 'No PPE needed'],
      correctAnswer: 'Full PPE including face shield',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.exam.findUnique.mockResolvedValue(mockExam);
      mockPrismaService.question.create.mockResolvedValue(mockQuestion);
      mockRedisService.del.mockResolvedValue(undefined);
      mockAuditLogService.log.mockResolvedValue(undefined);
    });

    it('should create a question successfully when correctAnswer is in options', async () => {
      const dto = {
        examId: 'exam-1',
        question: 'What is the minimum PPE required for welding?',
        options: ['Safety helmet only', 'Full PPE including face shield', 'No PPE needed'],
        correctAnswer: 'Full PPE including face shield',
      };

      const result = await service.createQuestion(dto, userId);

      expect(mockPrismaService.question.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          examId: 'exam-1',
          question: dto.question,
          options: dto.options,
          correctAnswer: dto.correctAnswer,
          isDeleted: false,
        }),
      });
      expect(result).toEqual(mockQuestion);
    });

    it('should throw BadRequestException when correctAnswer is not in options', async () => {
      const dto = {
        examId: 'exam-1',
        question: 'What is the minimum PPE required for welding?',
        options: ['Option A', 'Option B', 'Option C'],
        correctAnswer: 'Option D',
      };

      await expect(service.createQuestion(dto, userId)).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.question.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException with correct message when correctAnswer not in options', async () => {
      const dto = {
        examId: 'exam-1',
        question: 'What is the minimum PPE required for welding?',
        options: ['Option A', 'Option B'],
        correctAnswer: 'Option C',
      };

      await expect(service.createQuestion(dto, userId)).rejects.toThrow(
        'Correct answer must be one of the options',
      );
    });

    it('should throw BadRequestException when correctAnswer differs by case', async () => {
      const dto = {
        examId: 'exam-1',
        question: 'What is the minimum PPE required for welding?',
        options: ['Option A', 'Option B'],
        correctAnswer: 'option a', // lowercase — not in options
      };

      await expect(service.createQuestion(dto, userId)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when exam does not exist', async () => {
      mockPrismaService.exam.findUnique.mockResolvedValue(null);

      const dto = {
        examId: 'nonexistent-exam',
        question: 'What is the minimum PPE required for welding?',
        options: ['Option A', 'Option B'],
        correctAnswer: 'Option A',
      };

      await expect(service.createQuestion(dto, userId)).rejects.toThrow(NotFoundException);
    });

    it('should log audit after question creation', async () => {
      const dto = {
        examId: 'exam-1',
        question: 'What is the minimum PPE required for welding?',
        options: ['Option A', 'Option B'],
        correctAnswer: 'Option A',
      };

      await service.createQuestion(dto, userId);

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'TRAINING_QUESTION_CREATED',
          entity: 'Question',
        }),
      );
    });

    it('should invalidate exam cache after question creation', async () => {
      const dto = {
        examId: 'exam-1',
        question: 'What is the minimum PPE required for welding?',
        options: ['Option A', 'Option B'],
        correctAnswer: 'Option A',
      };

      await service.createQuestion(dto, userId);

      expect(mockRedisService.del).toHaveBeenCalledWith('exam:exam-1');
    });
  });

  // ─── uploadModuleFile ────────────────────────────────────────────────────

  describe('uploadModuleFile', () => {
    const userId = 'user-1';

    beforeEach(() => {
      // Module lookup: no cache, then DB returns the module
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockMinioService.uploadFile.mockResolvedValue(mockModuleFile.url);
      mockPrismaService.moduleFile.create.mockResolvedValue(mockModuleFile);
      mockRedisService.del.mockResolvedValue(undefined);
      mockAuditLogService.log.mockResolvedValue(undefined);
    });

    // ── Valid file types ──────────────────────────────────────────────────

    it('should upload a PDF file successfully', async () => {
      const file = createMockFile('document.pdf', 'application/pdf', 1024 * 1024); // 1 MB

      const result = await service.uploadModuleFile('module-1', file, userId);

      expect(mockMinioService.uploadFile).toHaveBeenCalledWith(
        file,
        expect.stringContaining('module-1/'),
      );
      expect(mockPrismaService.moduleFile.create).toHaveBeenCalledWith({
        data: {
          moduleId: 'module-1',
          filename: 'document.pdf',
          url: mockModuleFile.url,
        },
      });
      expect(result).toEqual(mockModuleFile);
    });

    it('should upload an MP4 video file successfully', async () => {
      const file = createMockFile('training-video.mp4', 'video/mp4', 50 * 1024 * 1024); // 50 MB

      const result = await service.uploadModuleFile('module-1', file, userId);

      expect(mockMinioService.uploadFile).toHaveBeenCalled();
      expect(result).toEqual(mockModuleFile);
    });

    it('should upload a JPEG image file successfully', async () => {
      const file = createMockFile('diagram.jpg', 'image/jpeg', 512 * 1024); // 512 KB

      const result = await service.uploadModuleFile('module-1', file, userId);

      expect(mockMinioService.uploadFile).toHaveBeenCalled();
      expect(result).toEqual(mockModuleFile);
    });

    it('should upload a PNG image file successfully', async () => {
      const file = createMockFile('chart.png', 'image/png', 256 * 1024); // 256 KB

      const result = await service.uploadModuleFile('module-1', file, userId);

      expect(mockMinioService.uploadFile).toHaveBeenCalled();
      expect(result).toEqual(mockModuleFile);
    });

    it('should upload a WebP image file successfully', async () => {
      const file = createMockFile('image.webp', 'image/webp', 128 * 1024); // 128 KB

      const result = await service.uploadModuleFile('module-1', file, userId);

      expect(mockMinioService.uploadFile).toHaveBeenCalled();
      expect(result).toEqual(mockModuleFile);
    });

    // ── Filename construction ─────────────────────────────────────────────

    it('should construct the MinIO filename with moduleId prefix and original filename', async () => {
      const file = createMockFile('my-document.pdf', 'application/pdf', 1024);

      await service.uploadModuleFile('module-1', file, userId);

      const uploadCall = mockMinioService.uploadFile.mock.calls[0];
      const filename: string = uploadCall[1];
      expect(filename).toMatch(/^module-1\/\d+-my-document\.pdf$/);
    });

    // ── Successful upload creates ModuleFile record ───────────────────────

    it('should create a ModuleFile record with correct data after upload', async () => {
      const file = createMockFile('guide.pdf', 'application/pdf', 2048);
      const uploadedUrl = 'https://minio.example.com/module-1/99999-guide.pdf';
      mockMinioService.uploadFile.mockResolvedValue(uploadedUrl);

      const expectedRecord = { ...mockModuleFile, url: uploadedUrl, filename: 'guide.pdf' };
      mockPrismaService.moduleFile.create.mockResolvedValue(expectedRecord);

      const result = await service.uploadModuleFile('module-1', file, userId);

      expect(mockPrismaService.moduleFile.create).toHaveBeenCalledWith({
        data: {
          moduleId: 'module-1',
          filename: 'guide.pdf',
          url: uploadedUrl,
        },
      });
      expect(result).toEqual(expectedRecord);
    });

    // ── Returns the created ModuleFile ────────────────────────────────────

    it('should return the created ModuleFile record', async () => {
      const file = createMockFile('test.pdf', 'application/pdf', 1024);

      const result = await service.uploadModuleFile('module-1', file, userId);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('moduleId', 'module-1');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('url');
    });

    // ── Audit log ─────────────────────────────────────────────────────────

    it('should log an audit entry after successful upload', async () => {
      const file = createMockFile('test.pdf', 'application/pdf', 1024);

      await service.uploadModuleFile('module-1', file, userId);

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'TRAINING_MODULE_FILE_UPLOADED',
          entity: 'ModuleFile',
        }),
      );
    });

    // ── Cache invalidation ────────────────────────────────────────────────

    it('should invalidate the module cache after upload', async () => {
      const file = createMockFile('test.pdf', 'application/pdf', 1024);

      await service.uploadModuleFile('module-1', file, userId);

      expect(mockRedisService.del).toHaveBeenCalledWith('modules:all');
      expect(mockRedisService.del).toHaveBeenCalledWith('module:module-1');
    });

    // ── Module not found ──────────────────────────────────────────────────

    it('should throw NotFoundException when module does not exist', async () => {
      mockPrismaService.module.findUnique.mockResolvedValue(null);
      const file = createMockFile('test.pdf', 'application/pdf', 1024);

      await expect(
        service.uploadModuleFile('nonexistent-module', file, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when module is soft-deleted', async () => {
      mockPrismaService.module.findUnique.mockResolvedValue({
        ...mockModule,
        isDeleted: true,
      });
      const file = createMockFile('test.pdf', 'application/pdf', 1024);

      await expect(
        service.uploadModuleFile('module-1', file, userId),
      ).rejects.toThrow(NotFoundException);
    });

    // ── File size limit (100 MB) ──────────────────────────────────────────
    // Note: The 100 MB size limit is enforced at the controller layer via
    // multer's `limits.fileSize` option and `MaxFileSizeValidator`. By the
    // time a file reaches the service, it has already passed those guards.
    // The tests below verify the service handles files at the boundary.

    it('should accept a file exactly at the 100MB limit', async () => {
      const maxSize = 100 * 1024 * 1024;
      const file = createMockFile('large-video.mp4', 'video/mp4', maxSize);

      const result = await service.uploadModuleFile('module-1', file, userId);

      expect(mockMinioService.uploadFile).toHaveBeenCalled();
      expect(result).toEqual(mockModuleFile);
    });

    it('should accept a file just under the 100MB limit', async () => {
      const file = createMockFile('video.mp4', 'video/mp4', 100 * 1024 * 1024 - 1);

      const result = await service.uploadModuleFile('module-1', file, userId);

      expect(mockMinioService.uploadFile).toHaveBeenCalled();
      expect(result).toEqual(mockModuleFile);
    });

    // ── MinIO error propagation ───────────────────────────────────────────

    it('should propagate errors from MinIO upload failure', async () => {
      const file = createMockFile('test.pdf', 'application/pdf', 1024);
      mockMinioService.uploadFile.mockRejectedValue(new Error('MinIO connection failed'));

      await expect(
        service.uploadModuleFile('module-1', file, userId),
      ).rejects.toThrow('MinIO connection failed');

      // ModuleFile record should NOT be created if upload fails
      expect(mockPrismaService.moduleFile.create).not.toHaveBeenCalled();
    });
  });
});
