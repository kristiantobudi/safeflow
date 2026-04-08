import { Injectable, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuditStatus } from '@repo/database';

export interface AuditLogPayload {
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  status?: 'SUCCESS' | 'FAILURE' | 'PENDING';
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditLogService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: any,
  ) {}

  /**
   * Write an audit log entry (non-blocking, never throws)
   */
  async log(payload: AuditLogPayload): Promise<void> {
    try {
      const validUserId =
        payload.userId && /^[a-fA-F0-9]{24}$/.test(payload.userId)
          ? payload.userId
          : null;

      await this.prisma.auditLog.create({
        data: {
          userId: validUserId,
          action: payload.action,
          entity: payload.entity || null,
          entityId: payload.entityId || null,
          oldValue: payload.oldValue || undefined,
          newValue: payload.newValue || undefined,
          ipAddress: payload.ipAddress || null,
          userAgent: payload.userAgent || null,
          requestId: payload.requestId || null,
          status: (payload.status as AuditStatus) || AuditStatus.SUCCESS,
          metadata: payload.metadata || undefined,
        },
      });
    } catch (error: any) {
      // Audit log must NEVER break the main flow
      this.logger.error(
        'Failed to write audit log: ' + error.message,
        error.stack,
        'AuditLogService',
      );
    }
  }

  /**
   * Query audit logs with filters and pagination
   */
  async findAll(options: {
    userId?: string;
    action?: string;
    entity?: string;
    status?: AuditStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      userId,
      action,
      entity,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = options;

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (entity) where.entity = entity;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, username: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get audit history for a specific user
   */
  async findByUser(userId: string, page = 1, limit = 20) {
    return this.findAll({ userId, page, limit });
  }

  /**
   * Get audit history for a specific entity (e.g. a Post)
   */
  async findByEntity(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entity, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Archive logs older than X days (default 30)
   * Runs every day at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleLogCleanup() {
    this.logger.log('Starting scheduled audit log cleanup...', 'AuditLogService');
    const deletedCount = await this.archiveLogs(30);
    this.logger.log(
      `Cleanup finished. Deleted ${deletedCount} logs.`,
      'AuditLogService',
    );
  }

  async archiveLogs(olderThanDays: number): Promise<number> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - olderThanDays);

    try {
      // 1. In a production app, you would fetch and upload to S3 here
      // const logsToArchive = await this.prisma.auditLog.findMany({
      //   where: { createdAt: { lt: thresholdDate } }
      // });
      // await uploadToS3(JSON.stringify(logsToArchive));

      // 2. Delete from database to free up space
      const result = await this.prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: thresholdDate,
          },
        },
      });

      return result.count;
    } catch (error: any) {
      this.logger.error(
        'Failed to archive audit logs: ' + error.message,
        error.stack,
        'AuditLogService',
      );
      return 0;
    }
  }
}
