import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../database/prisma.service';
import { Role } from '@repo/database';
import {
  newUserEmailTemplate,
  NewUserEmailContext,
} from './templates/new-user.template';
import {
  InvitationEmailContext,
  invitationEmailTemplate,
} from './templates/invitation.template';
import {
  bulkRegisterEmailTemplate,
  BulkRegisterEmailContext,
} from './templates/bulk-register.template';
import {
  bulkRegisterAdminTemplate,
  BulkRegisterAdminContext,
} from './templates/bulk-register-admin.template';

@Injectable()
export class MailService implements OnModuleInit {
  private transporter!: nodemailer.Transporter;
  private isReady = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: any,
  ) {}

  async onModuleInit() {
    // Buat transporter Gmail SMTP saat app start
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // SSL
      auth: {
        user: this.configService.get<string>('GMAIL_USER'),
        pass: this.configService.get<string>('GMAIL_APP_PASSWORD'),
      },
    });

    // Verifikasi koneksi (non-blocking)
    try {
      await this.transporter.verify();
      this.isReady = true;
      this.logger.log('Gmail SMTP transporter ready', 'MailService');
    } catch (err: any) {
      this.isReady = false;
      this.logger.warn(
        `Gmail SMTP not configured or unreachable: ${err.message}. Email notifications will be skipped.`,
        'MailService',
      );
    }
  }

  /**
   * Kirim email notifikasi ke SEMUA admin di database
   * saat ada user baru register
   * Non-blocking — tidak pernah break flow utama
   */
  async notifyAdminsNewUser(newUser: {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    provider: 'LOCAL' | 'GOOGLE';
  }): Promise<void> {
    if (!this.isReady) {
      this.logger.warn(
        'Mail service not ready — skipping email notification',
        'MailService',
      );
      return;
    }

    try {
      // Ambil semua admin aktif dari DB
      const admins = await this.prisma.user.findMany({
        where: { role: Role.ADMIN, isActive: true },
        select: { id: true, email: true, username: true, displayName: true },
      });

      if (admins.length === 0) {
        this.logger.warn('No active admins found to notify', 'MailService');
        return;
      }

      const dashboardUrl = this.configService.get<string>(
        'FRONTEND_URL',
        'http://localhost:3000',
      );

      const registeredAt = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'full',
        timeStyle: 'short',
      });

      // Kirim ke tiap admin secara paralel
      const emailPromises = admins.map((admin) => {
        const ctx: NewUserEmailContext = {
          adminName: admin.displayName || admin.username,
          newUserEmail: newUser.email,
          newUserUsername: newUser.username,
          newUserDisplayName: newUser.displayName,
          provider: newUser.provider,
          registeredAt,
          dashboardUrl: `${dashboardUrl}/admin/users`,
        };

        return this.sendMail({
          to: admin.email,
          subject: `👤 Pengguna Baru: ${newUser.username} mendaftar via ${newUser.provider}`,
          html: newUserEmailTemplate(ctx),
        });
      });

      // Kirim semua, abaikan yang gagal
      const results = await Promise.allSettled(emailPromises);
      const sent = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      this.logger.log(
        `New user email notification: ${sent} sent, ${failed} failed (to ${admins.length} admins)`,
        'MailService',
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to send admin notification: ${err.message}`,
        err.stack,
        'MailService',
      );
    }
  }

  /**
   * Kirim email generic
   */
  async sendMail(options: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    if (!this.isReady) return;

    await this.transporter.sendMail({
      from: `"${this.configService.get('APP_NAME', 'NestJS App')}" <${this.configService.get('GMAIL_USER')}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  }

  async sendInvitationEmail(options: {
    recipientEmail: string;
    inviterName: string;
    inviterEmail: string;
    role: string;
    token: string;
    note?: string;
    expiresAt: Date;
  }): Promise<void> {
    if (!this.isReady) {
      this.logger.warn(
        `Mail service belum siap — melewati pengiriman undangan ke ${options.recipientEmail}`,
        'MailService',
      );
      return;
    }

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );

    // URL ke halaman register frontend dengan token terlampir
    const registerUrl = `${frontendUrl}/register?token=${options.token}&email=${encodeURIComponent(options.recipientEmail)}`;

    const expiresAt = options.expiresAt.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const ctx: InvitationEmailContext = {
      recipientEmail: options.recipientEmail,
      inviterName: options.inviterName,
      inviterEmail: options.inviterEmail,
      role: options.role,
      note: options.note,
      registerUrl,
      expiresAt,
      appName: this.configService.get<string>('APP_NAME', 'NestJS App'),
    };

    try {
      await this.sendMail({
        to: options.recipientEmail,
        subject: `✉️ Kamu diundang bergabung ke ${ctx.appName}`,
        html: invitationEmailTemplate(ctx),
      });

      this.logger.log(
        `Invitation email sent to ${options.recipientEmail}`,
        'MailService',
      );
    } catch (err: any) {
      this.logger.error(
        `Gagal kirim invitation email ke ${options.recipientEmail}: ${err.message}`,
        err.stack,
        'MailService',
      );
    }
  }
  async sendBulkRegistrationEmail(
    options: Omit<BulkRegisterEmailContext, 'appName' | 'loginUrl'>,
  ): Promise<void> {
    if (!this.isReady) {
      this.logger.warn(
        `Mail service belum siap — melewati pengiriman bulk register email ke ${options.email}`,
        'MailService',
      );
      return;
    }

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const appName = this.configService.get<string>('APP_NAME', 'NestJS App');

    const ctx: BulkRegisterEmailContext = {
      ...options,
      appName,
      loginUrl: `${frontendUrl}/login`,
    };

    try {
      await this.sendMail({
        to: options.email,
        subject: `🎉 Selamat Bergabung di ${appName}`,
        html: bulkRegisterEmailTemplate(ctx),
      });
      // Silent success since this will be called many times
    } catch (err: any) {
      this.logger.error(
        `Gagal kirim bulk register email ke ${options.email}: ${err.message}`,
        err.stack,
        'MailService',
      );
    }
  }

  async sendAdminBulkReportEmail(
    options: Omit<BulkRegisterAdminContext, 'appName' | 'dashboardUrl'>,
  ): Promise<void> {
    if (!this.isReady) {
      this.logger.warn(
        'Mail service belum siap — melewati pengiriman laporan bulk register ke admin',
        'MailService',
      );
      return;
    }

    try {
      // Ambil admin yang akan dilaporkan let's say to all admins in the system or the specific one
      const adminEmails = await this.prisma.user.findMany({
        where: { role: Role.ADMIN, isActive: true },
        select: { email: true },
      });

      const adminAddresses = adminEmails.map((a) => a.email);
      if (adminAddresses.length === 0) return;

      const frontendUrl = this.configService.get<string>(
        'FRONTEND_URL',
        'http://localhost:3000',
      );
      const appName = this.configService.get<string>('APP_NAME', 'NestJS App');

      const ctx: BulkRegisterAdminContext = {
        ...options,
        appName,
        dashboardUrl: `${frontendUrl}/admin/users`,
      };

      await this.sendMail({
        to: adminAddresses,
        subject: `📊 Laporan Pendaftaran Massal Selesai`,
        html: bulkRegisterAdminTemplate(ctx),
      });

      this.logger.log(
        'Bulk register admin report sent to admins',
        'MailService',
      );
    } catch (err: any) {
      this.logger.error(
        `Gagal kirim laporan bulk register ke admin: ${err.message}`,
        err.stack,
        'MailService',
      );
    }
  }
}
