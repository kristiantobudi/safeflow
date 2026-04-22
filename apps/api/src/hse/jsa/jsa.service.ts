import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { RedisService } from '../../common/redis/redis.service';
import { CreateJsaDto } from './dto/create-jsa.dto';
import { ApprovalStatus, Role, VersionStatus } from '@repo/database';

@Injectable()
export class JsaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly redisService: RedisService,
  ) {}

  // ─── Cache helpers ────────────────────────────────────────────────────────

  private async invalidateJsaCache(jsaId: string, creatorId?: string) {
    await Promise.all([
      this.redisService.del(`jsa:${jsaId}`),
      this.redisService.del('jsa:all'),
      creatorId
        ? this.redisService.del(`jsa:user:${creatorId}`)
        : Promise.resolve(),
    ]);
  }

  // ─── 2.1 create ──────────────────────────────────────────────────────────

  async create(dto: CreateJsaDto, userId: string) {
    const jsa = await this.prisma.jsaProject.create({
      data: {
        jenisKegiatan: dto.jenisKegiatan,
        lokasiKegiatan: dto.lokasiKegiatan ?? null,
        tanggalDibuat: dto.tanggalDibuat ? new Date(dto.tanggalDibuat) : undefined,
        referensiHirarc: dto.referensiHirarc ?? null,
        pelaksanaUtama: dto.pelaksanaUtama ?? null,
        hseInCharge: dto.hseInCharge ?? null,
        createdBy: userId,
        isDeleted: false,
        approvalStatus: ApprovalStatus.PENDING,
        // Link to HIRAC if provided
        ...(dto.hiracId
          ? { hiracs: { connect: { id: dto.hiracId } } }
          : {}),
        // Create APD record if provided
        ...(dto.apd
          ? {
              apd: {
                create: {
                  safetyHelmet: dto.apd.safetyHelmet ?? false,
                  safetyShoes: dto.apd.safetyShoes ?? false,
                  gloves: dto.apd.gloves ?? false,
                  safetyGlasses: dto.apd.safetyGlasses ?? false,
                  safetyVest: dto.apd.safetyVest ?? false,
                  safetyBodyHarness: dto.apd.safetyBodyHarness ?? false,
                  others: dto.apd.others ?? null,
                },
              },
            }
          : {}),
      },
    });

    await this.invalidateJsaCache(jsa.id, userId);

    await this.auditLogService.log({
      userId,
      action: 'JSA_CREATED',
      entity: 'JsaProject',
      entityId: jsa.id,
      newValue: { jenisKegiatan: jsa.jenisKegiatan },
    });

    return jsa;
  }

  // ─── 2.2 findAll ─────────────────────────────────────────────────────────

  async findAll(userId: string, role: string) {
    const isPrivileged = (
      [Role.ADMIN, Role.EXAMINER, Role.VERIFICATOR] as string[]
    ).includes(role);

    const cacheKey = isPrivileged ? 'jsa:all' : `jsa:user:${userId}`;

    const cached = await this.redisService.get<any[]>(cacheKey);
    if (cached) return cached;

    const where = isPrivileged
      ? { isDeleted: false }
      : { isDeleted: false, createdBy: userId };

    const jsaList = await this.prisma.jsaProject.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        noJsa: true,
        jenisKegiatan: true,
        lokasiKegiatan: true,
        tanggalDibuat: true,
        revisiKe: true,
        approvalStatus: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          select: {
            versionNumber: true,
            status: true,
            submittedAt: true,
          },
        },
      },
    });

    await this.redisService.set(cacheKey, jsaList, 3600);
    return jsaList;
  }

  // ─── 2.3 findOne ─────────────────────────────────────────────────────────

  async findOne(id: string) {
    const cacheKey = `jsa:${id}`;
    const cached = await this.redisService.get<any>(cacheKey);
    if (cached) return cached;

    const jsa = await this.prisma.jsaProject.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        apd: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: {
            approvalSteps: {
              include: {
                approver: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
              orderBy: { stepOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!jsa || jsa.isDeleted) {
      throw new NotFoundException('JSA not found');
    }

    await this.redisService.set(cacheKey, jsa, 3600);
    return jsa;
  }

  // ─── 2.4 submit ──────────────────────────────────────────────────────────

  async submit(id: string, userId: string) {
    const jsa = await this.findOne(id);

    if (jsa.createdBy !== userId) {
      throw new ForbiddenException('Only the creator can submit this JSA');
    }

    if (
      jsa.approvalStatus !== ApprovalStatus.PENDING &&
      jsa.approvalStatus !== ApprovalStatus.REJECTED
    ) {
      throw new BadRequestException('JSA is not in a submittable state');
    }

    // Determine the next version number
    const lastVersion = await this.prisma.jsaProjectVersion.findFirst({
      where: { jsaId: id },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

    // JSA versions require a hiracVersionId — find the latest HiracVersion
    // linked to any Hirac associated with this JSA project's hiracs
    const linkedHirac = await this.prisma.hirac.findFirst({
      where: { jsaProjects: { some: { id } } },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          select: { id: true },
        },
      },
    });

    if (!linkedHirac || linkedHirac.versions.length === 0) {
      throw new BadRequestException(
        'JSA must be linked to a HIRAC with at least one version before submitting',
      );
    }

    const hiracVersionId = linkedHirac.versions[0]!.id;

    const updatedJsa = await this.prisma.$transaction(async (tx) => {
      // 1. Create a new JsaProjectVersion snapshot
      const version = await tx.jsaProjectVersion.create({
        data: {
          jsaId: id,
          hiracVersionId,
          versionNumber: nextVersionNumber,
          label: `Versi ${nextVersionNumber}`,
          status: VersionStatus.SUBMITTED,
          submittedBy: userId,
          submittedAt: new Date(),
        },
      });

      // 2. Create approval steps: VERIFICATOR → EXAMINER → ADMIN
      await tx.jsaVersionApproval.createMany({
        data: [
          {
            jsaProjectVersionId: version.id,
            stepOrder: 1,
            requiredRole: Role.VERIFICATOR,
            status: ApprovalStatus.PENDING,
          },
          {
            jsaProjectVersionId: version.id,
            stepOrder: 2,
            requiredRole: Role.EXAMINER,
            status: ApprovalStatus.PENDING,
          },
          {
            jsaProjectVersionId: version.id,
            stepOrder: 3,
            requiredRole: Role.ADMIN,
            status: ApprovalStatus.PENDING,
          },
        ],
      });

      // 3. Update JSA approvalStatus to SUBMITTED
      const updated = await tx.jsaProject.update({
        where: { id },
        data: {
          approvalStatus: ApprovalStatus.SUBMITTED,
          currentVersionId: version.id,
        },
      });

      return updated;
    });

    await this.auditLogService.log({
      userId,
      action: 'JSA_SUBMITTED',
      entity: 'JsaProject',
      entityId: id,
      newValue: {
        approvalStatus: ApprovalStatus.SUBMITTED,
        versionNumber: nextVersionNumber,
      },
    });

    await this.invalidateJsaCache(id, userId);
    return updatedJsa;
  }
}
