import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { ProjectVersionService } from './project-version.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ReviewProjectDto } from './dto/review-project.dto';
import { ProjectStatus, Role, ApprovalStatus } from '@repo/database';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly redisService: RedisService,
    private readonly projectVersionService: ProjectVersionService,
  ) {}

  private async invalidateProjectCache(projectId: string, creatorId?: string) {
    await Promise.all([
      this.redisService.del(`project:${projectId}`),
      this.redisService.del('projects:all'),
      creatorId
        ? this.redisService.del(`projects:user:${creatorId}`)
        : Promise.resolve(),
    ]);
  }

  async create(data: CreateProjectDto, userId: string) {
    const project = await this.prisma.project.create({
      data: {
        ...data,
        status: ProjectStatus.DRAFT,
        createdBy: userId,
      },
    });

    await this.invalidateProjectCache(project.id, userId);
    return project;
  }

  async findAll(userId: string, role: Role): Promise<any[]> {
    const isAdmin = (
      [Role.ADMIN, Role.EXAMINER, Role.VERIFICATOR] as Role[]
    ).includes(role);
    const cacheKey = isAdmin ? 'projects:all' : `projects:user:${userId}`;

    const cached = await this.redisService.get<any[]>(cacheKey);
    if (cached) return cached;

    const projects = isAdmin
      ? await this.prisma.project.findMany({
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            unitKerja: true,
            lokasiKerja: true,
            tanggal: true,
            revisiDocument: true,
            statusDocument: true,
            status: true,
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
            // Tampilkan versi terakhir di list
            versions: {
              orderBy: { versionNumber: 'desc' },
              select: { versionNumber: true, status: true, submittedAt: true },
            },
          },
        })
      : await this.prisma.project.findMany({
          where: { createdBy: userId, isDeleted: false },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            unitKerja: true,
            lokasiKerja: true,
            tanggal: true,
            status: true,
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
              select: { versionNumber: true, status: true, submittedAt: true },
            },
          },
        });

    await this.redisService.set(cacheKey, projects, 3600);
    return projects;
  }

  async findOne(id: string): Promise<any> {
    const cacheKey = `project:${id}`;
    const cached = await this.redisService.get<any>(cacheKey);
    if (cached) return cached;

    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        hiracs: { where: { isActive: true }, orderBy: { no: 'asc' } },
        versions: {
          orderBy: { versionNumber: 'desc' },
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
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!project || project.isDeleted) {
      throw new NotFoundException('Project not found');
    }

    const latestVersion = project.versions?.[0];
    if (latestVersion) {
      (project as any).approvalSteps = latestVersion.approvalSteps;
    }

    await this.redisService.set(cacheKey, project, 3600);
    return project;
  }

  // ─── Submit: buat snapshot versi baru ───────────────────────────────────────
  async submitProject(
    id: string,
    userId: string,
    changeNote?: string,
  ): Promise<any> {
    const project = (await this.findOne(id)) as any;

    if (project.createdBy !== userId) {
      throw new ForbiddenException('Only the creator can submit the project');
    }

    if (
      project.status !== ProjectStatus.DRAFT &&
      project.status !== ProjectStatus.REVISION
    ) {
      throw new BadRequestException('Project is not in a submittable state');
    }

    if (!project.hiracs || project.hiracs.length === 0) {
      throw new BadRequestException(
        'Project must have at least one HIRAC item',
      );
    }

    return this.prisma
      .$transaction(async (tx) => {
        // 1. Ambil info approval dari versi sebelumnya (jika ada)
        const previousVer = await tx.projectVersion.findFirst({
          where: { projectId: id },
          orderBy: { versionNumber: 'desc' },
          include: {
            approvalSteps: {
              where: { stepOrder: 1 },
              select: { status: true },
            },
          },
        });

        const wasL1Approved =
          previousVer?.approvalSteps?.[0]?.status === ApprovalStatus.APPROVED;

        // 2. Buat snapshot versi baru lebih dulu untuk mendapatkan versionId
        const versionId = await this.projectVersionService.createSnapshot(
          id,
          userId,
          undefined,
          changeNote,
          tx,
        );

        // 3. Buat approval steps baru. Jika L1 sudah pernah OK, skip L1.
        const stepsToCreate: any[] = [];

        if (!wasL1Approved) {
          stepsToCreate.push({
            projectVersionId: versionId,
            stepOrder: 1,
            requiredRole: Role.VERIFICATOR,
            status: ApprovalStatus.PENDING,
          });
        }

        stepsToCreate.push({
          projectVersionId: versionId,
          stepOrder: 2,
          requiredRole: Role.EXAMINER,
          status: ApprovalStatus.PENDING,
        });

        await tx.versionApproval.createMany({
          data: stepsToCreate,
        });

        const nextStatus = wasL1Approved
          ? ProjectStatus.L2_REVIEW
          : ProjectStatus.L1_REVIEW;

        const updatedProject = await tx.project.update({
          where: { id },
          data: { status: nextStatus },
        });

        await this.auditLogService.log({
          userId,
          action: 'PROJECT_SUBMITTED',
          entity: 'Project',
          entityId: id,
          newValue: { status: nextStatus, versionId, skippedL1: wasL1Approved },
        });

        return updatedProject;
      })
      .then(async (updatedProject) => {
        await this.invalidateProjectCache(id, userId);
        return updatedProject;
      });
  }

  // ─── Approve: advance status, pada final approval mark version APPROVED ─────
  async approveProject(
    id: string,
    userId: string,
    role: Role,
    dto: ReviewProjectDto,
  ): Promise<any> {
    const project = (await this.findOne(id)) as any;

    if (!project.versions || project.versions.length === 0) {
      throw new BadRequestException('Project has no versions to approve');
    }

    const latestVersion = project.versions[0];
    const activeStep = latestVersion.approvalSteps.find(
      (s: any) => s.status === ApprovalStatus.PENDING,
    );

    if (!activeStep) {
      throw new BadRequestException('No pending approval step found');
    }

    if (activeStep.requiredRole !== role && role !== Role.ADMIN) {
      throw new ForbiddenException(
        'You do not have the required role to approve this step',
      );
    }

    const isFinalStep = activeStep.stepOrder === 2;

    const updatedProject = await this.prisma.$transaction(async (tx) => {
      await tx.versionApproval.update({
        where: { id: activeStep.id },
        data: {
          status: ApprovalStatus.APPROVED,
          approvedBy: userId,
          approvedAt: new Date(),
          note: dto.note,
        },
      });

      const nextStatus = isFinalStep
        ? ProjectStatus.APPROVED
        : ProjectStatus.L2_REVIEW;

      const updated = await tx.project.update({
        where: { id },
        data: {
          status: nextStatus,
          ...(isFinalStep
            ? { approvedAt: new Date(), approvedBy: userId }
            : {}),
        },
      });

      await this.auditLogService.log({
        userId,
        action: 'PROJECT_STEP_APPROVED',
        entity: 'Project',
        entityId: id,
        metadata: { stepOrder: activeStep.stepOrder, note: dto.note },
        newValue: { status: nextStatus },
      });

      return updated;
    });

    // Mark versi sebagai APPROVED hanya di step terakhir
    if (isFinalStep) {
      await this.projectVersionService.markVersionApproved(
        id,
        userId,
        dto.note,
      );
    }

    await this.invalidateProjectCache(id, project.createdBy);
    return updatedProject;
  }

  // ─── Reject: push ke REVISION + mark version REJECTED ───────────────────────
  async rejectProject(
    id: string,
    userId: string,
    role: Role,
    dto: ReviewProjectDto,
  ): Promise<any> {
    const project = (await this.findOne(id)) as any;

    if (!project.versions || project.versions.length === 0) {
      throw new BadRequestException('Project has no versions to reject');
    }

    const latestVersion = project.versions[0];
    const activeStep = latestVersion.approvalSteps.find(
      (s: any) => s.status === ApprovalStatus.PENDING,
    );

    if (!activeStep) {
      throw new BadRequestException('No pending approval step found');
    }

    if (activeStep.requiredRole !== role && role !== Role.ADMIN) {
      throw new ForbiddenException(
        'You do not have the required role to reject this step',
      );
    }

    const updatedProject = await this.prisma.$transaction(async (tx) => {
      await tx.versionApproval.update({
        where: { id: activeStep.id },
        data: {
          status: ApprovalStatus.REJECTED,
          approvedBy: userId,
          approvedAt: new Date(),
          note: dto.note,
        },
      });

      const updated = await tx.project.update({
        where: { id },
        data: {
          status: ProjectStatus.REVISION,
          rejectedAt: new Date(),
          rejectedBy: userId,
        },
      });

      await this.auditLogService.log({
        userId,
        action: 'PROJECT_STEP_REJECTED',
        entity: 'Project',
        entityId: id,
        metadata: {
          stepOrder: activeStep.stepOrder,
          note: dto.note,
          reason: dto.note,
        },
        newValue: { status: ProjectStatus.REVISION },
      });

      return updated;
    });

    // Mark versi yang sedang di-review sebagai REJECTED
    await this.projectVersionService.markVersionRejected(id, userId, dto.note);

    await this.invalidateProjectCache(id, project.createdBy);
    return updatedProject;
  }

  // ─── Get version list ────────────────────────────────────────────────────────
  async getVersions(projectId: string) {
    return this.projectVersionService.listVersions(projectId);
  }

  // ─── Compare dua versi ───────────────────────────────────────────────────────
  async compareVersions(projectId: string, vA?: number, vB?: number) {
    return this.projectVersionService.compareVersions(projectId, vA, vB);
  }

  // ─── Request Revision: Creator pulls back a submission ───────────────────────
  async requestRevision(id: string, userId: string): Promise<any> {
    const project = (await this.findOne(id)) as any;

    if (project.createdBy !== userId) {
      throw new ForbiddenException(
        'Only the creator can request a revision for their project',
      );
    }

    if (
      project.status !== ProjectStatus.L1_REVIEW &&
      project.status !== ProjectStatus.L2_REVIEW &&
      project.status !== ProjectStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Project is not in a state that can be recalled for revision',
      );
    }

    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: {
        status: ProjectStatus.REVISION,
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'PROJECT_REVISION_REQUESTED_BY_CREATOR',
      entity: 'Project',
      entityId: id,
      newValue: { status: ProjectStatus.REVISION },
    });

    await this.invalidateProjectCache(id, userId);
    return updatedProject;
  }
}
