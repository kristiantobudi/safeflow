import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RedisService } from '../common/redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { InvitationsService } from '../invitations/invitations.service';
import { AuthProvider } from '@repo/database';
import { parseExcelRegisterUser } from '../utils/excel.parser';

interface GoogleUserDto {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  isEmailVerified: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly invitationService: InvitationsService,
    private readonly redisService: RedisService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async register(
    registerDto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const { firstName, lastName, email, username, password, invitationToken } =
      registerDto;

    let invitationData: any = null;
    if (invitationToken) {
      try {
        const result =
          await this.invitationService.validateToken(invitationToken);
        invitationData = result.invitation;

        if (invitationData.email.toLowerCase() !== email.toLowerCase()) {
          throw new BadRequestException(
            `Email tidak sesuai dengan undangan. Gunakan email: ${invitationData.email}`,
          );
        }
      } catch (err: any) {
        throw new BadRequestException(
          `Token undangan tidak valid: ${err.message}`,
        );
      }
    }

    const existingUser = await this.usersService.findByEmailOrUsername(
      email,
      username,
    );
    if (existingUser) {
      await this.auditLogService.log({
        action: 'REGISTER_FAILED',
        entity: 'User',
        ipAddress,
        userAgent,
        status: 'FAILURE',
        metadata: { reason: 'Email or username exists', email },
      });
      throw new ConflictException('Email or username already exists');
    }

    const bcryptedSaltRounds = Number(
      this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12),
    );

    const saltRounds = bcryptedSaltRounds;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    let user = await this.usersService.create({
      firstName,
      lastName,
      email,
      username,
      password: hashedPassword,
      isEmailVerified: true,
      authProvider: AuthProvider.LOCAL,
      ...(invitationData && {
        role: invitationData.role,
      }),
    });

    this.logger.log(`User registered: ${email}`, 'AuthService');
    if (invitationToken && invitationData) {
      await this.invitationService.acceptInvitation(invitationToken, user.id);
      // Refresh user object to get the updated role/fields from acceptInvitation
      const updatedUser = await this.usersService.findById(user.id);
      if (updatedUser) user = updatedUser;
    }

    const tokens = this.generateTokens(user);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    await this.auditLogService.log({
      userId: user.id,
      action: invitationToken
        ? 'USER_REGISTERED_VIA_INVITE'
        : 'USER_REGISTERED',
      entity: 'User',
      entityId: user.id,
      newValue: {
        email,
        username,
        provider: 'LOCAL',
        viaInvite: !!invitationToken,
      },
      ipAddress,
      userAgent,
      status: 'SUCCESS',
    });

