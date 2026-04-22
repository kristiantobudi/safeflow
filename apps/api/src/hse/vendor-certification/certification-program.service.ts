import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { RedisService } from '../../common/redis/redis.service';
import { CreateCertificationProgramDto } from './dto/create-certification-program.dto';
import { UpdateCertificationProgramDto } from './dto/update-certification-program.dto';

const CACHE_TTL = 60 * 60; // 1 hour

@Injectable()
export class CertificationProgramService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly redisService: RedisService,
  ) {}

  private async invalidateCache(programId?: string) {
    await this.redisService.delByPattern('cert-programs:*');
    if (programId) {
      await this.redisService.del(`cert-program:${programId}`);
    }
  }

  /**
   * Create a new certification program.
   * Optionally assigns modules in the same call.
   */
  async create(dto: CreateCertificationProgramDto, adminId: string) {
    const existing = await this.prisma.certificationProgram.findFirst({
      where: { name: dto.name, deletedAt: null },
    });

    if (existing) {
      throw new BadRequestException(
        `Certification program with name "${dto.name}" already exists`,
      );
    }

    const program = await this.prisma.certificationProgram.create({
      data: {
        name: dto.name,
        description: dto.description,
        createdBy: adminId,
        updatedBy: adminId,
        ...(dto.moduleIds?.length
          ? {
              modules: {
                create: dto.moduleIds.map((moduleId, index) => ({
                  moduleId,
                  isRequired: true,
                  order: index,
                })),
              },
            }
          : {}),
      },
      include: {
        modules: {
          include: { module: { select: { id: true, title: true } } },
          orderBy: { order: 'asc' },
        },
      },
    });

    await this.auditLogService.log({
      userId: adminId,
      action: 'CERTIFICATION_PROGRAM_CREATED',
      entity: 'CertificationProgram',
      entityId: program.id,
      newValue: program as any,
    });

    await this.invalidateCache();
    return program;
  }

  /**
   * List all active certification programs with pagination.
   */
  async findAll(page = 1, limit = 10, search?: string) {
    const cacheKey = `cert-programs:${page}:${limit}:${search ?? ''}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * limit;
    const where: any = {
      deletedAt: null,
      ...(search
        ? { name: { contains: search, mode: 'insensitive' } }
        : {}),
    };

    const [programs, total] = await Promise.all([
      this.prisma.certificationProgram.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          modules: {
            include: { module: { select: { id: true, title: true } } },
            orderBy: { order: 'asc' },
          },
          _count: { select: { vendors: true } },
        },
      }),
      this.prisma.certificationProgram.count({ where }),
    ]);

    const result = {
      programs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    await this.redisService.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  /**
   * Get a single certification program by ID.
   */
  async findOne(programId: string): Promise<any> {
    const cacheKey = `cert-program:${programId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const program = await this.prisma.certificationProgram.findUnique({
      where: { id: programId },
      include: {
        modules: {
          include: {
            module: {
              select: { id: true, title: true, description: true },
            },
          },
          orderBy: { order: 'asc' },
        },
        vendors: {
          where: { deletedAt: null },
          select: { id: true, vendorName: true, vendorStatus: true },
        },
        creator: { select: { id: true, displayName: true } },
        updater: { select: { id: true, displayName: true } },
      },
    });

    if (!program || program.deletedAt) {
      throw new NotFoundException(
        `Certification program with ID "${programId}" not found`,
      );
    }

    await this.redisService.set(cacheKey, program, CACHE_TTL);
    return program;
  }

  /**
   * Update a certification program's metadata.
   */
  async update(
    programId: string,
    dto: UpdateCertificationProgramDto,
    adminId: string,
  ) {
    const existing = await this.findOne(programId);

    if (dto.name && dto.name !== existing.name) {
      const nameConflict = await this.prisma.certificationProgram.findFirst({
        where: { name: dto.name, deletedAt: null, id: { not: programId } },
      });
      if (nameConflict) {
        throw new BadRequestException(
          `Certification program with name "${dto.name}" already exists`,
        );
      }
    }

    const updated = await this.prisma.certificationProgram.update({
      where: { id: programId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: adminId,
      },
      include: {
        modules: {
          include: { module: { select: { id: true, title: true } } },
          orderBy: { order: 'asc' },
        },
      },
    });

    await this.auditLogService.log({
      userId: adminId,
      action: 'CERTIFICATION_PROGRAM_UPDATED',
      entity: 'CertificationProgram',
      entityId: programId,
      oldValue: existing as any,
      newValue: updated as any,
    });

    await this.invalidateCache(programId);
    return updated;
  }

  /**
   * Soft-delete a certification program.
   */
  async remove(programId: string, adminId: string) {
    const existing = await this.findOne(programId);

    const deleted = await this.prisma.certificationProgram.update({
      where: { id: programId },
      data: {
        deletedAt: new Date(),
        updatedBy: adminId,
      },
    });

    await this.auditLogService.log({
      userId: adminId,
      action: 'CERTIFICATION_PROGRAM_DELETED',
      entity: 'CertificationProgram',
      entityId: programId,
      oldValue: existing as any,
      newValue: { deletedAt: deleted.deletedAt } as any,
    });

    await this.invalidateCache(programId);
    return deleted;
  }

  /**
   * List all available (non-deleted) training modules.
   * Used by the frontend multi-select when creating/editing programs.
   */
  async findAvailableModules() {
    const cacheKey = 'available-modules';
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const modules = await this.prisma.module.findMany({
      where: { isDeleted: false },
      select: { id: true, title: true, description: true },
      orderBy: { title: 'asc' },
    });

    await this.redisService.set(cacheKey, modules, CACHE_TTL);
    return modules;
  }

  /**
   * Upsert modules assigned to a program.
   * Replaces the existing module list with the provided moduleIds.
   */
  async assignModulesToProgram(programId: string, moduleIds: string[], adminId: string) {
    await this.findOne(programId); // validates existence

    // Verify all moduleIds exist
    const modules = await this.prisma.module.findMany({
      where: { id: { in: moduleIds }, isDeleted: false },
      select: { id: true },
    });

    if (modules.length !== moduleIds.length) {
      const foundIds = modules.map((m) => m.id);
      const missing = moduleIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Modules not found or deleted: ${missing.join(', ')}`,
      );
    }

    // Replace all existing module assignments
    await this.prisma.$transaction([
      this.prisma.certificationProgramModule.deleteMany({
        where: { programId },
      }),
      this.prisma.certificationProgramModule.createMany({
        data: moduleIds.map((moduleId, index) => ({
          programId,
          moduleId,
          isRequired: true,
          order: index,
        })),
      }),
    ]);

    await this.auditLogService.log({
      userId: adminId,
      action: 'CERTIFICATION_PROGRAM_MODULES_ASSIGNED',
      entity: 'CertificationProgram',
      entityId: programId,
      newValue: { moduleIds } as any,
    });

    await this.invalidateCache(programId);

    return this.findOne(programId);
  }

  /**
   * Assign a certification program to a vendor.
   */
  async assignVendorToProgram(
    vendorId: string,
    programId: string,
    adminId: string,
  ) {
    const [vendor, program] = await Promise.all([
      this.prisma.vendor.findUnique({ where: { id: vendorId } }),
      this.findOne(programId),
    ]);

    if (!vendor || vendor.deletedAt) {
      throw new NotFoundException(`Vendor with ID "${vendorId}" not found`);
    }

    if (!program.isActive) {
      throw new BadRequestException(
        `Certification program "${program.name}" is not active`,
      );
    }

    const updated = await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        certificationProgramId: programId,
        updatedBy: adminId,
      },
      include: {
        certificationProgram: {
          select: { id: true, name: true },
        },
      },
    });

    await this.auditLogService.log({
      userId: adminId,
      action: 'VENDOR_PROGRAM_ASSIGNED',
      entity: 'Vendor',
      entityId: vendorId,
      newValue: { certificationProgramId: programId } as any,
    });

    await this.redisService.delByPattern('vendors:*');
    await this.invalidateCache(programId);

    return updated;
  }
}
