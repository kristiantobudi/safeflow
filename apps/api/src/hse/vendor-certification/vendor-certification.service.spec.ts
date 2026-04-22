import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { VendorCertificationService } from './vendor-certification.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { RedisService } from '../../common/redis/redis.service';
import { VendorCertificationStatus } from '@repo/database';

// ─── Mock factories ──────────────────────────────────────────────────────────

const makeMockPrisma = () => ({
  user: {
    findUnique: jest.fn(),
  },
  vendor: {
    findUnique: jest.fn(),
  },
  certificationProgramModule: {
    findMany: jest.fn(),
  },
  vendorCertification: {
    findFirst: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  certificate: {
    findMany: jest.fn(),
  },
});

const mockAuditLogService = { log: jest.fn() };
const mockRedisService = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a minimal vendor object with a certificationProgram assigned.
 */
function makeVendor(vendorId: string) {
  return {
    id: vendorId,
    vendorName: 'TestVendor',
    deletedAt: null,
    certificationProgramId: 'program-1',
    certificationProgram: {
      id: 'program-1',
      name: 'Safety Program',
      validityDays: null,
    },
  };
}

/**
 * Build a required module entry for a certification program.
 */
function makeRequiredModule(moduleId: string) {
  return {
    moduleId,
    isRequired: true,
    order: 0,
    module: { id: moduleId, title: `Module ${moduleId}` },
  };
}

/**
 * Build a VendorCertification record (ACTIVE).
 */
function makeCert(vendorId: string, certId = 'cert-1') {
  return {
    id: certId,
    vendorId,
    programId: 'program-1',
    status: VendorCertificationStatus.ACTIVE,
    certNumber: `CERT-TESTVE-202501-001`,
    issuedAt: new Date(),
    expiresAt: null,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('VendorCertificationService', () => {
  let service: VendorCertificationService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(async () => {
    prisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorCertificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<VendorCertificationService>(VendorCertificationService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── Unit tests ─────────────────────────────────────────────────────────

  describe('checkAndIssueCertification — unit tests', () => {
    it('should return certified: false with reason NO_PROGRAM_ASSIGNED when vendor has no program', async () => {
      prisma.vendor.findUnique.mockResolvedValue({
        id: 'vendor-1',
        vendorName: 'Test',
        deletedAt: null,
        certificationProgramId: null,
        certificationProgram: null,
      });

      const result = await service.checkAndIssueCertification('user-1', 'vendor-1');

      expect(result.certified).toBe(false);
      expect(result.reason).toBe('NO_PROGRAM_ASSIGNED');
    });

    it('should return certified: false with reason NO_REQUIRED_MODULES when program has no required modules', async () => {
      prisma.vendor.findUnique.mockResolvedValue(makeVendor('vendor-1'));
      prisma.certificationProgramModule.findMany.mockResolvedValue([]);

      const result = await service.checkAndIssueCertification('user-1', 'vendor-1');

      expect(result.certified).toBe(false);
      expect(result.reason).toBe('NO_REQUIRED_MODULES');
    });

    it('should return existing cert without creating a new one when ACTIVE cert already exists', async () => {
      const existingCert = makeCert('vendor-1');
      prisma.vendor.findUnique.mockResolvedValue(makeVendor('vendor-1'));
      prisma.certificationProgramModule.findMany.mockResolvedValue([
        makeRequiredModule('module-1'),
      ]);
      prisma.vendorCertification.findFirst.mockResolvedValue(existingCert);

      const result = await service.checkAndIssueCertification('user-1', 'vendor-1');

      expect(result.certified).toBe(true);
      expect(result.isNew).toBe(false);
      expect(result.certification).toEqual(existingCert);
      expect(prisma.vendorCertification.create).not.toHaveBeenCalled();
    });

    it('should return certified: false with remaining modules when not all modules are passed', async () => {
      prisma.vendor.findUnique.mockResolvedValue(makeVendor('vendor-1'));
      prisma.certificationProgramModule.findMany.mockResolvedValue([
        makeRequiredModule('module-1'),
        makeRequiredModule('module-2'),
      ]);
      prisma.vendorCertification.findFirst.mockResolvedValue(null);
      // Only module-1 has a certificate
      prisma.certificate.findMany.mockResolvedValue([{ moduleId: 'module-1' }]);

      const result = await service.checkAndIssueCertification('user-1', 'vendor-1');

      expect(result.certified).toBe(false);
      expect(result.remaining).toHaveLength(1);
      expect(result.remaining![0].moduleId).toBe('module-2');
    });

    it('should create a new ACTIVE certification when all required modules are passed', async () => {
      const newCert = makeCert('vendor-1', 'cert-new');
      prisma.vendor.findUnique.mockResolvedValue(makeVendor('vendor-1'));
      prisma.certificationProgramModule.findMany.mockResolvedValue([
        makeRequiredModule('module-1'),
      ]);
      prisma.vendorCertification.findFirst.mockResolvedValue(null);
      prisma.certificate.findMany.mockResolvedValue([{ moduleId: 'module-1' }]);
      prisma.vendorCertification.count.mockResolvedValue(0);
      prisma.vendorCertification.create.mockResolvedValue(newCert);

      const result = await service.checkAndIssueCertification('user-1', 'vendor-1');

      expect(result.certified).toBe(true);
      expect(result.isNew).toBe(true);
      expect(result.certification).toEqual(newCert);
      expect(prisma.vendorCertification.create).toHaveBeenCalledTimes(1);
      expect(prisma.vendorCertification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vendorId: 'vendor-1',
            status: VendorCertificationStatus.ACTIVE,
          }),
        }),
      );
    });
  });

  // ─── Unit tests: getMyProgram ───────────────────────────────────────────

  describe('getMyProgram — unit tests', () => {
    it('should throw NotFoundException when user has no vendorId', async () => {
      prisma.user.findUnique.mockResolvedValue({ vendorId: null });

      await expect(service.getMyProgram('user-1')).rejects.toThrow(
        'User is not associated with a vendor',
      );
    });

    it('should throw NotFoundException when vendor has no certification program assigned', async () => {
      prisma.user.findUnique.mockResolvedValue({ vendorId: 'vendor-1' });
      prisma.vendor.findUnique.mockResolvedValue({
        id: 'vendor-1',
        vendorName: 'TestVendor',
        deletedAt: null,
        certificationProgramId: null,
        certificationProgram: null,
      });

      await expect(service.getMyProgram('user-1')).rejects.toThrow(
        'Belum ada program sertifikasi yang di-assign ke vendor Anda',
      );
    });

    it('should return correct module progress when vendor has a program', async () => {
      prisma.user.findUnique.mockResolvedValue({ vendorId: 'vendor-1' });

      // Vendor with a full certificationProgram including modules
      prisma.vendor.findUnique.mockResolvedValue({
        id: 'vendor-1',
        vendorName: 'TestVendor',
        deletedAt: null,
        certificationProgramId: 'program-1',
        certificationProgram: {
          id: 'program-1',
          name: 'Safety Program',
          description: 'Safety certification',
          validityDays: 365,
          modules: [
            {
              moduleId: 'module-1',
              isRequired: true,
              order: 0,
              module: { id: 'module-1', title: 'Module 1', description: null },
            },
            {
              moduleId: 'module-2',
              isRequired: true,
              order: 1,
              module: { id: 'module-2', title: 'Module 2', description: null },
            },
          ],
        },
      });

      // User has passed module-1 but not module-2
      prisma.certificate.findMany.mockResolvedValue([
        {
          moduleId: 'module-1',
          certNumber: 'CERT-001',
          createdAt: new Date(),
          expiresAt: null,
        },
      ]);

      // No active vendor certification yet
      prisma.vendorCertification.findFirst.mockResolvedValue(null);

      const result = await service.getMyProgram('user-1');

      expect(result.program.id).toBe('program-1');
      expect(result.program.name).toBe('Safety Program');
      expect(result.modules).toHaveLength(2);

      const mod1 = result.modules.find((m) => m.moduleId === 'module-1');
      const mod2 = result.modules.find((m) => m.moduleId === 'module-2');

      expect(mod1?.status).toBe('PASSED');
      expect(mod1?.certificate).toBeDefined();
      expect(mod2?.status).toBe('PENDING');
      expect(mod2?.certificate).toBeUndefined();

      expect(result.completedCount).toBe(1);
      expect(result.totalRequired).toBe(2);
      expect(result.isCertified).toBe(false);
    });
  });

  // ─── Property-based test: Idempotency ───────────────────────────────────
  //
  // **Validates: Requirements A.1, A.2**
  //
  // Property 1: Idempotency
  // Calling checkAndIssueCertification twice with the same (userId, vendorId)
  // when all required modules are passed should result in exactly ONE
  // VendorCertification ACTIVE record — no duplicates.

  describe('checkAndIssueCertification — Property 1: Idempotency', () => {

    it('calling twice with same input should result in exactly one ACTIVE cert (no duplicates)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Use printable ASCII strings of reasonable length as IDs
          fc.string({ minLength: 1, maxLength: 36 }),
          fc.string({ minLength: 1, maxLength: 36 }),
          async (userId, vendorId) => {
            // Reset mocks for each property iteration
            jest.clearAllMocks();

            const vendor = makeVendor(vendorId);
            const requiredModules = [makeRequiredModule('module-1')];
            const issuedCert = makeCert(vendorId, `cert-${vendorId}`);

            // Both calls see the same vendor and required modules
            prisma.vendor.findUnique.mockResolvedValue(vendor);
            prisma.certificationProgramModule.findMany.mockResolvedValue(requiredModules);
            // All required modules are passed
            prisma.certificate.findMany.mockResolvedValue([{ moduleId: 'module-1' }]);
            prisma.vendorCertification.count.mockResolvedValue(0);

            // ── First call ──
            // No existing cert yet → create returns the new cert
            prisma.vendorCertification.findFirst.mockResolvedValueOnce(null);
            prisma.vendorCertification.create.mockResolvedValueOnce(issuedCert);

            const firstResult = await service.checkAndIssueCertification(userId, vendorId);

            // ── Second call ──
            // Now the cert exists → findFirst returns it (idempotency path)
            prisma.vendorCertification.findFirst.mockResolvedValueOnce(issuedCert);

            const secondResult = await service.checkAndIssueCertification(userId, vendorId);

            // ── Assertions ──

            // Both calls must report certified: true
            expect(firstResult.certified).toBe(true);
            expect(secondResult.certified).toBe(true);

            // create must have been called exactly ONCE across both calls
            expect(prisma.vendorCertification.create).toHaveBeenCalledTimes(1);

            // Both calls must return the same certification record
            expect(firstResult.certification!.id).toBe(secondResult.certification!.id);
            expect(firstResult.certification!.certNumber).toBe(
              secondResult.certification!.certNumber,
            );

            // First call is new; second call is not
            expect(firstResult.isNew).toBe(true);
            expect(secondResult.isNew).toBe(false);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  // ─── Property-based test: Monotonicity ──────────────────────────────────
  //
  // **Validates: Requirements A.2**
  //
  // Property 2: Monotonicity
  // If a vendor already meets the eligibility criteria (all required modules
  // have a passing certificate), adding more passed modules (extra certificates
  // beyond the required set) should NOT change the outcome — the vendor must
  // still be evaluated as eligible (certified: true).
  //
  // Formally: eligible(required ⊆ passed) ∧ passed' ⊇ passed
  //           ⟹ eligible(required ⊆ passed')

  describe('checkAndIssueCertification — Property 2: Monotonicity', () => {
    it('adding extra passed modules to an already-eligible vendor keeps result certified: true', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate 1–5 unique required module IDs
          fc
            .array(fc.uuid(), { minLength: 1, maxLength: 5 })
            .map((ids) => [...new Set(ids)])
            .filter((ids) => ids.length >= 1),
          // Generate 0–5 additional (extra) module IDs
          fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
          async (requiredModuleIds, extraModuleIds) => {
            // Ensure extra modules don't overlap with required modules
            const distinctExtraIds = extraModuleIds.filter(
              (id) => !requiredModuleIds.includes(id),
            );

            jest.clearAllMocks();

            const vendorId = 'vendor-mono';
            const userId = 'user-mono';

            const vendor = makeVendor(vendorId);
            const requiredModules = requiredModuleIds.map(makeRequiredModule);

            // All required modules are passed, PLUS the extra ones
            const allPassedCertificates = [
              ...requiredModuleIds.map((id) => ({ moduleId: id })),
              ...distinctExtraIds.map((id) => ({ moduleId: id })),
            ];

            prisma.vendor.findUnique.mockResolvedValue(vendor);
            prisma.certificationProgramModule.findMany.mockResolvedValue(requiredModules);
            // No existing active cert — force the eligibility evaluation path
            prisma.vendorCertification.findFirst.mockResolvedValue(null);
            // Return certificates for ALL passed modules (required + extra)
            prisma.certificate.findMany.mockResolvedValue(allPassedCertificates);
            prisma.vendorCertification.count.mockResolvedValue(0);
            prisma.vendorCertification.create.mockResolvedValue(
              makeCert(vendorId, 'cert-mono'),
            );

            const result = await service.checkAndIssueCertification(userId, vendorId);

            // The vendor satisfies all required modules → must be certified
            expect(result.certified).toBe(true);
            // No remaining modules should be reported
            expect(result.remaining).toBeUndefined();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('a vendor with only the exact required modules passed is eligible (baseline)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate 1–5 unique required module IDs
          fc
            .array(fc.uuid(), { minLength: 1, maxLength: 5 })
            .map((ids) => [...new Set(ids)])
            .filter((ids) => ids.length >= 1),
          async (requiredModuleIds) => {
            jest.clearAllMocks();

            const vendorId = 'vendor-baseline';
            const userId = 'user-baseline';

            const vendor = makeVendor(vendorId);
            const requiredModules = requiredModuleIds.map(makeRequiredModule);

            // Certificates for exactly the required modules — no extras
            const exactCertificates = requiredModuleIds.map((id) => ({ moduleId: id }));

            prisma.vendor.findUnique.mockResolvedValue(vendor);
            prisma.certificationProgramModule.findMany.mockResolvedValue(requiredModules);
            prisma.vendorCertification.findFirst.mockResolvedValue(null);
            prisma.certificate.findMany.mockResolvedValue(exactCertificates);
            prisma.vendorCertification.count.mockResolvedValue(0);
            prisma.vendorCertification.create.mockResolvedValue(
              makeCert(vendorId, 'cert-baseline'),
            );

            const result = await service.checkAndIssueCertification(userId, vendorId);

            expect(result.certified).toBe(true);
            expect(result.remaining).toBeUndefined();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('a vendor missing at least one required module is NOT eligible regardless of extra passed modules', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate 2–5 unique required module IDs so we can always withhold one
          fc
            .array(fc.uuid(), { minLength: 2, maxLength: 5 })
            .map((ids) => [...new Set(ids)])
            .filter((ids) => ids.length >= 2),
          // Generate 0–5 extra passed module IDs
          fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
          async (requiredModuleIds, extraModuleIds) => {
            jest.clearAllMocks();

            const vendorId = 'vendor-missing';
            const userId = 'user-missing';

            const vendor = makeVendor(vendorId);
            const requiredModules = requiredModuleIds.map(makeRequiredModule);

            // Withhold the last required module — vendor is NOT fully eligible
            const passedRequiredIds = requiredModuleIds.slice(0, -1);
            const distinctExtraIds = extraModuleIds.filter(
              (id) => !requiredModuleIds.includes(id),
            );

            const certificates = [
              ...passedRequiredIds.map((id) => ({ moduleId: id })),
              ...distinctExtraIds.map((id) => ({ moduleId: id })),
            ];

            prisma.vendor.findUnique.mockResolvedValue(vendor);
            prisma.certificationProgramModule.findMany.mockResolvedValue(requiredModules);
            prisma.vendorCertification.findFirst.mockResolvedValue(null);
            prisma.certificate.findMany.mockResolvedValue(certificates);

            const result = await service.checkAndIssueCertification(userId, vendorId);

            // Missing one required module → must NOT be certified
            expect(result.certified).toBe(false);
            expect(result.remaining).toBeDefined();
            expect(result.remaining!.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
