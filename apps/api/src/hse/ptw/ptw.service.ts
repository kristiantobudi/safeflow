import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { RedisService } from '../../common/redis/redis.service';
import { CreatePtwDto } from './dto/create-ptw.dto';
import { ApprovalStatus, Role, VersionStatus } from '@repo/database';

@Injectable()
export class PtwService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly redisService: RedisService,
  ) {}

  // ─── Cache helpers ────────────────────────────────────────────────────────

  private async invalidatePtwCache(ptwId: string, creatorId?: string) {
    await Promise.all([
      this.redisService.del(`ptw:${ptwId}`),
      this.redisService.del('ptw:all'),
      creatorId
        ? this.redisService.del(`ptw:user:${creatorId}`)
        : Promise.resolve(),
    ]);
  }

  // ─── 3.1 create ──────────────────────────────────────────────────────────

  async create(dto: CreatePtwDto, userId: string) {
    // Validate that the linked JSA is APPROVED before PTW can be created
    const jsa = await this.prisma.jsaProject.findUnique({
      where: { id: dto.jsaProjectId },
      select: { id: true, approvalStatus: true, isDeleted: true },
    });

    if (!jsa || jsa.isDeleted) {
      throw new NotFoundException('JSA not found');
    }

    if (jsa.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new BadRequestException(
        'PTW can only be created for an APPROVED JSA',
      );
    }

    const ptw = await this.prisma.ptwProject.create({
      data: {
        judulPekerjaan: dto.judulPekerjaan,
        jsaProjectId: dto.jsaProjectId,
        lokasiPekerjaan: dto.lokasiPekerjaan ?? null,
        tanggalMulai: dto.tanggalMulai ? new Date(dto.tanggalMulai) : null,
        tanggalSelesai: dto.tanggalSelesai
          ? new Date(dto.tanggalSelesai)
          : null,
        keteranganTambahan: dto.keteranganTambahan ?? null,
        createdBy: userId,
        isDeleted: false,
        approvalStatus: ApprovalStatus.PENDING,
      },
    });

    await this.invalidatePtwCache(ptw.id, userId);

    await this.auditLogService.log({
      userId,
      action: 'PTW_CREATED',
      entity: 'PtwProject',
      entityId: ptw.id,
      newValue: { judulPekerjaan: ptw.judulPekerjaan, jsaProjectId: ptw.jsaProjectId },
    });

    return ptw;
  }

  // ─── 3.2 findAll ─────────────────────────────────────────────────────────

  async findAll(userId: string, role: string) {
    const isPrivileged = (
      [Role.ADMIN, Role.EXAMINER, Role.VERIFICATOR] as string[]
    ).includes(role);

    const cacheKey = isPrivileged ? 'ptw:all' : `ptw:user:${userId}`;

    const cached = await this.redisService.get<any[]>(cacheKey);
    if (cached) return cached;

    const where = isPrivileged
      ? { isDeleted: false }
      : { isDeleted: false, createdBy: userId };

    const ptwList = await this.prisma.ptwProject.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        noPtw: true,
        judulPekerjaan: true,
        lokasiPekerjaan: true,
        tanggalMulai: true,
        tanggalSelesai: true,
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
        jsaProject: {
          select: {
            id: true,
            noJsa: true,
            jenisKegiatan: true,
            approvalStatus: true,
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

    await this.redisService.set(cacheKey, ptwList, 3600);
    return ptwList;
  }

  // ─── 3.3 findOne ─────────────────────────────────────────────────────────

  async findOne(id: string) {
    const cacheKey = `ptw:${id}`;
    const cached = await this.redisService.get<any>(cacheKey);
    if (cached) return cached;

    const ptw = await this.prisma.ptwProject.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        jsaProject: {
          select: {
            id: true,
            noJsa: true,
            jenisKegiatan: true,
            lokasiKegiatan: true,
            approvalStatus: true,
          },
        },
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

    if (!ptw || ptw.isDeleted) {
      throw new NotFoundException('PTW not found');
    }

    await this.redisService.set(cacheKey, ptw, 3600);
    return ptw;
  }

  // ─── 3.4 submit ──────────────────────────────────────────────────────────

  async submit(id: string, userId: string) {
    const ptw = await this.findOne(id);

    if (ptw.createdBy !== userId) {
      throw new ForbiddenException('Only the creator can submit this PTW');
    }

    if (
      ptw.approvalStatus !== ApprovalStatus.PENDING &&
      ptw.approvalStatus !== ApprovalStatus.REJECTED
    ) {
      throw new BadRequestException('PTW is not in a submittable state');
    }

    // Determine the next version number
    const lastVersion = await this.prisma.ptwProjectVersion.findFirst({
      where: { ptwId: id },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

    const updatedPtw = await this.prisma.$transaction(async (tx) => {
      // 1. Create a new PtwProjectVersion snapshot
      const version = await tx.ptwProjectVersion.create({
        data: {
          ptwId: id,
          versionNumber: nextVersionNumber,
          label: `Versi ${nextVersionNumber}`,
          status: VersionStatus.SUBMITTED,
          submittedBy: userId,
          submittedAt: new Date(),
        },
      });

      // 2. Create approval steps: VERIFICATOR → EXAMINER → ADMIN
      await tx.ptwVersionApproval.createMany({
        data: [
          {
            ptwProjectVersionId: version.id,
            stepOrder: 1,
            requiredRole: Role.VERIFICATOR,
            status: ApprovalStatus.PENDING,
          },
          {
            ptwProjectVersionId: version.id,
            stepOrder: 2,
            requiredRole: Role.EXAMINER,
            status: ApprovalStatus.PENDING,
          },
          {
            ptwProjectVersionId: version.id,
            stepOrder: 3,
            requiredRole: Role.ADMIN,
            status: ApprovalStatus.PENDING,
          },
        ],
      });

      // 3. Update PTW approvalStatus to SUBMITTED
      const updated = await tx.ptwProject.update({
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
      action: 'PTW_SUBMITTED',
      entity: 'PtwProject',
      entityId: id,
      newValue: {
        approvalStatus: ApprovalStatus.SUBMITTED,
        versionNumber: nextVersionNumber,
      },
    });

    await this.invalidatePtwCache(id, userId);
    return updatedPtw;
  }
}