    // ── In-App Notification (non-blocking) ───────────────────────────────
    this.notificationsService.notifyNewUserLocal({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    // ── Email ke Admin (non-blocking) ─────────────────────────────────────
    this.mailService.notifyAdminsNewUser({
      id: user.id,
      email: user.email,
      username: user.username,
      provider: 'LOCAL',
    });

    this.logger.log(
      `User registered (LOCAL${invitationToken ? ', via invite' : ''}): ${email}`,
      'AuthService',
    );

    this.logger.log(`User registered (LOCAL): ${email}`, 'AuthService');

    const { password: _, refreshToken: __, ...userWithoutSensitive } = user;
    return { user: userWithoutSensitive, ...tokens };
  }

  async uploadExcelToRegister(
    file: Express.Multer.File,
    createdBy?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (!file) {
      await this.auditLogService.log({
        userId: createdBy,
        action: 'BULK_REGISTER_FAILED',
        entity: 'User',
        ipAddress: ipAddress,
        userAgent: userAgent,
        status: 'FAILURE',
        metadata: { reason: 'File is missing' },
      });
      throw new BadRequestException('File is required');
    }

    const rawUsers = parseExcelRegisterUser(file.path);

    const bcryptedSaltRounds = Number(
      this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12),
    );

    const emails = rawUsers.map((u) => u.email);
    const usernames = rawUsers.map((u) => u.username);

    const existingUsers = await this.usersService.findUsernameOrEmailExisting(
      usernames,
      emails,
    );

    const existingEmailSet = new Set(existingUsers.map((u) => u.email));
    const existingUsernameSet = new Set(existingUsers.map((u) => u.username));

    const seenEmails = new Set<string>();
    const seenUsernames = new Set<string>();

    const validUsers: Array<{
      firstName: string;
      lastName: string;
      email: string;
      username: string;
      password: string;
    }> = [];
    const usersWithPlainPassword: Array<{
      firstName: string;
      email: string;
      username: string;
      password: string;
    }> = [];
    const skipped: Array<{ user: any; reason: string }> = [];

    for (const user of rawUsers) {
      const { firstName, lastName, email, username, password } = user;

      // ❌ validasi basic
      if (!firstName || !email || !username || !password) {
        skipped.push({ user, reason: 'Invalid data' });
        continue;
      }

      // ❌ duplicate dalam file
      if (seenEmails.has(email) || seenUsernames.has(username)) {
        skipped.push({ user, reason: 'Duplicate in file' });
        continue;
      }

      // ❌ duplicate di database
      if (existingEmailSet.has(email) || existingUsernameSet.has(username)) {
        skipped.push({ user, reason: 'Already exists in DB' });
        continue;
      }

      seenEmails.add(email);
      seenUsernames.add(username);

      // 🔐 hash password
      const hashedPassword = await bcrypt.hash(password, bcryptedSaltRounds);

      validUsers.push({
        firstName,
        lastName,
        email,
        username,
        password: hashedPassword,
      });
      usersWithPlainPassword.push({
        firstName,
        email,
        username,
        password,
      });
    }

    if (validUsers.length > 0) {
      await this.usersService.createMany(validUsers);

      // Async email sending background task
      setImmediate(async () => {
        try {
          const CHUNK_SIZE = 10;
          for (let i = 0; i < usersWithPlainPassword.length; i += CHUNK_SIZE) {
            const chunk = usersWithPlainPassword.slice(i, i + CHUNK_SIZE);
            const promises = chunk.map((u) =>
              this.mailService.sendBulkRegistrationEmail({
                firstName: u.firstName,
                email: u.email,
                username: u.username,
                plainPassword: u.password,
              }),
            );
            await Promise.allSettled(promises);
            // Delay 1 second to avoid SMTP block
            if (i + CHUNK_SIZE < usersWithPlainPassword.length) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
          this.logger.log(
            'All bulk registration emails sent successfully.',
            'AuthService',
          );
        } catch (err: any) {
          this.logger.error(
            `Error sending chunked emails: ${err.message}`,
            err.stack,
            'AuthService',
          );
        }
      });
    }

    await this.auditLogService.log({
      userId: createdBy,
      action: 'BULK_REGISTER',
      entity: 'User',
      ipAddress,
      userAgent,
      status: 'SUCCESS',
      metadata: {
        total: rawUsers.length,
        success: validUsers.length,
        failed: skipped.length,
      },
    });

    // Ambil admin name untuk laporan (nullable, tapi kita log jika ketemu)
    const admin = createdBy
      ? await this.usersService.findById(createdBy)
      : null;
    const adminName = admin
      ? admin.displayName || admin.username
      : 'Administrator';

    // Kirim laporan ke admin secara asinkron
    setImmediate(() => {
      this.mailService
        .sendAdminBulkReportEmail({
          adminName,
          totalProcessed: rawUsers.length,
          totalSuccess: validUsers.length,
          totalFailed: skipped.length,
          skippedDetails: skipped.map((s) => ({
            email: s.user?.email,
            username: s.user?.username,
            reason: s.reason,
          })),
        })
        .catch((err) => {
          this.logger.error(
            `Error sending admin report email: ${err.message}`,
            err.stack,
            'AuthService',
          );
        });
    });

    return {
      total: rawUsers.length,
      success: validUsers.length,
      failed: skipped.length,
      skipped,
    };
  }

  async verifyUser(id: string, req: any) {
    const user = await this.usersService.findById(id);
    if (!user) throw new BadRequestException('User not found');

    req.session.userId = user.id;
    req.session.userRole = user.role;

    return user;
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (!user.password) {
      throw new UnauthorizedException(
        `This account uses ${user.authProvider} login.`,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    if (!user.isVerified)
      throw new UnauthorizedException('Account is not verified');

    if (!user.isActive)
      throw new UnauthorizedException('Account is deactivated');

    return user;
  }

  // ─── Google SSO: Cari atau Buat User ─────────────────────────────────────

  async findOrCreateGoogleUser(googleUser: GoogleUserDto) {
    // 1. Cari berdasarkan googleId terlebih dahulu
    let user = await this.usersService.findByGoogleId(googleUser.googleId);

    if (user) {
      // Update foto/nama jika berubah
      user = await this.usersService.updateField(user.id, {
        avatarUrl: googleUser.avatarUrl,
        displayName: googleUser.displayName,
      });
      this.logger.log(
        `Google SSO: existing user login - ${user.email}`,
        'AuthService',
      );
      return user;
    }

    // 2. Cek apakah email sudah terdaftar via LOCAL
    const existingByEmail = await this.usersService.findByEmail(
      googleUser.email,
    );
    if (existingByEmail) {
      if (existingByEmail.authProvider === AuthProvider.LOCAL) {
        // Akun lokal sudah ada — LINK Google ke akun yang ada
        user = await this.usersService.updateField(existingByEmail.id, {
          googleId: googleUser.googleId,
          avatarUrl: googleUser.avatarUrl ?? existingByEmail.avatarUrl,
          displayName: googleUser.displayName,
          isEmailVerified: true,
        });
        this.logger.log(
          `Google SSO: linked to existing LOCAL account - ${user.email}`,
          'AuthService',
        );

        await this.auditLogService.log({
          userId: user.id,
          action: 'GOOGLE_ACCOUNT_LINKED',
          entity: 'User',
          entityId: user.id,
          metadata: { googleId: googleUser.googleId },
          status: 'SUCCESS',
        });
        this.notificationsService.notifyNewUserGoogle({
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: googleUser.displayName,
          isNew: false,
        });
        return user;
      }
      return existingByEmail;
    }

    // 3. Buat user baru dari Google
    const username = await this.generateUniqueUsername(
      googleUser.email,
      googleUser.displayName,
    );

    user = await this.usersService.create({
      email: googleUser.email,
      username,
      password: '', // tidak ada password untuk SSO user
      authProvider: AuthProvider.GOOGLE,
      googleId: googleUser.googleId,
      googleEmail: googleUser.email,
      avatarUrl: googleUser.avatarUrl ?? undefined,
      displayName: googleUser.displayName,
      isEmailVerified: googleUser.isEmailVerified,
      firstName: '',
    });

    await this.auditLogService.log({
      userId: user.id,
      action: 'USER_REGISTERED_GOOGLE',
      entity: 'User',
      entityId: user.id,
      newValue: { email: googleUser.email, provider: 'GOOGLE' },
      status: 'SUCCESS',
    });

    this.notificationsService.notifyNewUserGoogle({
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: googleUser.displayName,
      isNew: true,
    });

    this.mailService.notifyAdminsNewUser({
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: googleUser.displayName,
      provider: 'GOOGLE',
    });

    this.logger.log(
      `Google SSO: new user created - ${user.email}`,
      'AuthService',
    );
    return user;
  }

  // ─── SSO Login — issue JWT setelah OAuth callback ────────────────────────

  async handleSSOLogin(user: any, req: any) {
    const tokens = this.generateTokens(user);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    req.session.userId = user.id;
    req.session.userRole = user.role;

    await this.auditLogService.log({
      userId: user.id,
      action: 'USER_LOGGED_IN_GOOGLE',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
      status: 'SUCCESS',
    });

    this.logger.log(`Google SSO login: ${user.email}`, 'AuthService');
    const { password: _, refreshToken: __, ...safeUser } = user;
    return { user: safeUser, ...tokens };
  }

  async login(user: any, req: any) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    // If 2FA is enabled, issue a short-lived "pending" token
    if (user.twoFactorEnabled) {
      const pendingToken = this.jwtService.sign(
        { sub: user.id, pending2fa: true },
        { expiresIn: '5m' },
      );

      await this.auditLogService.log({
        userId: user.id,
        action: 'LOGIN_PENDING_2FA',
        entity: 'User',
        entityId: user.id,
        ipAddress,
        userAgent,
        status: 'PENDING',
      });

      return {
        requires2FA: true,
        pendingToken,
        message: 'Please provide your 2FA code to complete login',
      };
    }

    // No 2FA — full login
    return this.completeLogin(user, req);
  }

  async loginWith2FA(pendingToken: string, otpCode: string, req: any) {
    let payload: any;
    try {
      payload = this.jwtService.verify(pendingToken);
    } catch {
      throw new UnauthorizedException('Pending token is invalid or expired');
    }

    if (!payload.pending2fa) {
      throw new UnauthorizedException('Invalid pending token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }

    // Verify OTP
    const speakeasy = require('speakeasy');
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: otpCode,
      window: 1,
    });

    if (!isValid) {
      // Check backup codes
      const isBackup = await this.verifyBackupCode(
        user.id,
        otpCode,
        user.twoFactorBackupCodes,
      );
      if (!isBackup) {
        await this.auditLogService.log({
          userId: user.id,
          action: 'LOGIN_2FA_FAILED',
          entity: 'User',
          entityId: user.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          status: 'FAILURE',
        });
        throw new ForbiddenException('Invalid 2FA code');
      }
    }

    return this.completeLogin(user, req);
  }

  private async completeLogin(user: any, req: any) {
    const tokens = this.generateTokens(user);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    req.session.userId = user.id;
    req.session.userRole = user.role;

    await this.auditLogService.log({
      userId: user.id,
      action: 'USER_LOGGED_IN',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS',
    });

    this.logger.log(`User logged in: ${user.email}`, 'AuthService');
    const {
      password: _,
      refreshToken: __,
      twoFactorSecret: ___,
      createdAt: ____,
      updatedAt: _____,
      ...safe
    } = user;
    return { requires2FA: false, user: safe, ...tokens };
  }

  async logout(userId: string, req: any) {
    const accessToken =
      req.cookies?.['access_token'] ||
      req.headers.authorization?.replace('Bearer ', '');

    if (accessToken) {
      // Blacklist the access token for 1 hour (or actual remaining TTL)
      await this.redisService.set(`blacklist:${accessToken}`, 'true', 3600);
    }

    // Also remove refresh token from redis
    await this.redisService.del(`rt:${userId}`);

    await this.usersService.updateRefreshToken(userId, null);
    req.session.destroy(() => {});

    await this.auditLogService.log({
      userId,
      action: 'USER_LOGGED_OUT',
      entity: 'User',
      entityId: userId,
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
      status: 'SUCCESS',
    });

    this.logger.log(`User logged out: ${userId}`, 'AuthService');
    return { message: 'Logged out successfully' };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    if (!userId || !refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    // Check Redis first
    const cachedRT = await this.redisService.get(`rt:${userId}`);
    if (cachedRT) {
      const rtMatches = await bcrypt.compare(refreshToken, cachedRT);
      if (!rtMatches) throw new UnauthorizedException('Access denied');
    } else {
      // Fallback to DB
      const user = await this.usersService.findById(userId);
      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Access denied');
      }
      const rtMatches = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!rtMatches) throw new UnauthorizedException('Access denied');
    }

    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Access denied');

    const tokens = this.generateTokens(user);
    await this.updateRefreshTokenState(user.id, tokens.refreshToken);
    return tokens;
  }

  private async updateRefreshTokenState(userId: string, refreshToken: string) {
    const saltRounds = 10;
    const hashedRT = await bcrypt.hash(refreshToken, saltRounds);

    // Update DB
    await this.usersService.updateRefreshToken(userId, hashedRT);

    // Update Redis (30 days TTL)
    await this.redisService.set(`rt:${userId}`, hashedRT, 30 * 24 * 60 * 60);
  }

  private generateTokens(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<any>('JWT_REFRESH_EXPIRES_IN', '30d'),
      }),
    };
  }

  private async generateUniqueUsername(
    email: string,
    displayName: string,
  ): Promise<string> {
    // Coba dari nama, fallback ke bagian email
    const base = (displayName || email.split('@')[0] || 'user')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15);

    let username = base || 'user';
    let counter = 0;

    while (await this.usersService.findByUsername(username)) {
      counter++;
      username = `${base}${counter}`;
    }
    return username;
  }

  private async verifyBackupCode(
    userId: string,
    inputCode: string,
    hashedCodes: string[],
  ): Promise<boolean> {
    for (let i = 0; i < hashedCodes.length; i++) {
      const match = await bcrypt.compare(inputCode, hashedCodes[i]);
      if (match) {
        const updatedCodes = hashedCodes.filter((_, idx) => idx !== i);
        await this.usersService.updateField(userId, {
          twoFactorBackupCodes: updatedCodes,
        });
        return true;
      }
    }
    return false;
  }

  async verifyUserByAdmin(userIdToVerify: string, adminRequester: any) {
    if (adminRequester.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can perform this action.');
    }

    const userToVerify = await this.usersService.findById(userIdToVerify);
    if (!userToVerify) {
      throw new NotFoundException('User to verify not found.');
    }

    if (userToVerify.isActive) {
      throw new BadRequestException('User is already active.');
    }

    if (userToVerify.isVerified) {
      throw new BadRequestException('User is already verified.');
    }

    const activatedUser = await this.usersService.activate(userIdToVerify);

    this.logger.log(
      `User ${activatedUser.email} verified by admin ${adminRequester.email}`,
      'AuthService',
    );

    const { password: _, refreshToken: __, ...result } = activatedUser;
    return result;
  }
}
