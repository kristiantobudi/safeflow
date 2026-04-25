import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RedisService } from '../common/redis/redis.service';
import { MinioService } from '../common/minio/minio.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { CreateExamDto } from './dto/create-exam.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { Role } from '@repo/database';
import { Workbook } from 'exceljs';
import { UploadedFile } from '../common/interface/file.interface';

@Injectable()
export class TrainingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly redisService: RedisService,
    private readonly minioService: MinioService,
  ) {}

  // ─── Cache helpers ────────────────────────────────────────────────────────

  private async invalidateModuleCache(moduleId?: string, creatorId?: string) {
    const keysToDelete = ['modules:all'];
    if (moduleId) keysToDelete.push(`module:${moduleId}`);
    if (creatorId) keysToDelete.push(`modules:user:${creatorId}`);
    await Promise.all(keysToDelete.map((key) => this.redisService.del(key)));
  }

  private async invalidateExamCache(examId?: string) {
    const keysToDelete = ['exams:all'];
    if (examId) keysToDelete.push(`exam:${examId}`);
    await Promise.all(keysToDelete.map((key) => this.redisService.del(key)));
  }

  private async invalidateQuestionCache(questionId?: string) {
    const keysToDelete = ['questions:all'];
    if (questionId) keysToDelete.push(`question:${questionId}`);
    await Promise.all(keysToDelete.map((key) => this.redisService.del(key)));
  }

  // ─── Module operations ─────────────────────────────────────────────────────

  async createModule(dto: CreateModuleDto, userId: string) {
    // Check for duplicate title
    const existing = await this.prisma.module.findFirst({
      where: { title: dto.title, isDeleted: false },
    });

    if (existing) {
      throw new BadRequestException('Module with this title already exists');
    }

    const module = await this.prisma.module.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        createdBy: userId,
        isDeleted: false,
      },
    });

    await this.invalidateModuleCache(module.id, userId);

    await this.auditLogService.log({
      userId,
      action: 'TRAINING_MODULE_CREATED',
      entity: 'Module',
      entityId: module.id,
      newValue: { title: module.title },
    });

    return module;
  }

  async findAllModules() {
    const cached = await this.redisService.get<any[]>('modules:all');
    if (cached) return cached;

    const modules = await this.prisma.module.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { files: true, exam: true, question: true },
        },
      },
    });

    await this.redisService.set('modules:all', modules, 3600);
    return modules;
  }

  async findModuleById(id: string) {
    const cached = await this.redisService.get<any>(`module:${id}`);
    if (cached) return cached;

    const moduleResult = await this.prisma.module.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        files: true,
        exam: {
          where: { isDeleted: false },
          include: {
            question: {
              where: { isDeleted: false },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        question: {
          where: { isDeleted: false, moduleId: id },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!moduleResult || moduleResult.isDeleted) {
      throw new NotFoundException('Module not found');
    }

    // Map exam array to single object for frontend compatibility
    const module = {
      ...moduleResult,
      exam: moduleResult.exam?.[0] || null,
    };

    await this.redisService.set(`module:${id}`, module, 3600);
    return module;
  }

  async updateModule(id: string, dto: UpdateModuleDto, userId: string) {
    const module = await this.findModuleById(id);

    // Check for duplicate title if title is being changed
    if (dto.title && dto.title !== module.title) {
      const existing = await this.prisma.module.findFirst({
        where: { title: dto.title, isDeleted: false },
      });

      if (existing) {
        throw new BadRequestException('Module with this title already exists');
      }
    }

    const updated = await this.prisma.module.update({
      where: { id },
      data: {
        title: dto.title ?? module.title,
        description: dto.description ?? module.description,
        modifyBy: userId,
      },
    });

    await this.invalidateModuleCache(id);

    await this.auditLogService.log({
      userId,
      action: 'TRAINING_MODULE_UPDATED',
      entity: 'Module',
      entityId: id,
      newValue: { title: updated.title },
    });

    return updated;
  }

  async deleteModule(id: string, userId: string) {
    const module = await this.findModuleById(id);

    const deleted = await this.prisma.module.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    await this.invalidateModuleCache(id);

    await this.auditLogService.log({
      userId,
      action: 'TRAINING_MODULE_DELETED',
      entity: 'Module',
      entityId: id,
      newValue: { title: module.title },
    });

    return deleted;
  }

  // ─── Module file operations ───────────────────────────────────────────────

  async uploadModuleFile(
    moduleId: string,
    file: UploadedFile,
    userId: string,
  ) {
    const module = await this.findModuleById(moduleId);

    // Upload to MinIO
    const filename = `${moduleId}/${Date.now()}-${file.originalname}`;
    const url = await this.minioService.uploadFile(file, filename);

    const moduleFile = await this.prisma.moduleFile.create({
      data: {
        moduleId,
        filename: file.originalname,
        url,
      },
    });

    await this.invalidateModuleCache(moduleId);

    await this.auditLogService.log({
      userId,
      action: 'TRAINING_MODULE_FILE_UPLOADED',
      entity: 'ModuleFile',
      entityId: moduleFile.id,
      newValue: { filename: moduleFile.filename, moduleId },
    });

    return moduleFile;
  }

  async deleteModuleFile(moduleId: string, fileId: string, userId: string) {
    const moduleFile = await this.prisma.moduleFile.findUnique({
      where: { id: fileId },
    });

    if (!moduleFile || moduleFile.moduleId !== moduleId) {
      throw new NotFoundException('File not found');
    }

    // Delete from MinIO
    const filename = moduleFile.url.split('/').pop();
    if (filename) {
      await this.minioService.deleteFile(filename);
    }

    await this.prisma.moduleFile.delete({
      where: { id: fileId },
    });

    await this.invalidateModuleCache(moduleId);

    await this.auditLogService.log({
      userId,
      action: 'TRAINING_MODULE_FILE_DELETED',
      entity: 'ModuleFile',
      entityId: fileId,
      newValue: { filename: moduleFile.filename, moduleId },
    });

    return { success: true };
  }

  // ─── Exam operations ───────────────────────────────────────────────────────

  async createExam(dto: CreateExamDto, userId: string) {
    // Verify module exists
    const module = await this.findModuleById(dto.moduleId);

    // Check if exam already exists for this module
    const existing = await this.prisma.exam.findFirst({
      where: { moduleId: dto.moduleId, isDeleted: false },
    });

    if (existing) {
      throw new BadRequestException('Exam already exists for this module');
    }

    const exam = await this.prisma.exam.create({
      data: {
        moduleId: dto.moduleId,
        duration: dto.duration,
        maxAttempts: dto.maxAttempts ?? null,
        createdBy: userId,
        isDeleted: false,
      },
    });

    await this.invalidateModuleCache(dto.moduleId);
    await this.invalidateExamCache();

    await this.auditLogService.log({
      userId,
      action: 'TRAINING_EXAM_CREATED',
      entity: 'Exam',
      entityId: exam.id,
      newValue: { moduleId: exam.moduleId, duration: exam.duration },
    });

    return exam;
  }

  async findAllExams() {
    const cached = await this.redisService.get<any[]>('exams:all');
    if (cached) return cached;

    const exams = await this.prisma.exam.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      include: {
        module: {
          select: { id: true, title: true, description: true },
        },
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { question: { where: { isDeleted: false } } },
        },
      },
    });

    await this.redisService.set('exams:all', exams, 3600);
    return exams;
  }

  async findExamById(id: string) {
    const cached = await this.redisService.get<any>(`exam:${id}`);
    if (cached) return cached;

    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        module: {
          select: { id: true, title: true, description: true },
        },
        question: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' },
        },
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!exam || exam.isDeleted) {
      throw new NotFoundException('Exam not found');
    }

    await this.redisService.set(`exam:${id}`, exam, 3600);
    return exam;
  }

  // ─── Question operations ───────────────────────────────────────────────────

  async createQuestion(dto: CreateQuestionDto, userId: string) {
    // Verify exam exists
    if (!dto.examId) {
      throw new BadRequestException('examId is required');
    }
    const exam = await this.findExamById(dto.examId);

    // Validate correctAnswer is in options
    if (!dto.options.includes(dto.correctAnswer)) {
      throw new BadRequestException(
        'Correct answer must be one of the options',
      );
    }

    const question = await this.prisma.question.create({
      data: {
        examId: dto.examId,
        question: dto.question || '',
        options: dto.options,
        correctAnswer: dto.correctAnswer,
        imageUrl: dto.imageUrl || null,
        isDeleted: false,
      },
    });

    await this.invalidateExamCache(dto.examId);
    await this.invalidateQuestionCache();

    await this.auditLogService.log({
      userId,
      action: 'TRAINING_QUESTION_CREATED',
      entity: 'Question',
      entityId: question.id,
      newValue: {
        examId: question.examId,
        question: question.question,
        imageUrl: question.imageUrl,
      },
    });

    return question;
  }

  async bulkCreateQuestions(
    examId: string,
    file: UploadedFile,
    userId: string,
  ) {
    // Verify exam exists
    const exam = await this.findExamById(examId);

    const workbook = new Workbook();
    await workbook.xlsx.load(file.buffer as any);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
      throw new BadRequestException('Worksheet not found in the uploaded file');
    }

    const questions: any[] = [];
    const errors: string[] = [];

    // Header validation (optional, but good for UX)
    // Assuming format: [Question, Option A, Option B, Option C, Option D, Correct Answer]

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const questionText = row.getCell(1).text?.trim();
      const optionA = row.getCell(2).text?.trim();
      const optionB = row.getCell(3).text?.trim();
      const optionC = row.getCell(4).text?.trim();
      const optionD = row.getCell(5).text?.trim();
      const correctAnswer = row.getCell(6).text?.trim();

      if (!questionText || !optionA || !optionB || !correctAnswer) {
        errors.push(`Row ${rowNumber}: Incomplete data`);
        return;
      }

      const options = [optionA, optionB];
      if (optionC) options.push(optionC);
      if (optionD) options.push(optionD);

      if (!options.includes(correctAnswer)) {
        errors.push(
          `Row ${rowNumber}: Correct answer must match one of the options`,
        );
        return;
      }

      questions.push({
        examId,
        question: questionText,
        options,
        correctAnswer,
        isDeleted: false,
      });
    });

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Bulk upload failed due to validation errors',
        errors,
      });
    }

    if (questions.length === 0) {
      throw new BadRequestException('No valid questions found in the file');
    }

    // Use createMany for bulk insert
    await this.prisma.question.createMany({
      data: questions,
    });

    await this.invalidateExamCache(examId);
    await this.invalidateQuestionCache();

    await this.auditLogService.log({
      userId,
      action: 'TRAINING_QUESTIONS_BULK_CREATED',
      entity: 'Question',
      newValue: { examId, count: questions.length },
    });

    return { success: true, count: questions.length };
  }
  async getQuestionTemplate() {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Template');

    worksheet.columns = [
      { header: 'Pertanyaan', key: 'question', width: 40 },
      { header: 'Opsi A', key: 'optionA', width: 25 },
      { header: 'Opsi B', key: 'optionB', width: 25 },
      { header: 'Opsi C', key: 'optionC', width: 25 },
      { header: 'Opsi D', key: 'optionD', width: 25 },
      { header: 'Jawaban Benar', key: 'correctAnswer', width: 30 },
    ];

    // Add sample row
    worksheet.addRow({
      question: 'Contoh: Apa kepanjangan dari APD?',
      optionA: 'Alat Pelindung Diri',
      optionB: 'Alat Penyelamat Diri',
      optionC: 'Alat Pembantu Diri',
      optionD: 'Alat Pengaman Diri',
      correctAnswer: 'Alat Pelindung Diri',
    });

    // Style the header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async uploadQuestionImage(
    questionId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question || question.isDeleted) {
      throw new NotFoundException('Question not found');
    }

    // Upload to MinIO
    const filename = `questions/${questionId}/${Date.now()}-${file.originalname}`;
    const url = await this.minioService.uploadFile(file, filename);

    const updated = await this.prisma.question.update({
      where: { id: questionId },
      data: { imageUrl: url },
    });

    if (question.examId) {
      await this.invalidateExamCache(question.examId);
    }
    await this.invalidateQuestionCache(questionId);

    await this.auditLogService.log({
      userId,
      action: 'TRAINING_QUESTION_IMAGE_UPLOADED',
      entity: 'Question',
      entityId: questionId,
      newValue: { imageUrl: url },
    });

    return updated;
  }

  async updateQuestion(id: string, dto: UpdateQuestionDto, userId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
    });

    if (!question || question.isDeleted) {
      throw new NotFoundException('Question not found');
    }

    // If options are being updated, validate correctAnswer is in options
    if (
      dto.options &&
      dto.correctAnswer &&
      !dto.options.includes(dto.correctAnswer)
    ) {
      throw new BadRequestException(
        'Correct answer must be one of the options',
      );
    }

    // If only correctAnswer is being updated, validate it against existing options
    if (
      !dto.options &&
      dto.correctAnswer &&
      !question.options.includes(dto.correctAnswer)
    ) {
      throw new BadRequestException(
        'Correct answer must be one of the existing options',
      );
    }

    const updated = await this.prisma.question.update({
      where: { id },
      data: {
        question: dto.question ?? question.question,
        options: dto.options ?? question.options,
        correctAnswer: dto.correctAnswer ?? question.correctAnswer,
        imageUrl: dto.imageUrl ?? question.imageUrl,
      },
    });

    await this.invalidateExamCache(question.examId ?? undefined);
    await this.invalidateQuestionCache(id);

    await this.auditLogService.log({
      userId,
      action: 'TRAINING_QUESTION_UPDATED',
      entity: 'Question',
      entityId: id,
      newValue: { question: updated.question },
    });

    return updated;
  }

  async deleteQuestion(id: string, userId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
    });

    if (!question || question.isDeleted) {
      throw new NotFoundException('Question not found');
    }

    const deleted = await this.prisma.question.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });

    await this.invalidateExamCache(question.examId ?? undefined);
    await this.invalidateQuestionCache(id);

    await this.auditLogService.log({
      userId,
      action: 'TRAINING_QUESTION_DELETED',
      entity: 'Question',
      entityId: id,
      newValue: { question: question.question },
    });

    return deleted;
  }
}
