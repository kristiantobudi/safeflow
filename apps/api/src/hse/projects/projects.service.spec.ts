import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { ProjectVersionService } from './project-version.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import {
  ProjectStatus,
  Role,
  ApprovalStatus,
  VersionStatus,
} from '@repo/database';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

const mockPrismaService = {
  project: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  versionApproval: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrismaService)),
};

const mockAuditLogService = { log: jest.fn() };
const mockRedisService = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
const mockProjectVersionService = {
  createSnapshot: jest.fn(),
  markVersionRejected: jest.fn(),
  markVersionApproved: jest.fn(),
  listVersions: jest.fn(),
  compareVersions: jest.fn(),
};

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ProjectVersionService, useValue: mockProjectVersionService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a project with DRAFT status', async () => {
      const dto = { unitKerja: 'Test Unit' };
      const userId = 'user-123';
      mockPrismaService.project.create.mockResolvedValue({
        id: 'proj-1',
        ...dto,
        status: ProjectStatus.DRAFT,
      });

      const result = await service.create(dto, userId);

      expect(result.status).toBe(ProjectStatus.DRAFT);
      expect(mockPrismaService.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          unitKerja: 'Test Unit',
          status: ProjectStatus.DRAFT,
          createdBy: userId,
        }),
      });
    });
  });

  // ─── submitProject ────────────────────────────────────────────────────────

  describe('submitProject', () => {
    const id = 'proj-1';
    const userId = 'user-123';

    const mockProject = {
      id,
      createdBy: userId,
      status: ProjectStatus.DRAFT,
      hiracs: [{ id: 'hirac-1' }],
      isDeleted: false,
      versions: [],
    };

    it('should create approval steps and snapshot HIRACs on submit', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.project.update.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.L1_REVIEW,
      });
      mockProjectVersionService.createSnapshot.mockResolvedValue('version-1');

      await service.submitProject(id, userId, 'Initial submission');

      expect(mockPrismaService.versionApproval.createMany).toHaveBeenCalled();
      expect(mockPrismaService.project.update).toHaveBeenCalledWith({
        where: { id },
        data: { status: ProjectStatus.L1_REVIEW },
      });
      expect(mockProjectVersionService.createSnapshot).toHaveBeenCalledWith(
        id,
        userId,
        undefined,
        'Initial submission',
        expect.anything(),
      );
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PROJECT_SUBMITTED' }),
      );
    });

    it('should throw ForbiddenException if user is not creator', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        ...mockProject,
        createdBy: 'other-user',
      });

      await expect(service.submitProject(id, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if no HIRACs', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        ...mockProject,
        hiracs: [],
      });

      await expect(service.submitProject(id, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if status is not DRAFT or REVISION', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.APPROVED,
      });

      await expect(service.submitProject(id, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should re-submit from REVISION and create new snapshot', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.REVISION,
      });
      mockPrismaService.project.update.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.L1_REVIEW,
      });
      mockProjectVersionService.createSnapshot.mockResolvedValue('version-2');

      await service.submitProject(id, userId, 'Fixed APD controls');

      expect(mockProjectVersionService.createSnapshot).toHaveBeenCalledWith(
        id,
        userId,
        undefined,
        'Fixed APD controls',
        expect.anything(),
      );
    });
  });

  // ─── approveProject ───────────────────────────────────────────────────────

  describe('approveProject', () => {
    const id = 'proj-1';

    it('should advance to L2_REVIEW on step 1 approval', async () => {
      const userId = 'verificator-1';
      mockPrismaService.project.findUnique.mockResolvedValue({
        id,
        status: ProjectStatus.L1_REVIEW,
        isDeleted: false,
        versions: [{ approvalSteps: [{ id: 'step-1', stepOrder: 1, requiredRole: Role.VERIFICATOR, status: ApprovalStatus.PENDING }] }]
      });
      mockPrismaService.versionApproval.findFirst.mockResolvedValue({
        id: 'step-1',
        stepOrder: 1,
        requiredRole: Role.VERIFICATOR,
      });
      mockPrismaService.project.update.mockResolvedValue({
        id,
        status: ProjectStatus.L2_REVIEW,
      });

      await service.approveProject(id, userId, Role.VERIFICATOR, {
        note: 'OK',
      });

      expect(mockPrismaService.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ProjectStatus.L2_REVIEW }),
        }),
      );
      // Not final step: markVersionApproved should NOT be called
      expect(
        mockProjectVersionService.markVersionApproved,
      ).not.toHaveBeenCalled();
    });

    it('should advance to APPROVED and mark version on final step', async () => {
      const userId = 'examiner-1';
      mockPrismaService.project.findUnique.mockResolvedValue({
        id,
        status: ProjectStatus.L2_REVIEW,
        isDeleted: false,
        versions: [{ approvalSteps: [{ id: 'step-2', stepOrder: 2, requiredRole: Role.EXAMINER, status: ApprovalStatus.PENDING }] }]
      });
      mockPrismaService.versionApproval.findFirst.mockResolvedValue({
        id: 'step-2',
        stepOrder: 2,
        requiredRole: Role.EXAMINER,
      });
      mockPrismaService.project.update.mockResolvedValue({
        id,
        status: ProjectStatus.APPROVED,
      });

      await service.approveProject(id, userId, Role.EXAMINER, {
        note: 'Excellent',
      });

      expect(mockPrismaService.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ProjectStatus.APPROVED }),
        }),
      );
      expect(
        mockProjectVersionService.markVersionApproved,
      ).toHaveBeenCalledWith(id, userId, 'Excellent');
    });
  });

  // ─── rejectProject ────────────────────────────────────────────────────────

  describe('rejectProject', () => {
    const id = 'proj-1';
    const userId = 'verificator-1';

    it('should push status to REVISION and mark version REJECTED', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id,
        status: ProjectStatus.L1_REVIEW,
        isDeleted: false,
        createdBy: 'user-123',
        versions: [{ approvalSteps: [{ id: 'step-1', stepOrder: 1, requiredRole: Role.VERIFICATOR, status: ApprovalStatus.PENDING }] }]
      });
      mockPrismaService.versionApproval.findFirst.mockResolvedValue({
        id: 'step-1',
        stepOrder: 1,
        requiredRole: Role.VERIFICATOR,
      });
      mockPrismaService.project.update.mockResolvedValue({
        id,
        status: ProjectStatus.REVISION,
      });

      await service.rejectProject(id, userId, Role.VERIFICATOR, {
        note: 'Perlu perbaikan APD',
      });

      expect(mockPrismaService.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ProjectStatus.REVISION }),
        }),
      );
      expect(
        mockProjectVersionService.markVersionRejected,
      ).toHaveBeenCalledWith(id, userId, 'Perlu perbaikan APD');
    });

    it('should throw ForbiddenException if role mismatch', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id,
        status: ProjectStatus.L1_REVIEW,
        isDeleted: false,
        versions: [{ approvalSteps: [{ id: 'step-1', stepOrder: 1, requiredRole: Role.EXAMINER, status: ApprovalStatus.PENDING }] }]
      });
      mockPrismaService.versionApproval.findFirst.mockResolvedValue({
        id: 'step-1',
        stepOrder: 1,
        requiredRole: Role.EXAMINER, // step requires EXAMINER
      });

      await expect(
        service.rejectProject(id, userId, Role.VERIFICATOR, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── compareVersions ──────────────────────────────────────────────────────

  describe('compareVersions', () => {
    it('should delegate to ProjectVersionService.compareVersions', async () => {
      const mockDiff = {
        summary: { added: 1, modified: 2, removed: 0, unchanged: 3 },
        rows: [],
      };
      mockProjectVersionService.compareVersions.mockResolvedValue(mockDiff);

      const result = await service.compareVersions('proj-1', 1, 2);

      expect(mockProjectVersionService.compareVersions).toHaveBeenCalledWith(
        'proj-1',
        1,
        2,
      );
      expect(result).toEqual(mockDiff);
    });
  });
});
