import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { RedisService } from '../../common/redis/redis.service';
import { CreateHiracDto } from './dto/create-hirac.dto';
import { ProjectStatus } from '@repo/database';

@Injectable()
export class HiracService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly redisService: RedisService,
  ) {}

  // ─── Validasi project boleh diedit ──────────────────────────────────────────
  private async validateProjectEditable(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true },
    });

    if (!project) throw new NotFoundException('Project not found');

    const editableStatuses: ProjectStatus[] = [
      ProjectStatus.DRAFT,
      ProjectStatus.REVISION,
    ];

    if (!editableStatuses.includes(project.status)) {
      throw new BadRequestException(
        `Cannot modify HIRAC: project is currently in "${project.status}" status`,
      );
    }
  }

  // ─── Tambah HIRAC baru ke project ───────────────────────────────────────────
  async addHiracToProject(
    projectId: string,
    data: CreateHiracDto,
    userId: string,
  ) {
    await this.validateProjectEditable(projectId);

    const { penilaianAwal, penilaianLanjutan, ...rest } = data;

    const hirac = await this.prisma.hirac.create({
      data: {
        ...rest,
        penilaianAwalAkibat: penilaianAwal.akibat,
        penilaianAwalKemungkinan: penilaianAwal.kemungkinan,
        penilaianAwalTingkatRisiko: penilaianAwal.tingkatRisiko,
        penilaianLanjutanAkibat: penilaianLanjutan.akibat,
        penilaianLanjutanKemungkinan: penilaianLanjutan.kemungkinan,
        penilaianLanjutanTingkatRisiko: penilaianLanjutan.tingkatRisiko,
        projectId,
        isActive: true,
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'HIRAC_CREATED',
      entity: 'Hirac',
      entityId: hirac.id,
      newValue: hirac,
    });

    await this.redisService.del(`project:${projectId}`);
    return hirac;
  }

  // ─── Update HIRAC (hanya saat DRAFT / REVISION) ──────────────────────────────
  async updateHirac(id: string, data: Partial<CreateHiracDto>, userId: string) {
    const hirac = await this.prisma.hirac.findUnique({
      where: { id },
      select: { projectId: true, isActive: true },
    });

    if (!hirac || !hirac.projectId)
      throw new NotFoundException('Hirac not found');
    if (!hirac.isActive)
      throw new BadRequestException('Cannot update an inactive HIRAC row');

    await this.validateProjectEditable(hirac.projectId);

    const { penilaianAwal, penilaianLanjutan, ...rest } = data;
    const updateData: Record<string, any> = { ...rest };

    if (penilaianAwal) {
      updateData.penilaianAwalAkibat = penilaianAwal.akibat;
      updateData.penilaianAwalKemungkinan = penilaianAwal.kemungkinan;
      updateData.penilaianAwalTingkatRisiko = penilaianAwal.tingkatRisiko;
    }

    if (penilaianLanjutan) {
      updateData.penilaianLanjutanAkibat = penilaianLanjutan.akibat;
      updateData.penilaianLanjutanKemungkinan = penilaianLanjutan.kemungkinan;
      updateData.penilaianLanjutanTingkatRisiko =
        penilaianLanjutan.tingkatRisiko;
    }

    const updatedHirac = await this.prisma.hirac.update({
      where: { id },
      data: updateData,
    });

    await this.auditLogService.log({
      userId,
      action: 'HIRAC_UPDATED',
      entity: 'Hirac',
      entityId: id,
      newValue: updatedHirac,
    });

    await this.redisService.del(`project:${hirac.projectId}`);
    return updatedHirac;
  }

  // ─── Soft-delete HIRAC (isActive = false) ────────────────────────────────────
  // Hard-delete dihindari karena HiracVersion masih mereferensikan record ini.
  async deleteHirac(id: string, userId: string) {
    const hirac = await this.prisma.hirac.findUnique({
      where: { id },
      select: { projectId: true, isActive: true },
    });

    if (!hirac || !hirac.projectId)
      throw new NotFoundException('Hirac not found');

    await this.validateProjectEditable(hirac.projectId);

    // Soft-delete: tandai tidak aktif agar version history tetap utuh
    await this.prisma.hirac.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditLogService.log({
      userId,
      action: 'HIRAC_DELETED',
      entity: 'Hirac',
      entityId: id,
      metadata: { softDelete: true },
    });

    await this.redisService.del(`project:${hirac.projectId}`);
    return { success: true, message: 'HIRAC removed from project' };
  }

  // ─── Restore HIRAC yang pernah di-soft-delete (opsional, untuk undo) ─────────
  async restoreHirac(id: string, userId: string) {
    const hirac = await this.prisma.hirac.findUnique({
      where: { id },
      select: { projectId: true, isActive: true },
    });

    if (!hirac || !hirac.projectId)
      throw new NotFoundException('Hirac not found');
    if (hirac.isActive)
      throw new BadRequestException('HIRAC is already active');

    await this.validateProjectEditable(hirac.projectId);

    const restored = await this.prisma.hirac.update({
      where: { id },
      data: { isActive: true },
    });

    await this.auditLogService.log({
      userId,
      action: 'HIRAC_RESTORED',
      entity: 'Hirac',
      entityId: id,
    });

    await this.redisService.del(`project:${hirac.projectId}`);
    return restored;
  }
}
