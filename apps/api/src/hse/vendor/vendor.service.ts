import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { MinioService } from '../../common/minio/minio.service';

@Injectable()
export class VendorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly redisService: RedisService,
    private readonly minioService: MinioService,
  ) {}

  /**
   * Menambahkan vendor baru dengan upload logo (menyimpan key)
   */
  async addVendor(
    data: CreateVendorDto,
    userId: string,
    file?: Express.Multer.File,
  ) {
    const vendorName = await this.prisma.vendor.findFirst({
      where: {
        vendorName: data.vendorName,
        deletedAt: null,
      },
    });

    if (vendorName) {
      throw new BadRequestException(
        `Vendor with name ${data.vendorName} already exists`,
      );
    }

    let logoKey = data.vendorLogo;

    if (file) {
      logoKey = await this.minioService.uploadFile(file, 'vendors');
    }

    const vendor = await this.prisma.vendor.create({
      data: {
        ...data,
        vendorLogo: logoKey,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Transform key ke URL untuk response
    vendor.vendorLogo = await this.minioService.getFileUrl(vendor.vendorLogo);

    await this.auditLogService.log({
      userId,
      action: 'VENDOR_CREATED',
      entity: 'Vendor',
      entityId: vendor.id,
      newValue: vendor,
    });

    await this.redisService.delByPattern('vendors:*');
    return vendor;
  }

  /**
   * Update data vendor (beserta penggantian file logo aman)
   */
  async updateVendor(
    data: UpdateVendorDto,
    userId: string,
    vendorId: string,
    file?: Express.Multer.File,
  ) {
    const existingVendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!existingVendor || existingVendor.deletedAt) {
      throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
    }

    let logoKey = data.vendorLogo || existingVendor.vendorLogo;

    if (file) {
      if (existingVendor.vendorLogo) {
        await this.minioService.deleteFile(existingVendor.vendorLogo);
      }
      logoKey = await this.minioService.uploadFile(file, 'vendors');
    }

    const vendor = await this.prisma.vendor.update({
      where: {
        id: vendorId,
      },
      data: {
        ...data,
        vendorLogo: logoKey,
        updatedBy: userId,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    vendor.vendorLogo = await this.minioService.getFileUrl(vendor.vendorLogo);

    await this.auditLogService.log({
      userId,
      action: 'VENDOR_UPDATED',
      entity: 'Vendor',
      entityId: vendor.id,
      oldValue: existingVendor,
      newValue: vendor,
    });

    await this.redisService.delByPattern('vendors:*');
    return vendor;
  }

  /**
   * Mengambil semua vendor dan men-generate Presigned URL untuk logo masing-masing
   */
  async findAll(page = 1, limit = 10, search?: string) {
    const cacheKey = `vendors:${page}:${limit}:search:${search || ''}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { vendorName: { contains: search, mode: 'insensitive' } },
        { vendorAddress: { contains: search, mode: 'insensitive' } },
        { vendorPhone: { contains: search, mode: 'insensitive' } },
        { vendorEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [vendorsRaw, total, stats] = await Promise.all([
      this.prisma.vendor.findMany({
        skip,
        take: limit,
        where,
        include: {
          createdByUser: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vendor.count({
        where,
      }),
      this.prisma.vendor.count({ where: { deletedAt: null } }).then(async (total) => {
        return {
          total,
          active: await this.prisma.vendor.count({
            where: { vendorStatus: 'ACTIVE', deletedAt: null },
          }),
        };
      }),
    ]);

    // Lakukan transformasi URL setelah data didapat dari database
    const vendors = await Promise.all(
      vendorsRaw.map(async (vendor) => {
        if (vendor.vendorLogo) {
          vendor.vendorLogo = await this.minioService.getFileUrl(
            vendor.vendorLogo,
          );
        }
        return vendor;
      }),
    );

    const result = {
      vendors,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats,
    };

    await this.redisService.set(cacheKey, result, 60 * 60 * 24);
    return result;
  }

  /**
   * Mengambil satu vendor dengan URL logo aman
   */
  async findOne(vendorId: string, userId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: {
        id: vendorId,
      },
      include: {
        workerVendor: {
          where: { deletedAt: null },
        },
        createdByUser: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!vendor || vendor.deletedAt) {
      throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
    }

    if (vendor.vendorLogo) {
      vendor.vendorLogo = await this.minioService.getFileUrl(vendor.vendorLogo);
    }

    return vendor;
  }

  /**
   * Menghapus vendor (Soft Delete)
   */
  async remove(vendorId: string, userId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor || vendor.deletedAt) {
      throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
    }

    // Melakukan Soft Delete
    const deleted = await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'VENDOR_DELETED',
      entity: 'Vendor',
      entityId: vendor.id,
      oldValue: vendor,
      newValue: { deletedAt: deleted.deletedAt, deletedBy: userId },
    });

    await this.redisService.delByPattern('vendors:*');
    return deleted;
  }
}
