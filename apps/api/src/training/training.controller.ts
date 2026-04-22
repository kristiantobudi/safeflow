import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import * as Yup from 'yup';
import { TrainingService } from './training.service';
import { UpdateModuleDto } from './dto/update-module.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@repo/database';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { YupValidationPipe } from '../common/pipes/yup-validation.pipe';
import { createModuleSchema, createExamSchema } from '@repo/validation';
import { memoryStorage } from 'multer';

@Controller()
@UseInterceptors(TransformInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  // ─── Module endpoints ─────────────────────────────────────────────────────

  /**
   * POST /api/v1/modules
   * Create a new training module (ADMIN only)
   */
  @Post('modules')
  @Roles(Role.ADMIN)
  createModule(
    @Body(new YupValidationPipe(createModuleSchema))
    dto: Yup.InferType<typeof createModuleSchema>,
    @CurrentUser('id') userId: string,
  ) {
    return this.trainingService.createModule(dto as any, userId);
  }

  /**
   * GET /api/v1/modules
   * List all training modules (ADMIN only)
   */
  @Get('modules')
  @Roles(Role.ADMIN)
  findAllModules() {
    return this.trainingService.findAllModules();
  }

  /**
   * GET /api/v1/modules/:id
   * Get module details with files and exam (ADMIN only)
   */
  @Get('modules/:id')
  @Roles(Role.ADMIN)
  findModuleById(@Param('id') id: string) {
    return this.trainingService.findModuleById(id);
  }

  /**
   * PATCH /api/v1/modules/:id
   * Update a training module (ADMIN only)
   */
  @Patch('modules/:id')
  @Roles(Role.ADMIN)
  updateModule(
    @Param('id') id: string,
    @Body() updateModuleDto: UpdateModuleDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.trainingService.updateModule(id, updateModuleDto, userId);
  }

  /**
   * DELETE /api/v1/modules/:id
   * Soft-delete a training module (ADMIN only)
   */
  @Delete('modules/:id')
  @Roles(Role.ADMIN)
  deleteModule(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.trainingService.deleteModule(id, userId);
  }

  /**
   * POST /api/v1/modules/:id/files
   * Upload a file to a training module (ADMIN only)
   */
  @Post('modules/:id/files')
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'video/mp4',
          'video/mpeg',
          'video/quicktime',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Only PDF, video, and image files are allowed'), false);
        }
      },
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
    }),
  )
  uploadModuleFile(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }), // 100MB
          new FileTypeValidator({
            fileType: /(pdf|mp4|mpeg|quicktime|jpeg|png|gif|webp)/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    return this.trainingService.uploadModuleFile(id, file, userId);
  }

  /**
   * DELETE /api/v1/modules/:id/files/:fileId
   * Delete a file from a training module (ADMIN only)
   */
  @Delete('modules/:id/files/:fileId')
  @Roles(Role.ADMIN)
  deleteModuleFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.trainingService.deleteModuleFile(id, fileId, userId);
  }

  // ─── Exam endpoints ───────────────────────────────────────────────────────

  /**
   * POST /api/v1/exams
   * Create a new exam for a module (ADMIN only)
   */
  @Post('exams')
  @Roles(Role.ADMIN)
  createExam(
    @Body(new YupValidationPipe(createExamSchema))
    dto: Yup.InferType<typeof createExamSchema>,
    @CurrentUser('id') userId: string,
  ) {
    return this.trainingService.createExam(dto as any, userId);
  }

  /**
   * GET /api/v1/exams/:id
   * Get exam details with questions (ADMIN only)
   */
  @Get('exams/:id')
  @Roles(Role.ADMIN)
  findExamById(@Param('id') id: string) {
    return this.trainingService.findExamById(id);
  }

  /**
   * GET /api/v1/exams
   * List all exams (ADMIN only)
   */
  @Get('exams')
  @Roles(Role.ADMIN)
  findAllExams() {
    return this.trainingService.findAllExams();
  }

  /**
   * GET /api/v1/exams/questions/template
   * Download Excel template for bulk question upload
   */
  @Get('exams/questions/template')
  @Roles(Role.ADMIN)
  async downloadQuestionTemplate(@Res() res: Response) {
    const buffer = await this.trainingService.getQuestionTemplate();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=template_soal_ujian.xlsx',
      'Content-Length': (buffer as any).length,
    });
    res.end(buffer);
  }

  // ─── Question endpoints ───────────────────────────────────────────────────

  /**
   * POST /api/v1/questions
   * Create a new question (ADMIN only)
   */
  @Post('questions')
  @Roles(Role.ADMIN)
  createQuestion(
    @Body() createQuestionDto: CreateQuestionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.trainingService.createQuestion(createQuestionDto, userId);
  }

  /**
   * POST /api/v1/exams/:examId/questions/bulk
   * Bulk upload questions for an exam (ADMIN only)
   */
  @Post('exams/:examId/questions/bulk')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  bulkUploadQuestions(
    @Param('examId') examId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    return this.trainingService.bulkCreateQuestions(examId, file, userId);
  }

  /**
   * POST /api/v1/questions/:id/image
   * Upload an image for a question (ADMIN only)
   */
  @Post('questions/:id/image')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadQuestionImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({
            fileType: /(jpeg|png|webp)/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    return this.trainingService.uploadQuestionImage(id, file, userId);
  }

  /**
   * PATCH /api/v1/questions/:id
   * Update a question (ADMIN only)
   */
  @Patch('questions/:id')
  @Roles(Role.ADMIN)
  updateQuestion(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.trainingService.updateQuestion(id, updateQuestionDto, userId);
  }

  /**
   * DELETE /api/v1/questions/:id
   * Soft-delete a question (ADMIN only)
   */
  @Delete('questions/:id')
  @Roles(Role.ADMIN)
  deleteQuestion(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.trainingService.deleteQuestion(id, userId);
  }
}
