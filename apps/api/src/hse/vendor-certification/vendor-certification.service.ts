import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { RedisService } from '../../common/redis/redis.service';
import { VendorCertificationStatus } from '@repo/database';

const CERT_CACHE_TTL = 60 * 5; // 5 minutes
const CERT_CACHE_KEY = (vendorId: string) => `vendor-cert:${vendorId}`;

export interface CertificationCheckResult {
  certified: boolean;
  certification?: any;
  isNew?: boolean;
  remaining?: any[];
  reason?: string;
}

export interface VendorProgramProgress {
  vendorId: string;
  program: any;
  modules: Array<{
    moduleId: string;
    title: string;
    isRequired: boolean;
    order: number;
    status: 'PASSED' | 'PENDING';
    certificate?: any;
  }>;
  completedCount: number;
  totalRequired: number;
  isCertified: boolean;
  certification?: any;
}

@Injectable()
export class VendorCertificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Invalidate the Redis cache for a vendor's certification status.
   */
  private async invalidateCertCache(vendorId: string) {
    await this.redisService.del(CERT_CACHE_KEY(vendorId));
  }

  /**
   * Generate a unique certification number.
   * Format: CERT-{VENDOR_CODE}-{YYYYMM}-{SEQUENCE}
   */
  private async generateCertNumber(vendor: {
    id: string;
    vendorName: string;
  }): Promise<string> {
    const vendorCode = vendor.vendorName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 6);

    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const count = await this.prisma.vendorCertification.count({
      where: {
        vendorId: vendor.id,
        issuedAt: { gte: startOfMonth },
      },
    });

    const sequence = String(count + 1).padStart(3, '0');
    return `CERT-${vendorCode}-${yearMonth}-${sequence}`;
  }

  /**
   * Check if a vendor has completed all required modules and issue a
   * VendorCertification if eligible. Idempotent — returns existing cert
   * if one is already ACTIVE.
   */
  async checkAndIssueCertification(
    userId: string,
    vendorId: string,
  ): Promise<CertificationCheckResult> {
    // 1. Load vendor with its certification program
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        certificationProgram: true,
      },
    });

    if (!vendor || vendor.deletedAt) {
      throw new NotFoundException(`Vendor with ID "${vendorId}" not found`);
    }

    if (!vendor.certificationProgramId || !vendor.certificationProgram) {
      return { certified: false, reason: 'NO_PROGRAM_ASSIGNED' };
    }

    // 2. Load required modules for the program
    const requiredModules =
      await this.prisma.certificationProgramModule.findMany({
        where: {
          programId: vendor.certificationProgramId,
          isRequired: true,
        },
        include: {
          module: { select: { id: true, title: true } },
        },
        orderBy: { order: 'asc' },
      });

    if (requiredModules.length === 0) {
      return { certified: false, reason: 'NO_REQUIRED_MODULES' };
    }

    // 3. Check for existing active certification (idempotency)
    const existingCert = await this.prisma.vendorCertification.findFirst({
      where: {
        vendorId,
        programId: vendor.certificationProgramId,
        status: VendorCertificationStatus.ACTIVE,
      },
    });

    if (existingCert) {
      return { certified: true, certification: existingCert, isNew: false };
    }

    // 4. Check which required modules the user has passed
    const moduleIds = requiredModules.map((rm) => rm.moduleId);
    const certificates = await this.prisma.certificate.findMany({
      where: {
        userId,
        moduleId: { in: moduleIds },
      },
      select: { moduleId: true },
    });

    const passedModuleIds = new Set(
      certificates.map((c) => c.moduleId).filter(Boolean) as string[],
    );

    // Loop invariant: passedModuleIds contains only verified passed modules
    const remainingModules = requiredModules.filter(
      (rm) => !passedModuleIds.has(rm.moduleId),
    );

    if (remainingModules.length > 0) {
      return {
        certified: false,
        remaining: remainingModules.map((rm) => ({
          moduleId: rm.moduleId,
          title: rm.module.title,
          isRequired: rm.isRequired,
        })),
      };
    }

    // 5. All required modules passed — issue certification
    const certNumber = await this.generateCertNumber(vendor);

    const expiresAt =
      vendor.certificationProgram.validityDays
        ? new Date(
            Date.now() +
              vendor.certificationProgram.validityDays * 24 * 60 * 60 * 1000,
          )
        : null;

    const newCert = await this.prisma.vendorCertification.create({
      data: {
        vendorId,
        programId: vendor.certificationProgramId,
        status: VendorCertificationStatus.ACTIVE,
        certNumber,
        issuedAt: new Date(),
        ...(expiresAt ? { expiresAt } : {}),
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'VENDOR_CERTIFICATION_ISSUED',
      entity: 'VendorCertification',
      entityId: newCert.id,
      newValue: newCert as any,
    });

    await this.invalidateCertCache(vendorId);

    return { certified: true, certification: newCert, isNew: true };
  }

  /**
   * Get the current certification status for a vendor.
   * Reads from Redis cache (TTL 5 min), falls back to DB.
   */
  async getCertificationStatus(vendorId: string) {
    const cacheKey = CERT_CACHE_KEY(vendorId);
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const certification = await this.prisma.vendorCertification.findFirst({
      where: {
        vendorId,
        status: VendorCertificationStatus.ACTIVE,
      },
      include: {
        program: { select: { id: true, name: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });

    const result = {
      vendorId,
      isCertified: !!certification,
      certification: certification ?? null,
    };

    await this.redisService.set(cacheKey, result, CERT_CACHE_TTL);
    return result;
  }

  /**
   * Get the vendor's program progress for the currently logged-in user.
   */
  async getMyProgram(userId: string): Promise<VendorProgramProgress> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { vendorId: true },
    });

    if (!user?.vendorId) {
      throw new NotFoundException('User is not associated with a vendor');
    }

    const vendor = await this.prisma.vendor.findUnique({
      where: { id: user.vendorId },
      include: {
        certificationProgram: {
          include: {
            modules: {
              include: {
                module: { select: { id: true, title: true, description: true } },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!vendor?.certificationProgram) {
      throw new NotFoundException(
        'Belum ada program sertifikasi yang di-assign ke vendor Anda',
      );
    }

    const program = vendor.certificationProgram;
    const moduleIds = program.modules.map((m) => m.moduleId);

    const [certificates, activeCert] = await Promise.all([
      this.prisma.certificate.findMany({
        where: { userId, moduleId: { in: moduleIds } },
        select: { moduleId: true, certNumber: true, createdAt: true, expiresAt: true },
      }),
      this.prisma.vendorCertification.findFirst({
        where: {
          vendorId: user.vendorId,
          programId: program.id,
          status: VendorCertificationStatus.ACTIVE,
        },
      }),
    ]);

    const certByModule = new Map(
      certificates.map((c) => [c.moduleId, c]),
    );

    const requiredCount = program.modules.filter((m) => m.isRequired).length;
    let completedCount = 0;

    const modules = program.modules.map((pm) => {
      const cert = certByModule.get(pm.moduleId);
      const passed = !!cert;
      if (passed && pm.isRequired) completedCount++;

      return {
        moduleId: pm.moduleId,
        title: pm.module.title,
        isRequired: pm.isRequired,
        order: pm.order,
        status: (passed ? 'PASSED' : 'PENDING') as 'PASSED' | 'PENDING',
        certificate: cert ?? undefined,
      };
    });

    return {
      vendorId: user.vendorId,
      program: {
        id: program.id,
        name: program.name,
        description: program.description,
        validityDays: program.validityDays,
      },
      modules,
      completedCount,
      totalRequired: requiredCount,
      isCertified: !!activeCert,
      certification: activeCert ?? undefined,
    };
  }

  /**
   * Revoke a vendor certification.
   */
  async revokeCertification(
    certId: string,
    adminId: string,
    reason: string,
  ) {
    const cert = await this.prisma.vendorCertification.findUnique({
      where: { id: certId },
    });

    if (!cert) {
      throw new NotFoundException(
        `Certification with ID "${certId}" not found`,
      );
    }

    if (cert.status !== VendorCertificationStatus.ACTIVE) {
      throw new BadRequestException(
        `Certification is not active (current status: ${cert.status})`,
      );
    }

    const revoked = await this.prisma.vendorCertification.update({
      where: { id: certId },
      data: {
        status: VendorCertificationStatus.REVOKED,
        revokedAt: new Date(),
        revokedBy: adminId,
        revokeReason: reason,
      },
    });

    await this.auditLogService.log({
      userId: adminId,
      action: 'VENDOR_CERTIFICATION_REVOKED',
      entity: 'VendorCertification',
      entityId: certId,
      oldValue: cert as any,
      newValue: revoked as any,
    });

    await this.invalidateCertCache(cert.vendorId);
    return revoked;
  }

  /**
   * Renew a vendor certification.
   * Marks the current ACTIVE cert as EXPIRED and creates a new ACTIVE one.
   */
  async renewCertification(vendorId: string, adminId: string) {
    const activeCert = await this.prisma.vendorCertification.findFirst({
      where: {
        vendorId,
        status: VendorCertificationStatus.ACTIVE,
      },
      include: {
        program: true,
        vendor: { select: { id: true, vendorName: true } },
      },
    });

    if (!activeCert) {
      throw new NotFoundException(
        `No active certification found for vendor "${vendorId}"`,
      );
    }

    const certNumber = await this.generateCertNumber(activeCert.vendor);

    const expiresAt =
      activeCert.program.validityDays
        ? new Date(
            Date.now() +
              activeCert.program.validityDays * 24 * 60 * 60 * 1000,
          )
        : null;

    const [, newCert] = await this.prisma.$transaction([
      // Mark old cert as EXPIRED
      this.prisma.vendorCertification.update({
        where: { id: activeCert.id },
        data: { status: VendorCertificationStatus.EXPIRED },
      }),
      // Create new ACTIVE cert
      this.prisma.vendorCertification.create({
        data: {
          vendorId,
          programId: activeCert.programId,
          status: VendorCertificationStatus.ACTIVE,
          certNumber,
          issuedAt: new Date(),
          ...(expiresAt ? { expiresAt } : {}),
        },
      }),
    ]);

    await this.auditLogService.log({
      userId: adminId,
      action: 'VENDOR_CERTIFICATION_RENEWED',
      entity: 'VendorCertification',
      entityId: newCert.id,
      oldValue: { previousCertId: activeCert.id } as any,
      newValue: newCert as any,
    });

    await this.invalidateCertCache(vendorId);
    return newCert;
  }

  /**
   * Revoke the active certification for a vendor (by vendorId).
   * Convenience wrapper used by the vendor-scoped REST endpoint.
   */
  async revokeCertificationByVendor(
    vendorId: string,
    adminId: string,
    reason: string,
  ) {
    const activeCert = await this.prisma.vendorCertification.findFirst({
      where: {
        vendorId,
        status: VendorCertificationStatus.ACTIVE,
      },
    });

    if (!activeCert) {
      throw new NotFoundException(
        `No active certification found for vendor "${vendorId}"`,
      );
    }

    return this.revokeCertification(activeCert.id, adminId, reason);
  }

  /**
   * Get all certifications for a vendor (admin view).
   */
  async getVendorCertifications(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor || vendor.deletedAt) {
      throw new NotFoundException(`Vendor with ID "${vendorId}" not found`);
    }

    return this.prisma.vendorCertification.findMany({
      where: { vendorId },
      include: {
        program: { select: { id: true, name: true } },
        revoker: { select: { id: true, displayName: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }
}
