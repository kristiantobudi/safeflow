import { Test, TestingModule } from '@nestjs/testing';
import { HiracService } from './hirac.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { RedisService } from '../../common/redis/redis.service';
import { ProjectStatus } from '@repo/database';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockPrismaService = {
  project: { findUnique: jest.fn() },
  hirac: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockAuditLogService = { log: jest.fn() };
const mockRedisService = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

describe('HiracService', () => {
  let service: HiracService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HiracService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<HiracService>(HiracService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── addHiracToProject ────────────────────────────────────────────────────

  describe('addHiracToProject', () => {
    const projectId = 'proj-1';
    const userId = 'user-123';

    it('should add hirac when project is DRAFT', async () => {
      const dto: any = {
        kegiatan: 'Testing',
        penilaianAwal: { akibat: 2, kemungkinan: '3', tingkatRisiko: 'M' },
        penilaianLanjutan: { akibat: 1, kemungkinan: '2', tingkatRisiko: 'L' },
      };

      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        status: ProjectStatus.DRAFT,
      });
      mockPrismaService.hirac.create.mockResolvedValue({
        id: 'hirac-1',
        ...dto,
      });

      const result = await service.addHiracToProject(projectId, dto, userId);

      expect(result).toBeDefined();
      expect(mockPrismaService.hirac.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ projectId, isActive: true }),
        }),
      );
    });

    it('should add hirac when project is REVISION', async () => {
      const dto: any = {
        kegiatan: 'Revised item',
        penilaianAwal: { akibat: 2, kemungkinan: '2', tingkatRisiko: 'L' },
        penilaianLanjutan: { akibat: 1, kemungkinan: '1', tingkatRisiko: 'L' },
      };

      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        status: ProjectStatus.REVISION,
      });
      mockPrismaService.hirac.create.mockResolvedValue({
        id: 'hirac-2',
        ...dto,
      });

      const result = await service.addHiracToProject(projectId, dto, userId);
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if project is APPROVED', async () => {
      const dto: any = { kegiatan: 'Testing' };
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        status: ProjectStatus.APPROVED,
      });

      await expect(
        service.addHiracToProject(projectId, dto, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if project is under review (L1_REVIEW)', async () => {
      const dto: any = { kegiatan: 'Testing' };
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: projectId,
        status: ProjectStatus.L1_REVIEW,
      });

      await expect(
        service.addHiracToProject(projectId, dto, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── updateHirac ──────────────────────────────────────────────────────────

  describe('updateHirac', () => {
    it('should update hirac if project is in REVISION', async () => {
      const id = 'hirac-1';
      const userId = 'user-123';
      const dto = { kegiatan: 'Updated activity' };

      mockPrismaService.hirac.findUnique.mockResolvedValue({
        id,
        projectId: 'proj-1',
        isActive: true,
      });
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        status: ProjectStatus.REVISION,
      });
      mockPrismaService.hirac.update.mockResolvedValue({ id, ...dto });

      const result = await service.updateHirac(id, dto, userId);
      expect(result.kegiatan).toBe('Updated activity');
    });

    it('should throw BadRequestException if hirac is inactive', async () => {
      mockPrismaService.hirac.findUnique.mockResolvedValue({
        id: 'hirac-1',
        projectId: 'proj-1',
        isActive: false,
      });
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        status: ProjectStatus.REVISION,
      });

      await expect(
        service.updateHirac('hirac-1', {}, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── deleteHirac (soft-delete) ────────────────────────────────────────────

  describe('deleteHirac', () => {
    it('should soft-delete (isActive=false) instead of hard delete', async () => {
      const id = 'hirac-1';
      const userId = 'user-123';

      mockPrismaService.hirac.findUnique.mockResolvedValue({
        id,
        projectId: 'proj-1',
        isActive: true,
      });
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        status: ProjectStatus.DRAFT,
      });
      mockPrismaService.hirac.update.mockResolvedValue({ id, isActive: false });

      const result = await service.deleteHirac(id, userId);

      // Harus update (soft-delete) bukan delete
      expect(mockPrismaService.hirac.update).toHaveBeenCalledWith({
        where: { id },
        data: { isActive: false },
      });
      expect(mockPrismaService.hirac.delete).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException if hirac not found', async () => {
      mockPrismaService.hirac.findUnique.mockResolvedValue(null);

      await expect(service.deleteHirac('ghost-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── restoreHirac ─────────────────────────────────────────────────────────

  describe('restoreHirac', () => {
    it('should restore a soft-deleted hirac', async () => {
      const id = 'hirac-1';
      const userId = 'user-123';

      mockPrismaService.hirac.findUnique.mockResolvedValue({
        id,
        projectId: 'proj-1',
        isActive: false,
      });
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        status: ProjectStatus.REVISION,
      });
      mockPrismaService.hirac.update.mockResolvedValue({ id, isActive: true });

      const result = await service.restoreHirac(id, userId);
      expect(result.isActive).toBe(true);
    });

    it('should throw BadRequestException if hirac is already active', async () => {
      mockPrismaService.hirac.findUnique.mockResolvedValue({
        id: 'hirac-1',
        projectId: 'proj-1',
        isActive: true,
      });
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        status: ProjectStatus.REVISION,
      });

      await expect(service.restoreHirac('hirac-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
