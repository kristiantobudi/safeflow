import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { RedisService } from '../../common/redis/redis.service';
import { CreateWorkerVendorDto } from './dto/create-worker-vendor.dto';
import { UpdateWorkerVendorDto } from './dto/update-worker-vendor.dto';
import { parseExcelRegisterWorkerVendor } from '../../utils/excel.parser';
import * as XLSX from 'xlsx';
import { MinioService } from '../../common/minio/minio.service';

@Injectable()
export class WorkerVendorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly redisService: RedisService,
    private readonly minioService: MinioService,
  ) {}

  async addWorkerVendor(data: CreateWorkerVendorDto, userId: string) {
    const workerVendor = await this.prisma.workerVendor.create({
      data: {
        ...data,
        status: data.status || 'ACTIVE',
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

    await this.auditLogService.log({
      userId,
      action: 'WORKER_VENDOR_CREATED',
      entity: 'WorkerVendor',
      entityId: workerVendor.id,
      newValue: workerVendor,
    });

    await this.redisService.delByPattern('worker-vendors:*');
    return workerVendor;
  }

  async updateWorkerVendor(
    workerVendorId: string,
    data: UpdateWorkerVendorDto,
    userId: string,
  ) {
    const existingWorkerVendor = await this.prisma.workerVendor.findUnique({
      where: { id: workerVendorId },
    });

    if (!existingWorkerVendor || existingWorkerVendor.deletedAt) {
      throw new NotFoundException(
        `Worker vendor with ID ${workerVendorId} not found`,
      );
    }

    const workerVendor = await this.prisma.workerVendor.update({
      where: { id: workerVendorId },
      data: {
        ...data,
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

    await this.auditLogService.log({
      userId,
      action: 'WORKER_VENDOR_UPDATED',
      entity: 'WorkerVendor',
      entityId: workerVendor.id,
      oldValue: existingWorkerVendor,
      newValue: workerVendor,
    });

    await this.redisService.delByPattern('worker-vendors:*');
    return workerVendor;
  }

  async findAll(page = 1, limit = 10) {
    const cacheKey = `worker-vendors:${page}:${limit}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const skip = (page - 1) * limit;
    const [workerVendors, total] = await Promise.all([
      this.prisma.workerVendor.findMany({
        skip,
        take: limit,
        where: {
          deletedAt: null,
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          vendor: {
            select: {
              id: true,
              vendorName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workerVendor.count({
        where: { deletedAt: null },
      }),
    ]);

    const result = {
      data: workerVendors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    await this.redisService.set(cacheKey, result, 60 * 60 * 24);
    return result;
  }

  async findOne(workerVendorId: string) {
    const cacheKey = `worker-vendor:${workerVendorId}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const workerVendor = await this.prisma.workerVendor.findUnique({
      where: { id: workerVendorId },
      include: {
        createdByUser: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        vendor: true,
      },
    });

    if (!workerVendor || workerVendor.deletedAt) {
      throw new NotFoundException(
        `Worker vendor with ID ${workerVendorId} not found`,
      );
    }

    await this.redisService.set(cacheKey, workerVendor, 60 * 60 * 24);
    return workerVendor;
  }

  async remove(workerVendorId: string, userId: string) {
    const existingWorkerVendor = await this.prisma.workerVendor.findUnique({
      where: { id: workerVendorId },
    });

    if (!existingWorkerVendor || existingWorkerVendor.deletedAt) {
      throw new NotFoundException(
        `Worker vendor with ID ${workerVendorId} not found`,
      );
    }

    const workerVendor = await this.prisma.workerVendor.update({
      where: { id: workerVendorId },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'WORKER_VENDOR_DELETED',
      entity: 'WorkerVendor',
      entityId: workerVendor.id,
      oldValue: existingWorkerVendor,
      newValue: { deletedAt: workerVendor.deletedAt, deletedBy: userId },
    });

    await this.redisService.delByPattern('worker-vendors:*');
    return workerVendor;
  }

  /**
   * Mengenerasi template Excel pendaftaran Worker Vendor dengan format kustom
   */
  async generateRegisterTemplate() {
    // Ambil semua vendor yang aktif untuk referensi
    const activeVendors = await this.prisma.vendor.findMany({
      where: { deletedAt: null },
      select: { vendorName: true },
      orderBy: { vendorName: 'asc' },
    });

    const firstVendor = activeVendors[0]?.vendorName || 'PT. Contoh';

    // Susun data dalam bentuk Array of Arrays (AOA) agar bebas mengatur baris atas
    const aoaData = [
      ['📋  TEMPLATE BULK WORKER VENDOR'],
      [
        'Isi data mulai baris ke-5 ▸ Kolom merah = wajib diisi ▸ Jangan ubah baris header',
      ],
      [],
      [],
      ['No', 'Nama Lengkap *', 'Phone *', 'Alamat *', 'Nama Vendor *'],
      ['1', 'Budi Santoso', '08123456789', 'Boyolali', firstVendor],
      ['2', 'Siti Rahayu', '08234567890', 'Boyolali', firstVendor],
      ['3', 'Ahmad Fauzi', '08345678901', 'Boyolali', firstVendor],
      ['4', 'Dewi Kurniawati', '', 'Boyolali', firstVendor],
      ['5', 'Rudi Hermawan', '08567890123', 'Boyolali', firstVendor],
    ];

    const wb = XLSX.utils.book_new();

    // Sheet 1: Template
    const wsTemplate = XLSX.utils.aoa_to_sheet(aoaData);

    // Tambahkan sedikit gaya styling (opsional, hanya lebar kolom dasar)
    wsTemplate['!cols'] = [
      { wch: 5 }, // No
      { wch: 25 }, // Nama Lengkap
      { wch: 20 }, // Phone
      { wch: 30 }, // Alamat
      { wch: 25 }, // Nama Vendor
    ];

    XLSX.utils.book_append_sheet(wb, wsTemplate, 'Template Registrasi');

    // Sheet 2: Daftar Vendor untuk referensi
    const vendorReference = activeVendors.map((v) => ({
      'Nama Vendor Tersedia': v.vendorName,
    }));
    const wsReference = XLSX.utils.json_to_sheet(vendorReference);
    XLSX.utils.book_append_sheet(wb, wsReference, 'Daftar Vendor');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  async bulkRegisterWorkerVendor(
    file: Express.Multer.File,
    createdBy?: string,
  ) {
    if (!file) {
      await this.auditLogService.log({
        userId: createdBy,
        action: 'WORKER_VENDOR_BULK_REGISTERED',
        entity: 'WorkerVendor',
        status: 'FAILURE',
        metadata: { reason: 'File is missing' },
      });
      throw new BadRequestException('File is required');
    } else {
      await this.minioService.uploadFile(file, 'worker-vendor');
    }

    const rawWorkerVendor = parseExcelRegisterWorkerVendor(file.buffer);

    const validWorkerVendor: Array<any> = [];
    const failedRows: Array<any> = [];

    for (const [index, workerVendor] of rawWorkerVendor.entries()) {
      const { name, phone, address, status, vendorName } = workerVendor as any;
      const rowNumber = index + 2; // +1 untuk header, +1 untuk 0-based index

      if (!name || !phone || !vendorName) {
        failedRows.push({
          row: rowNumber,
          reason: 'Missing name, phone, or vendorName',
          data: workerVendor,
        });
        continue;
      }

      const cleanVendorName = vendorName.toString().trim();

      // Cari vendor dengan mode insensitive agar lebih fleksibel
      const vendor = await this.prisma.vendor.findFirst({
        where: {
          vendorName: {
            equals: cleanVendorName,
            mode: 'insensitive',
          },
          deletedAt: null,
        },
      });

      if (!vendor) {
        failedRows.push({
          row: rowNumber,
          reason: `Vendor '${cleanVendorName}' not found or inactive`,
          data: workerVendor,
        });
        continue;
      }

      validWorkerVendor.push({
        name: name.toString().trim(),
        phone: phone.toString().trim(),
        address: address?.toString().trim() || '',
        status: status || 'ACTIVE',
        vendorId: vendor.id,
        createdBy,
        updatedBy: createdBy,
      });
    }

    if (validWorkerVendor.length === 0) {
      await this.auditLogService.log({
        userId: createdBy,
        action: 'WORKER_VENDOR_BULK_REGISTERED',
        entity: 'WorkerVendor',
        status: 'FAILURE',
        metadata: { reason: 'No valid data found', failures: failedRows },
      });
      throw new BadRequestException({
        message: 'No valid data found in excel file',
        errors: failedRows.slice(0, 10), // Kirim 10 error pertama ke client
      });
    }

    // Melakukan Batch Insert ke database
    const createdCount = await this.prisma.workerVendor.createMany({
      data: validWorkerVendor,
    });

    await this.auditLogService.log({
      userId: createdBy,
      action: 'WORKER_VENDOR_BULK_REGISTERED',
      entity: 'WorkerVendor',
      status: 'SUCCESS',
      metadata: {
        totalProcessed: rawWorkerVendor.length,
        totalCreated: createdCount.count,
        totalFailed: failedRows.length,
        failures: failedRows.length > 0 ? failedRows : undefined,
      },
    });

    await this.redisService.delByPattern('worker-vendors:*');

    return {
      success: true,
      message: `Successfully registered ${createdCount.count} workers`,
      totalProcessed: rawWorkerVendor.length,
      totalCreated: createdCount.count,
      totalFailed: failedRows.length,
      errors: failedRows.length > 0 ? failedRows : undefined,
    };
  }
}
