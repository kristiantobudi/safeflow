import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@repo/database';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(Role.ADMIN, Role.MODERATOR)  // Semua endpoint di sini: ADMIN + MODERATOR only
@Roles(Role.ADMIN) // Semua endpoint di sini: ADMIN + MODERATOR only
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /notifications
   * Ambil semua notifikasi sesuai role pemanggil
   * Query: ?page=1&limit=20&onlyUnread=true
   */
  @Get()
  async findAll(
    @CurrentUser('role') role: Role,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('onlyUnread') onlyUnread?: string,
  ) {
    const result = await this.notificationsService.findForRole(role, {
      page,
      limit,
      onlyUnread: onlyUnread === 'true',
    });
    return { message: 'Notifications fetched', data: result };
  }

  /**
   * GET /notifications/unread-count
   * Jumlah notifikasi belum dibaca — untuk badge di navbar
   */
  @Get('unread-count')
  async getUnreadCount(@CurrentUser('role') role: Role) {
    const count = await this.notificationsService.getUnreadCount(role);
    return { message: 'Unread count fetched', data: { count } };
  }

  /**
   * PATCH /notifications/:id/read
   * Tandai satu notifikasi sebagai sudah dibaca
   */
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    await this.notificationsService.markAsRead(id);
    return { message: 'Notification marked as read', data: null };
  }

  /**
   * PATCH /notifications/read-all
   * Tandai semua notifikasi sebagai sudah dibaca
   */
  @Patch('read-all')
  async markAllAsRead(@CurrentUser('role') role: Role) {
    const result = await this.notificationsService.markAllAsRead(role);
    return {
      message: `${result.count} notifications marked as read`,
      data: result,
    };
  }

  /**
   * DELETE /notifications/cleanup?days=30
   * Hapus notifikasi lama — ADMIN only
   */
  @Delete('cleanup')
  @Roles(Role.ADMIN)
  async cleanup(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    const result = await this.notificationsService.deleteOlderThan(days);
    return {
      message: `Deleted ${result.count} notifications older than ${days} days`,
      data: result,
    };
  }
}
