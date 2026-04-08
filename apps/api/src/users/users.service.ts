import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../common/redis/redis.service';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async create(data: {
    firstName: string;
    lastName?: string;
    email: string;
    username: string;
    password: string;
    authProvider?: any;
    googleId?: string;
    googleEmail?: string;
    avatarUrl?: string;
    displayName?: string;
    isEmailVerified?: boolean;
    role?: any;
  }) {
    const user = await this.prisma.user.create({ data });
    await this.redisService.delByPattern('users:list:*');
    return user;
  }

  async createMany(
    data: Array<{
      firstName: string;
      lastName?: string;
      email: string;
      username: string;
      password: string;
      createdBy?: string;
    }>,
  ) {
    const result = await this.prisma.user.createMany({ data });
    await this.redisService.delByPattern('users:list:*');
    return result;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findByEmailOrUsername(email: string, username: string) {
    return this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
  }

  async findUsernameOrEmailExisting(usernames: string[], emails: string[]) {
    return this.prisma.user.findMany({
      where: {
        OR: [{ email: { in: emails } }, { username: { in: usernames } }],
      },
      select: { email: true, username: true },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async findAll(page = 1, limit = 10) {
    const cacheKey = `users:list:page:${page}:limit:${limit}`;
    const cachedData = await this.redisService.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);
    const result = {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    // Cache for 5 minutes
    await this.redisService.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }

  async findUserByStatusVerification(
    adminRequester: any,
    isVerified: boolean,
    isActive: boolean,
    page = 1,
    limit = 10,
  ) {
    const skip = (page - 1) * limit;
    if (adminRequester.role !== 'ADMIN' && adminRequester.role !== 'EXAMINER') {
      throw new ForbiddenException('Forbidden access');
    }

    const where = { isVerified, isActive };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          isActive: true,
          isVerified: true,
          isEmailVerified: true,
          authProvider: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    if (!users) {
      throw new NotFoundException('Users not found');
    }

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateRefreshToken(userId: string, refreshToken: string | null) {
    const hashedToken = refreshToken
      ? await bcrypt.hash(
          refreshToken,
          Number(this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12)),
        )
      : null;
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedToken },
    });
  }

  async updateProfile(
    userId: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      username: string;
      email: string;
      password: string;
    }>,
  ) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const result = await this.prisma.user.update({
      where: { id: userId },
      data: data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        isVerified: true,
        isEmailVerified: true,
        authProvider: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    await this.redisService.delByPattern('users:list:*');
    return result;
  }

  async deactivate(userId: string) {
    const result = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    await this.redisService.delByPattern('users:list:*');
    return result;
  }

  async activate(userId: string) {
    const result = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true, isVerified: true },
    });
    await this.redisService.delByPattern('users:list:*');
    return result;
  }

  async updateField(userId: string, data: Record<string, any>) {
    const result = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    await this.redisService.delByPattern('users:list:*');
    return result;
  }

  async findAllByRole(role: any) {
    return this.prisma.user.findMany({
      where: { role, isActive: true },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        isEmailVerified: true,
      },
    });
  }
}
