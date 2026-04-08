import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NotificationType, Role } from '@repo/database';

export interface CreateNotificationDto {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  visibleTo?: Role[]; // default: [ADMIN, MODERATOR]
  recipientId?: string; // opsional — kalau null = broadcast
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: any,
  ) {}

  /**
   * Buat satu notifikasi (broadcast ke semua ADMIN+MODERATOR)
   * Non-blocking — tidak pernah melempar error ke caller
   */
  async create(dto: CreateNotificationDto): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          type: dto.type,
          title: dto.title,
          message: dto.message,
          data: dto.data ?? undefined,
          visibleTo: dto.visibleTo ?? [Role.ADMIN],
          // visibleTo: dto.visibleTo ?? [Role.ADMIN, Role.MODERATOR],
          recipientId: dto.recipientId ?? null,
        },
      });
      this.logger.log(
        `Notification created: [${dto.type}] ${dto.title}`,
        'NotificationsService',
      );
    } catch (err: any) {
      // Notifikasi TIDAK boleh break flow utama
      this.logger.error(
        `Failed to create notification: ${err.message}`,
        err.stack,
        'NotificationsService',
      );
    }
  }

  /**
   * Notifikasi khusus: user baru register (local)
   */
  async notifyNewUserLocal(user: {
    id: string;
    email: string;
    username: string;
  }): Promise<void> {
    await this.create({
      type: NotificationType.USER_REGISTERED_LOCAL,
      title: '👤 Pengguna Baru Terdaftar',
      message: `${user.username} (${user.email}) baru saja mendaftar menggunakan email & password.`,
      data: {
        userId: user.id,
        email: user.email,
        username: user.username,
        provider: 'LOCAL',
        registeredAt: new Date().toISOString(),
      },
      // visibleTo: [Role.ADMIN, Role.MODERATOR],
      visibleTo: [Role.ADMIN],
    });
  }

  /**
   * Notifikasi khusus: user baru register via Google SSO
   */
  async notifyNewUserGoogle(user: {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    isNew: boolean; // true = baru, false = akun lama yg di-link
  }): Promise<void> {
    const isNew = user.isNew;
    await this.create({
      type: NotificationType.USER_REGISTERED_GOOGLE,
      title: isNew
        ? '🔗 Pengguna Baru via Google'
        : '🔗 Akun Google Dihubungkan',
      message: isNew
        ? `${user.displayName || user.username} (${user.email}) baru saja mendaftar menggunakan Google SSO.`
        : `${user.email} menghubungkan akun Google ke akun yang sudah ada.`,
      data: {
        userId: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        provider: 'GOOGLE',
        isNewUser: isNew,
        registeredAt: new Date().toISOString(),
      },
      // visibleTo: [Role.ADMIN, Role.MODERATOR],
      visibleTo: [Role.ADMIN],
    });
  }

  /**
   * Ambil semua notifikasi untuk role tertentu (ADMIN / MODERATOR)
   * dengan pagination dan filter
   */
  async findForRole(
    role: Role,
    options: {
      page?: number;
      limit?: number;
      onlyUnread?: boolean;
    } = {},
  ) {
    const { page = 1, limit = 20, onlyUnread = false } = options;

    // Hanya ADMIN dan MODERATOR yang boleh lihat
    // if (role !== Role.ADMIN && role !== Role.MODERATOR) {
    if (role !== Role.ADMIN) {
      return {
        notifications: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        unreadCount: 0,
      };
    }

    const where: any = {
      visibleTo: { has: role },
    };
    if (onlyUnread) where.isRead = false;

    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { visibleTo: { has: role }, isRead: false },
      }),
    ]);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  /**
   * Tandai satu notifikasi sebagai sudah dibaca
   */
  async markAsRead(notificationId: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Tandai SEMUA notifikasi sebagai sudah dibaca (untuk role tertentu)
   */
  async markAllAsRead(role: Role): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        visibleTo: { has: role },
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });
    return { count: result.count };
  }

  /**
   * Jumlah notifikasi belum dibaca (untuk badge di frontend)
   */
  async getUnreadCount(role: Role): Promise<number> {
    // if (role !== Role.ADMIN && role !== Role.MODERATOR) return 0;
    if (role !== Role.ADMIN) return 0;
    return this.prisma.notification.count({
      where: { visibleTo: { has: role }, isRead: false },
    });
  }

  /**
   * Hapus notifikasi lama (untuk cleanup — bisa dijadikan cron job)
   */
  async deleteOlderThan(days: number): Promise<{ count: number }> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const result = await this.prisma.notification.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    this.logger.log(
      `Cleaned up ${result.count} notifications older than ${days} days`,
      'NotificationsService',
    );
    return { count: result.count };
  }
}
