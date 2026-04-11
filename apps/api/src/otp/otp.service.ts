import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RedisService } from '../common/redis/redis.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
    private readonly redisService: RedisService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: any,
  ) {}

  /**
   * STEP 1 — Generate secret + QR Code for user to scan
   * Does NOT enable 2FA yet. User must verify first.
   */
  async generate2FASecret(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled for this account');
    }

    const appName = this.configService.get<string>('APP_NAME', 'NestJS-App');

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `${appName} (${user.email})`,
      length: 32,
    });

    // Store secret temporarily in Redis (not enabled yet until verified)
    const redisKey = `otp:setup:${userId}`;
    await this.redisService.set(redisKey, secret.base32, 600); // 10 minutes TTL

    // Generate QR code as base64 data URL
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    this.logger.log(
      `2FA setup initiated for user: ${user.email}`,
      'OtpService',
    );

    return {
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
      manualEntryKey: secret.base32,
      message:
        'Scan the QR code with Google Authenticator / Authy, then verify with a code to activate 2FA',
    };
  }

  /**
   * STEP 2 — Verify the OTP code and ENABLE 2FA
   * Also generates backup codes on first enable
   */
  async enable2FA(
    userId: string,
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }
    const redisKey = `otp:setup:${userId}`;
    const pendingSecret = await this.redisService.get(redisKey);

    if (!pendingSecret) {
      throw new BadRequestException(
        '2FA setup expired. Please generate a new setup via /otp/setup',
      );
    }

    const isValid = this.verifyToken(pendingSecret, token);
    if (!isValid) {
      await this.auditLogService.log({
        userId,
        action: '2FA_ENABLE_FAILED',
        entity: 'User',
        entityId: userId,
        status: 'FAILURE',
        ipAddress,
        userAgent,
      });
      throw new BadRequestException('Invalid OTP code. Please try again.');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(8);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 10)),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: pendingSecret,
        twoFactorBackupCodes: hashedBackupCodes,
      },
    });

    await this.redisService.del(redisKey);

    await this.auditLogService.log({
      userId,
      action: '2FA_ENABLED',
      entity: 'User',
      entityId: userId,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
    });

    this.logger.log(`2FA enabled for user: ${user.email}`, 'OtpService');

    return {
      message: '2FA has been enabled successfully',
      backupCodes, // Show ONCE — user must save these
      warning:
        'Save these backup codes in a safe place. They will NOT be shown again.',
    };
  }

  /**
   * Disable 2FA — requires valid OTP or backup code
   */
  async disable2FA(
    userId: string,
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled for this account');
    }

    const isValid = this.verifyToken(user.twoFactorSecret || '', token);
    if (!isValid) {
      await this.auditLogService.log({
        userId,
        action: '2FA_DISABLE_FAILED',
        entity: 'User',
        entityId: userId,
        status: 'FAILURE',
        ipAddress,
        userAgent,
      });
      throw new BadRequestException('Invalid OTP code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    });

    await this.auditLogService.log({
      userId,
      action: '2FA_DISABLED',
      entity: 'User',
      entityId: userId,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
    });

    this.logger.log(`2FA disabled for user: ${user.email}`, 'OtpService');
    return { message: '2FA has been disabled successfully' };
  }

  /**
   * Validate OTP during login (called from AuthService)
   */
  async validateOtpForLogin(
    userId: string,
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorEnabled) return true; // 2FA not enabled = skip

    // Try TOTP first
    const isValidTotp = this.verifyToken(user.twoFactorSecret || '', token);
    if (isValidTotp) return true;

    // Try backup codes
    const isValidBackup = await this.verifyBackupCode(
      userId,
      token,
      user.twoFactorBackupCodes,
    );
    if (isValidBackup) return true;

    await this.auditLogService.log({
      userId,
      action: 'LOGIN_2FA_FAILED',
      entity: 'User',
      entityId: userId,
      status: 'FAILURE',
      ipAddress,
      userAgent,
    });

    throw new ForbiddenException('Invalid 2FA code');
  }

  /**
   * Check if user has 2FA enabled (for login flow)
   */
  async is2FAEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    return user?.twoFactorEnabled ?? false;
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    const isValid = this.verifyToken(user.twoFactorSecret || '', token);
    if (!isValid) throw new BadRequestException('Invalid OTP code');

    const backupCodes = this.generateBackupCodes(8);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 10)),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorBackupCodes: hashedBackupCodes },
    });

    return {
      backupCodes,
      warning: 'Save these backup codes. Previous codes are now invalid.',
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1, // Allow 30s clock drift
    });
  }

  private generateBackupCodes(count: number): string[] {
    return Array.from({ length: count }, () =>
      uuidv4().replace(/-/g, '').substring(0, 10).toUpperCase(),
    );
  }

  private async verifyBackupCode(
    userId: string,
    inputCode: string,
    hashedCodes: string[],
  ): Promise<boolean> {
    for (let i = 0; i < hashedCodes.length; i++) {
      const hashedCode = hashedCodes[i];
      if (!hashedCode) continue;

      const match = await bcrypt.compare(inputCode, hashedCode);
      if (match) {
        // Remove used backup code (one-time use)
        const updatedCodes = hashedCodes.filter((_, idx) => idx !== i);
        await this.prisma.user.update({
          where: { id: userId },
          data: { twoFactorBackupCodes: updatedCodes },
        });
        this.logger.warn(`Backup code used by user: ${userId}`, 'OtpService');
        return true;
      }
    }
    return false;
  }
}
