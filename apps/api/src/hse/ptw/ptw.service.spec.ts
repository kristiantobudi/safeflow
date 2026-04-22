import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PtwService } from './ptw.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { RedisService } from '../../common/redis/redis.service';
import { ApprovalStatus, Role, VersionStatus } from '@repo/database';

// ─── Mock factories ──────────────────────────────────────────────────────────

const makeMockPrisma = () => ({
  ptwProject: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  ptwProjectVersion: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  ptwVersionApproval: {
    createMany: jest.fn(),
  },
  jsaProject: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
});

const mockAuditLogService = { log: jest.fn() };
const mockRedisService = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePtwProject(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'ptw-1',
    noPtw: null,
    judulPekerjaan: 'Pekerjaan Pengelasan',
    jsaProjectId: 'jsa-1',
    lokasiPekerjaan: 'Area B',
    tanggalMulai: null,
    tanggalSelesai: null,
    keteranganTambahan: null,
    createdBy: 'user-1',
    isDeleted: false,
    approvalStatus: ApprovalStatus.PENDING,
    currentVersionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function makePtwProjectWithRelations(overrides: Partial<Record<string, any>> = {}) {
  return {
    ...makePtwProject(overrides),
    creator: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    jsaProject: {
      id: 'jsa-1',
      noJsa: 'JSA-001',
      jenisKegiatan: 'Pekerjaan Las',
      lokasiKegiatan: 'Area A',
      approvalStatus: ApprovalStatus.APPROVED,
    },
    versions: [],
  };
}

function makeApprovedJsa(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'jsa-1',
    approvalStatus: ApprovalStatus.APPROVED,
    isDeleted: false,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PtwService', () => {
  let service: PtwService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(async () => {
    prisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PtwService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<PtwService>(PtwService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ─────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      judulPekerjaan: 'Pekerjaan Pengelasan',
      jsaProjectId: 'jsa-1',
      lokasiPekerjaan: 'Area B',
    };
    const userId = 'user-1';

    it('should create a PtwProject when JSA is APPROVED', async () => {
      const approvedJsa = makeApprovedJsa();
      const created = makePtwProject();
      prisma.jsaProject.findUnique.mockResolvedValue(approvedJsa);
      prisma.ptwProject.create.mockResolvedValue(created);

      const result = await service.create(dto, userId);

      expect(prisma.ptwProject.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          judulPekerjaan: dto.judulPekerjaan,
          jsaProjectId: dto.jsaProjectId,
          createdBy: userId,
          isDeleted: false,
          approvalStatus: ApprovalStatus.PENDING,
        }),
      });
      expect(result).toEqual(created);
    });

    it('should throw NotFoundException when JSA does not exist', async () => {
      prisma.jsaProject.findUnique.mockResolvedValue(null);

      await expect(service.create(dto, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when JSA is soft-deleted', async () => {
      prisma.jsaProject.findUnique.mockResolvedValue(
        makeApprovedJsa({ isDeleted: true }),
      );

      await expect(service.create(dto, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when JSA is PENDING (not approved)', async () => {
      prisma.jsaProject.findUnique.mockResolvedValue(
        makeApprovedJsa({ approvalStatus: ApprovalStatus.PENDING }),
      );

      await expect(service.create(dto, userId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when JSA is SUBMITTED (not approved)', async () => {
      prisma.jsaProject.findUnique.mockResolvedValue(
        makeApprovedJsa({ approvalStatus: ApprovalStatus.SUBMITTED }),
      );

      await expect(service.create(dto, userId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when JSA is REJECTED', async () => {
      prisma.jsaProject.findUnique.mockResolvedValue(
        makeApprovedJsa({ approvalStatus: ApprovalStatus.REJECTED }),
      );

      await expect(service.create(dto, userId)).rejects.toThrow(BadRequestException);
    });

    it('should invalidate Redis cache after create', async () => {
      const created = makePtwProject();
      prisma.jsaProject.findUnique.mockResolvedValue(makeApprovedJsa());
      prisma.ptwProject.create.mockResolvedValue(created);

      await service.create(dto, userId);

      expect(mockRedisService.del).toHaveBeenCalledWith(`ptw:${created.id}`);
      expect(mockRedisService.del).toHaveBeenCalledWith('ptw:all');
      expect(mockRedisService.del).toHaveBeenCalledWith(`ptw:user:${userId}`);
    });

    it('should log audit after create', async () => {
      const created = makePtwProject();
      prisma.jsaProject.findUnique.mockResolvedValue(makeApprovedJsa());
      prisma.ptwProject.create.mockResolvedValue(created);

      await service.create(dto, userId);

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'PTW_CREATED',
          entity: 'PtwProject',
          entityId: created.id,
        }),
      );
    });

    it('should set optional fields to null when not provided', async () => {
      const dtoMinimal = {
        judulPekerjaan: 'Pekerjaan Inspeksi',
        jsaProjectId: 'jsa-1',
      };
      const created = makePtwProject({ judulPekerjaan: 'Pekerjaan Inspeksi' });
      prisma.jsaProject.findUnique.mockResolvedValue(makeApprovedJsa());
      prisma.ptwProject.create.mockResolvedValue(created);

      await service.create(dtoMinimal, userId);

      expect(prisma.ptwProject.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          lokasiPekerjaan: null,
          tanggalMulai: null,
          tanggalSelesai: null,
          keteranganTambahan: null,
        }),
      });
    });
  });

  // ─── findAll ────────────────────────────────────────────────────────────

  describe('findAll', () => {
    const ptwList = [makePtwProject()];

    beforeEach(() => {
      mockRedisService.get.mockResolvedValue(null);
      prisma.ptwProject.findMany.mockResolvedValue(ptwList);
    });

    it('USER role: should only return PTW milik user tersebut (filter by createdBy)', async () => {
      await service.findAll('user-1', Role.USER);

      expect(prisma.ptwProject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isDeleted: false, createdBy: 'user-1' },
        }),
      );
    });

    it('ADMIN role: should return all PTW (no createdBy filter)', async () => {
      await service.findAll('admin-1', Role.ADMIN);

      expect(prisma.ptwProject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isDeleted: false },
        }),
      );
    });

    it('VERIFICATOR role: should return all PTW (no createdBy filter)', async () => {
      await service.findAll('verificator-1', Role.VERIFICATOR);

      expect(prisma.ptwProject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isDeleted: false },
        }),
      );
    });

    it('EXAMINER role: should return all PTW (no createdBy filter)', async () => {
      await service.findAll('examiner-1', Role.EXAMINER);

      expect(prisma.ptwProject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isDeleted: false },
        }),
      );
    });

    it('should return cached data when cache hit', async () => {
      const cached = [makePtwProject({ id: 'cached-ptw' })];
      mockRedisService.get.mockResolvedValue(cached);

      const result = await service.findAll('user-1', Role.USER);

      expect(result).toEqual(cached);
      expect(prisma.ptwProject.findMany).not.toHaveBeenCalled();
    });

    it('should cache result after DB query', async () => {
      await service.findAll('user-1', Role.USER);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        'ptw:user:user-1',
        ptwList,
        3600,
      );
    });

    it('ADMIN should use cache key ptw:all', async () => {
      await service.findAll('admin-1', Role.ADMIN);

      expect(mockRedisService.get).toHaveBeenCalledWith('ptw:all');
      expect(mockRedisService.set).toHaveBeenCalledWith('ptw:all', ptwList, 3600);
    });

    it('USER should use cache key ptw:user:<userId>', async () => {
      await service.findAll('user-1', Role.USER);

      expect(mockRedisService.get).toHaveBeenCalledWith('ptw:user:user-1');
    });
  });

  // ─── findOne ────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return PTW by ID with relations when found', async () => {
      const ptw = makePtwProjectWithRelations();
      mockRedisService.get.mockResolvedValue(null);
      prisma.ptwProject.findUnique.mockResolvedValue(ptw);

      const result = await service.findOne('ptw-1');

      expect(prisma.ptwProject.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ptw-1' } }),
      );
      expect(result).toEqual(ptw);
    });

    it('should throw NotFoundException when PTW not found (null)', async () => {
      mockRedisService.get.mockResolvedValue(null);
      prisma.ptwProject.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when PTW is soft-deleted (isDeleted: true)', async () => {
      const deletedPtw = makePtwProjectWithRelations({ isDeleted: true });
      mockRedisService.get.mockResolvedValue(null);
      prisma.ptwProject.findUnique.mockResolvedValue(deletedPtw);

      await expect(service.findOne('ptw-1')).rejects.toThrow(NotFoundException);
    });

    it('should return cached data when cache hit', async () => {
      const cached = makePtwProjectWithRelations({ id: 'ptw-cached' });
      mockRedisService.get.mockResolvedValue(cached);

      const result = await service.findOne('ptw-cached');

      expect(result).toEqual(cached);
      expect(prisma.ptwProject.findUnique).not.toHaveBeenCalled();
    });

    it('should cache result after DB query', async () => {
      const ptw = makePtwProjectWithRelations();
      mockRedisService.get.mockResolvedValue(null);
      prisma.ptwProject.findUnique.mockResolvedValue(ptw);

      await service.findOne('ptw-1');

      expect(mockRedisService.set).toHaveBeenCalledWith('ptw:ptw-1', ptw, 3600);
    });
  });

  // ─── submit ─────────────────────────────────────────────────────────────

  describe('submit', () => {
    const userId = 'user-1';
    const ptwId = 'ptw-1';

    const pendingPtw = makePtwProjectWithRelations({
      id: ptwId,
      createdBy: userId,
      approvalStatus: ApprovalStatus.PENDING,
    });

    const createdVersion = {
      id: 'ptw-version-1',
      ptwId,
      versionNumber: 1,
      status: VersionStatus.SUBMITTED,
    };

    const updatedPtw = makePtwProject({
      id: ptwId,
      approvalStatus: ApprovalStatus.SUBMITTED,
      currentVersionId: 'ptw-version-1',
    });

    beforeEach(() => {
      mockRedisService.get.mockResolvedValue(null);
      prisma.ptwProject.findUnique.mockResolvedValue(pendingPtw);
      prisma.ptwProjectVersion.findFirst.mockResolvedValue(null);

      prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          ptwProjectVersion: { create: jest.fn().mockResolvedValue(createdVersion) },
          ptwVersionApproval: { createMany: jest.fn().mockResolvedValue({ count: 3 }) },
          ptwProject: { update: jest.fn().mockResolvedValue(updatedPtw) },
        };
        return cb(tx);
      });
    });

    it('should change approvalStatus to SUBMITTED', async () => {
      const result = await service.submit(ptwId, userId);

      expect(result.approvalStatus).toBe(ApprovalStatus.SUBMITTED);
    });

    it('should create PtwProjectVersion with versionNumber starting at 1', async () => {
      prisma.ptwProjectVersion.findFirst.mockResolvedValue(null);

      let capturedVersionData: any;
      prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          ptwProjectVersion: {
            create: jest.fn((args) => {
              capturedVersionData = args.data;
              return Promise.resolve(createdVersion);
            }),
          },
          ptwVersionApproval: { createMany: jest.fn().mockResolvedValue({ count: 3 }) },
          ptwProject: { update: jest.fn().mockResolvedValue(updatedPtw) },
        };
        return cb(tx);
      });

      await service.submit(ptwId, userId);

      expect(capturedVersionData.versionNumber).toBe(1);
      expect(capturedVersionData.ptwId).toBe(ptwId);
      expect(capturedVersionData.status).toBe(VersionStatus.SUBMITTED);
    });

    it('should increment versionNumber based on last existing version', async () => {
      prisma.ptwProjectVersion.findFirst.mockResolvedValue({ versionNumber: 2 });

      let capturedVersionNumber: number | undefined;
      prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          ptwProjectVersion: {
            create: jest.fn((args) => {
              capturedVersionNumber = args.data.versionNumber;
              return Promise.resolve({ ...createdVersion, versionNumber: 3 });
            }),
          },
          ptwVersionApproval: { createMany: jest.fn().mockResolvedValue({ count: 3 }) },
          ptwProject: { update: jest.fn().mockResolvedValue(updatedPtw) },
        };
        return cb(tx);
      });

      await service.submit(ptwId, userId);

      expect(capturedVersionNumber).toBe(3);
    });

    it('should create PtwVersionApproval steps: VERIFICATOR → EXAMINER → ADMIN', async () => {
      let capturedApprovalData: any[] | undefined;

      prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          ptwProjectVersion: { create: jest.fn().mockResolvedValue(createdVersion) },
          ptwVersionApproval: {
            createMany: jest.fn((args) => {
              capturedApprovalData = args.data;
              return Promise.resolve({ count: 3 });
            }),
          },
          ptwProject: { update: jest.fn().mockResolvedValue(updatedPtw) },
        };
        return cb(tx);
      });

      await service.submit(ptwId, userId);

      expect(capturedApprovalData).toHaveLength(3);
      expect(capturedApprovalData![0]).toMatchObject({
        stepOrder: 1,
        requiredRole: Role.VERIFICATOR,
        status: ApprovalStatus.PENDING,
      });
      expect(capturedApprovalData![1]).toMatchObject({
        stepOrder: 2,
        requiredRole: Role.EXAMINER,
        status: ApprovalStatus.PENDING,
      });
      expect(capturedApprovalData![2]).toMatchObject({
        stepOrder: 3,
        requiredRole: Role.ADMIN,
        status: ApprovalStatus.PENDING,
      });
    });

    it('should log audit with PTW_SUBMITTED action', async () => {
      await service.submit(ptwId, userId);

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'PTW_SUBMITTED',
          entity: 'PtwProject',
          entityId: ptwId,
        }),
      );
    });

    it('should invalidate Redis cache after submit', async () => {
      await service.submit(ptwId, userId);

      expect(mockRedisService.del).toHaveBeenCalledWith(`ptw:${ptwId}`);
      expect(mockRedisService.del).toHaveBeenCalledWith('ptw:all');
      expect(mockRedisService.del).toHaveBeenCalledWith(`ptw:user:${userId}`);
    });

    it('should throw ForbiddenException when submitter is not the creator', async () => {
      const otherUserPtw = makePtwProjectWithRelations({
        id: ptwId,
        createdBy: 'other-user',
        approvalStatus: ApprovalStatus.PENDING,
      });
      prisma.ptwProject.findUnique.mockResolvedValue(otherUserPtw);

      await expect(service.submit(ptwId, userId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when PTW is already SUBMITTED', async () => {
      const submittedPtw = makePtwProjectWithRelations({
        id: ptwId,
        createdBy: userId,
        approvalStatus: ApprovalStatus.SUBMITTED,
      });
      prisma.ptwProject.findUnique.mockResolvedValue(submittedPtw);

      await expect(service.submit(ptwId, userId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when PTW is APPROVED', async () => {
      const approvedPtw = makePtwProjectWithRelations({
        id: ptwId,
        createdBy: userId,
        approvalStatus: ApprovalStatus.APPROVED,
      });
      prisma.ptwProject.findUnique.mockResolvedValue(approvedPtw);

      await expect(service.submit(ptwId, userId)).rejects.toThrow(BadRequestException);
    });

    it('should allow submit when PTW is REJECTED (re-submission)', async () => {
      const rejectedPtw = makePtwProjectWithRelations({
        id: ptwId,
        createdBy: userId,
        approvalStatus: ApprovalStatus.REJECTED,
      });
      prisma.ptwProject.findUnique.mockResolvedValue(rejectedPtw);

      const result = await service.submit(ptwId, userId);

      expect(result).toBeDefined();
    });
  });
});
