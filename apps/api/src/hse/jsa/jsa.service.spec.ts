import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JsaService } from './jsa.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { RedisService } from '../../common/redis/redis.service';
import { ApprovalStatus, Role, VersionStatus } from '@repo/database';

// ─── Mock factories ──────────────────────────────────────────────────────────

const makeMockPrisma = () => ({
  jsaProject: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  jsaProjectVersion: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  jsaVersionApproval: {
    createMany: jest.fn(),
  },
  hirac: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
});

const mockAuditLogService = { log: jest.fn() };
const mockRedisService = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeJsaProject(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'jsa-1',
    noJsa: 'JSA-001',
    jenisKegiatan: 'Pekerjaan Las',
    lokasiKegiatan: 'Area A',
    referensiHirarc: null,
    pelaksanaUtama: null,
    hseInCharge: null,
    createdBy: 'user-1',
    isDeleted: false,
    approvalStatus: ApprovalStatus.PENDING,
    currentVersionId: null,
    revisiKe: 0,
    tanggalDibuat: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeJsaProjectWithRelations(overrides: Partial<Record<string, any>> = {}) {
  return {
    ...makeJsaProject(overrides),
    creator: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    apd: [],
    versions: [],
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('JsaService', () => {
  let service: JsaService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(async () => {
    prisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JsaService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<JsaService>(JsaService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ─────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      jenisKegiatan: 'Pekerjaan Las',
      lokasiKegiatan: 'Area A',
      referensiHirarc: undefined,
      pelaksanaUtama: undefined,
      hseInCharge: undefined,
    };
    const userId = 'user-1';

    it('should create a JsaProject with correct data and soft-delete pattern', async () => {
      const created = makeJsaProject();
      prisma.jsaProject.create.mockResolvedValue(created);

      const result = await service.create(dto, userId);

      expect(prisma.jsaProject.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jenisKegiatan: dto.jenisKegiatan,
          lokasiKegiatan: dto.lokasiKegiatan ?? null,
          createdBy: userId,
          isDeleted: false,
          approvalStatus: ApprovalStatus.PENDING,
        }),
      });
      expect(result).toEqual(created);
    });

    it('should invalidate Redis cache after create', async () => {
      const created = makeJsaProject();
      prisma.jsaProject.create.mockResolvedValue(created);

      await service.create(dto, userId);

      expect(mockRedisService.del).toHaveBeenCalledWith(`jsa:${created.id}`);
      expect(mockRedisService.del).toHaveBeenCalledWith('jsa:all');
      expect(mockRedisService.del).toHaveBeenCalledWith(`jsa:user:${userId}`);
    });

    it('should log audit after create', async () => {
      const created = makeJsaProject();
      prisma.jsaProject.create.mockResolvedValue(created);

      await service.create(dto, userId);

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'JSA_CREATED',
          entity: 'JsaProject',
          entityId: created.id,
        }),
      );
    });

    it('should set optional fields to null when not provided', async () => {
      const dtoMinimal = { jenisKegiatan: 'Inspeksi' };
      const created = makeJsaProject({ jenisKegiatan: 'Inspeksi' });
      prisma.jsaProject.create.mockResolvedValue(created);

      await service.create(dtoMinimal, userId);

      expect(prisma.jsaProject.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          lokasiKegiatan: null,
          referensiHirarc: null,
          pelaksanaUtama: null,
          hseInCharge: null,
        }),
      });
    });
  });

  // ─── findAll ────────────────────────────────────────────────────────────

  describe('findAll', () => {
    const jsaList = [makeJsaProject()];

    beforeEach(() => {
      mockRedisService.get.mockResolvedValue(null);
      prisma.jsaProject.findMany.mockResolvedValue(jsaList);
    });

    it('USER role: should only return JSA milik user tersebut (filter by createdBy)', async () => {
      await service.findAll('user-1', Role.USER);

      expect(prisma.jsaProject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isDeleted: false, createdBy: 'user-1' },
        }),
      );
    });

    it('ADMIN role: should return all JSA (no createdBy filter)', async () => {
      await service.findAll('admin-1', Role.ADMIN);

      expect(prisma.jsaProject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isDeleted: false },
        }),
      );
    });

    it('VERIFICATOR role: should return all JSA (no createdBy filter)', async () => {
      await service.findAll('verificator-1', Role.VERIFICATOR);

      expect(prisma.jsaProject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isDeleted: false },
        }),
      );
    });

    it('EXAMINER role: should return all JSA (no createdBy filter)', async () => {
      await service.findAll('examiner-1', Role.EXAMINER);

      expect(prisma.jsaProject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isDeleted: false },
        }),
      );
    });

    it('should return cached data when cache hit', async () => {
      const cached = [makeJsaProject({ id: 'cached-jsa' })];
      mockRedisService.get.mockResolvedValue(cached);

      const result = await service.findAll('user-1', Role.USER);

      expect(result).toEqual(cached);
      expect(prisma.jsaProject.findMany).not.toHaveBeenCalled();
    });

    it('should cache result after DB query', async () => {
      await service.findAll('user-1', Role.USER);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        'jsa:user:user-1',
        jsaList,
        3600,
      );
    });

    it('ADMIN should use cache key jsa:all', async () => {
      await service.findAll('admin-1', Role.ADMIN);

      expect(mockRedisService.get).toHaveBeenCalledWith('jsa:all');
      expect(mockRedisService.set).toHaveBeenCalledWith('jsa:all', jsaList, 3600);
    });

    it('USER should use cache key jsa:user:<userId>', async () => {
      await service.findAll('user-1', Role.USER);

      expect(mockRedisService.get).toHaveBeenCalledWith('jsa:user:user-1');
    });
  });

  // ─── findOne ────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return JSA by ID with relations when found', async () => {
      const jsa = makeJsaProjectWithRelations();
      mockRedisService.get.mockResolvedValue(null);
      prisma.jsaProject.findUnique.mockResolvedValue(jsa);

      const result = await service.findOne('jsa-1');

      expect(prisma.jsaProject.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'jsa-1' } }),
      );
      expect(result).toEqual(jsa);
    });

    it('should throw NotFoundException when JSA not found (null)', async () => {
      mockRedisService.get.mockResolvedValue(null);
      prisma.jsaProject.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when JSA is soft-deleted (isDeleted: true)', async () => {
      const deletedJsa = makeJsaProjectWithRelations({ isDeleted: true });
      mockRedisService.get.mockResolvedValue(null);
      prisma.jsaProject.findUnique.mockResolvedValue(deletedJsa);

      await expect(service.findOne('jsa-1')).rejects.toThrow(NotFoundException);
    });

    it('should return cached data when cache hit', async () => {
      const cached = makeJsaProjectWithRelations({ id: 'jsa-cached' });
      mockRedisService.get.mockResolvedValue(cached);

      const result = await service.findOne('jsa-cached');

      expect(result).toEqual(cached);
      expect(prisma.jsaProject.findUnique).not.toHaveBeenCalled();
    });

    it('should cache result after DB query', async () => {
      const jsa = makeJsaProjectWithRelations();
      mockRedisService.get.mockResolvedValue(null);
      prisma.jsaProject.findUnique.mockResolvedValue(jsa);

      await service.findOne('jsa-1');

      expect(mockRedisService.set).toHaveBeenCalledWith('jsa:jsa-1', jsa, 3600);
    });
  });

  // ─── submit ─────────────────────────────────────────────────────────────

  describe('submit', () => {
    const userId = 'user-1';
    const jsaId = 'jsa-1';

    const pendingJsa = makeJsaProjectWithRelations({
      id: jsaId,
      createdBy: userId,
      approvalStatus: ApprovalStatus.PENDING,
    });

    const hiracWithVersion = {
      id: 'hirac-1',
      versions: [{ id: 'hirac-version-1' }],
    };

    const createdVersion = {
      id: 'version-1',
      jsaId,
      versionNumber: 1,
      status: VersionStatus.SUBMITTED,
    };

    const updatedJsa = makeJsaProject({
      id: jsaId,
      approvalStatus: ApprovalStatus.SUBMITTED,
      currentVersionId: 'version-1',
    });

    beforeEach(() => {
      // findOne will use cache miss → DB
      mockRedisService.get.mockResolvedValue(null);
      prisma.jsaProject.findUnique.mockResolvedValue(pendingJsa);
      prisma.jsaProjectVersion.findFirst.mockResolvedValue(null);
      prisma.hirac.findFirst.mockResolvedValue(hiracWithVersion);

      // Mock $transaction to execute the callback
      prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          jsaProjectVersion: { create: jest.fn().mockResolvedValue(createdVersion) },
          jsaVersionApproval: { createMany: jest.fn().mockResolvedValue({ count: 3 }) },
          jsaProject: { update: jest.fn().mockResolvedValue(updatedJsa) },
        };
        return cb(tx);
      });
    });

    it('should change approvalStatus to SUBMITTED', async () => {
      const result = await service.submit(jsaId, userId);

      expect(result.approvalStatus).toBe(ApprovalStatus.SUBMITTED);
    });

    it('should create JsaProjectVersion with incremental versionNumber starting at 1', async () => {
      prisma.jsaProjectVersion.findFirst.mockResolvedValue(null); // no previous version

      await service.submit(jsaId, userId);

      prisma.$transaction.mock.calls[0][0]({
        jsaProjectVersion: {
          create: jest.fn((args) => {
            expect(args.data.versionNumber).toBe(1);
            expect(args.data.jsaId).toBe(jsaId);
            expect(args.data.status).toBe(VersionStatus.SUBMITTED);
            return Promise.resolve(createdVersion);
          }),
        },
        jsaVersionApproval: { createMany: jest.fn().mockResolvedValue({ count: 3 }) },
        jsaProject: { update: jest.fn().mockResolvedValue(updatedJsa) },
      });
    });

    it('should increment versionNumber based on last existing version', async () => {
      prisma.jsaProjectVersion.findFirst.mockResolvedValue({ versionNumber: 3 });

      let capturedVersionNumber: number | undefined;
      prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          jsaProjectVersion: {
            create: jest.fn((args) => {
              capturedVersionNumber = args.data.versionNumber;
              return Promise.resolve({ ...createdVersion, versionNumber: 4 });
            }),
          },
          jsaVersionApproval: { createMany: jest.fn().mockResolvedValue({ count: 3 }) },
          jsaProject: { update: jest.fn().mockResolvedValue(updatedJsa) },
        };
        return cb(tx);
      });

      await service.submit(jsaId, userId);

      expect(capturedVersionNumber).toBe(4);
    });

    it('should create JsaVersionApproval steps: VERIFICATOR → EXAMINER → ADMIN', async () => {
      let capturedApprovalData: any[] | undefined;

      prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          jsaProjectVersion: { create: jest.fn().mockResolvedValue(createdVersion) },
          jsaVersionApproval: {
            createMany: jest.fn((args) => {
              capturedApprovalData = args.data;
              return Promise.resolve({ count: 3 });
            }),
          },
          jsaProject: { update: jest.fn().mockResolvedValue(updatedJsa) },
        };
        return cb(tx);
      });

      await service.submit(jsaId, userId);

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

    it('should log audit with JSA_SUBMITTED action', async () => {
      await service.submit(jsaId, userId);

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'JSA_SUBMITTED',
          entity: 'JsaProject',
          entityId: jsaId,
        }),
      );
    });

    it('should invalidate Redis cache after submit', async () => {
      await service.submit(jsaId, userId);

      expect(mockRedisService.del).toHaveBeenCalledWith(`jsa:${jsaId}`);
      expect(mockRedisService.del).toHaveBeenCalledWith('jsa:all');
      expect(mockRedisService.del).toHaveBeenCalledWith(`jsa:user:${userId}`);
    });

    it('should throw ForbiddenException when submitter is not the creator', async () => {
      const otherUserJsa = makeJsaProjectWithRelations({
        id: jsaId,
        createdBy: 'other-user',
        approvalStatus: ApprovalStatus.PENDING,
      });
      prisma.jsaProject.findUnique.mockResolvedValue(otherUserJsa);

      await expect(service.submit(jsaId, userId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when JSA is already SUBMITTED', async () => {
      const submittedJsa = makeJsaProjectWithRelations({
        id: jsaId,
        createdBy: userId,
        approvalStatus: ApprovalStatus.SUBMITTED,
      });
      prisma.jsaProject.findUnique.mockResolvedValue(submittedJsa);

      await expect(service.submit(jsaId, userId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when JSA is APPROVED', async () => {
      const approvedJsa = makeJsaProjectWithRelations({
        id: jsaId,
        createdBy: userId,
        approvalStatus: ApprovalStatus.APPROVED,
      });
      prisma.jsaProject.findUnique.mockResolvedValue(approvedJsa);

      await expect(service.submit(jsaId, userId)).rejects.toThrow(BadRequestException);
    });

    it('should allow submit when JSA is REJECTED (re-submission)', async () => {
      const rejectedJsa = makeJsaProjectWithRelations({
        id: jsaId,
        createdBy: userId,
        approvalStatus: ApprovalStatus.REJECTED,
      });
      prisma.jsaProject.findUnique.mockResolvedValue(rejectedJsa);

      const result = await service.submit(jsaId, userId);

      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when JSA has no linked HIRAC', async () => {
      prisma.hirac.findFirst.mockResolvedValue(null);

      await expect(service.submit(jsaId, userId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when linked HIRAC has no versions', async () => {
      prisma.hirac.findFirst.mockResolvedValue({ id: 'hirac-1', versions: [] });

      await expect(service.submit(jsaId, userId)).rejects.toThrow(BadRequestException);
    });
  });
});
