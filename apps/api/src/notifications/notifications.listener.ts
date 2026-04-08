import { Injectable, Inject } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { NotificationType, Role } from '@repo/database';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

export interface UserRegisteredEvent {
  userId: string;
  email: string;
  username: string;
  displayName?: string;
  provider: 'LOCAL' | 'GOOGLE';
  registeredAt: Date;
}

@Injectable()
export class NotificationsListener {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly usersService: UsersService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: any,
  ) {}

  /**
   * Dipanggil saat event 'user.registered' diterima
   * Trigger: register LOCAL atau Google SSO
   */
  async handleUserRegistered(event: UserRegisteredEvent) {
    this.logger.log(
      `Event received: user.registered | ${event.email} via ${event.provider}`,
      'NotificationsListener',
    );

    const displayName = event.displayName || event.username;
    const isGoogle = event.provider === 'GOOGLE';

    // ─── 1. Buat notifikasi in-app ─────────────────────────────────
    await this.notificationsService.create({
      type: isGoogle
        ? NotificationType.USER_REGISTERED_GOOGLE
        : NotificationType.USER_REGISTERED_LOCAL,
      title: `Pengguna Baru: ${displayName}`,
      message: isGoogle
        ? `${displayName} (${event.email}) baru saja mendaftar menggunakan Google SSO.`
        : `${displayName} (${event.email}) baru saja mendaftar menggunakan email & password.`,
      visibleTo: [Role.ADMIN],
      data: {
        userId: event.userId,
        email: event.email,
        username: event.username,
        provider: event.provider,
        registeredAt: event.registeredAt,
      },
    });

    // ─── 2. Kirim email ke semua ADMIN ─────────────────────────────
    try {
      const adminUsers = await this.usersService.findAllByRole(Role.ADMIN);
      const adminEmails = adminUsers
        .filter((u) => u.isEmailVerified)
        .map((u) => u.email);

      if (adminEmails.length > 0) {
        await this.mailService.notifyAdminsNewUser({
          id: event.userId,
          email: event.email,
          username: event.username,
          displayName: event.displayName,
          provider: event.provider,
        });
      } else {
        this.logger.warn(
          'No verified admin emails found to notify',
          'NotificationsListener',
        );
      }
    } catch (err: any) {
      // Email failure tidak boleh throw
      this.logger.error(
        'Email notification failed: ' + err.message,
        err.stack,
        'NotificationsListener',
      );
    }
  }
}
