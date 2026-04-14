import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role } from '@repo/database';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../common/redis/redis.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { MinioService } from 'src/common/minio/minio.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly minioService: MinioService,
  ) {}

  async findVendors() {
    return this.prisma.vendor.findMany({
      where: { vendorStatus: 'ACTIVE' },
      select: { id: true, vendorName: true },
    });
  }

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
    phone?: string;
    address?: string;
    vendorId?: string;
    isEmailVerified?: boolean;
    role?: any;
  }) {
    const user = await this.prisma.user.create({ data });

    await this.auditLogService.log({
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user.id,
      newValue: user,
    });

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
      phone?: string;
      address?: string;
      vendorId?: string;
      role?: Role;
      isVerified?: boolean;
      isEmailVerified?: boolean;
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

  async findById(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async findAll(page = 1, limit = 10, search?: string) {
    const cacheKey = `users:list:page:${page}:limit:${limit}:search:${search || ''}`;
    const cachedData = await this.redisService.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { vendor: { vendorName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [users, total, stats] = await Promise.all([
      this.prisma.user.findMany({
        where,
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
          vendorId: true,
          vendor: {
            select: {
              vendorName: true,
            },
          },
          avatarUrl: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
      this.prisma.user.aggregate({
        _count: {
          id: true,
        },
        where: { authProvider: 'LOCAL' }, // Simplified global stats
      }).then(async () => {
        // We need more specific counts, better to use Promise.all for stats
        return {
          total: await this.prisma.user.count(),
          verified: await this.prisma.user.count({ where: { isVerified: true } }),
          unverified: await this.prisma.user.count({ where: { isVerified: false } }),
          active: await this.prisma.user.count({ where: { isActive: true } }),
        };
      }),
    ]);

    // Resolve avatar URLs and flatten vendor information
    const usersWithUrls = await Promise.all(
      users.map(async (user) => {
        const vendorName = (user as any).vendor?.vendorName || null;
        const processedUser = { ...user, vendorName };
        delete (processedUser as any).vendor;

        if (user.avatarUrl) {
          try {
            const fullUrl = await this.minioService.getFileUrl(user.avatarUrl);
            return { ...processedUser, avatarUrl: fullUrl };
          } catch (error) {
            console.error(
              `Error resolving avatar URL for user ${user.id}:`,
              error,
            );
            return processedUser;
          }
        }
        return processedUser;
      }),
    );

    const result = {
      users: usersWithUrls,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats,
    };

    await this.redisService.set(cacheKey, result, 300); // Cache for 5 minutes
    return result;
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: id,
      },
      include: {
        vendor: {
          select: {
            vendorName: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.avatarUrl) {
      try {
        const fullUrl = await this.minioService.getFileUrl(user.avatarUrl);
        return { ...user, avatarUrl: fullUrl };
      } catch (error) {
        console.error(`Error resolving avatar URL for user ${user.id}:`, error);
        return user;
      }
    }

    return user;
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
      avatarUrl: string;
    }>,
    file?: Express.Multer.File,
  ) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    let avatarKey = data.avatarUrl || user.avatarUrl;

    if (file) {
      if (user.avatarUrl) {
        await this.minioService.deleteFile(user.avatarUrl);
      }
      avatarKey = await this.minioService.uploadFile(file, 'users');
    }

    const result = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        avatarUrl: avatarKey,
      },
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

    result.avatarUrl = await this.minioService.getFileUrl(result.avatarUrl);

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

  async deactive(userId: string) {
    const result = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false, isVerified: false },
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

  async updateUser(
    userId: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      username: string;
      email: string;
      password: string;
      phone: string;
      address: string;
      role: Role;
      vendorId: string;
      isActive: boolean;
      isVerified: boolean;
    }>,
    file?: Express.Multer.File,
  ) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const updateData: any = {};

    // Transform and map fields to ensure correct types from FormData
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.email) updateData.email = data.email;
    if (data.username) updateData.username = data.username;
    if (data.role) updateData.role = data.role;

    // Handle optional strings and empty values (convert "" to null)
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.address !== undefined) updateData.address = data.address || null;
    if (data.vendorId !== undefined) {
      updateData.vendorId =
        data.vendorId === '' || data.vendorId === 'null' ? null : data.vendorId;
    }

    // Transform Boolean strings
    if (data.isActive !== undefined) {
      updateData.isActive = String(data.isActive) === 'true';
    }
    if (data.isVerified !== undefined) {
      updateData.isVerified = String(data.isVerified) === 'true';
    }

    // Handle password hashing if provided
    if (data.password && data.password.trim() !== '') {
      updateData.password = await bcrypt.hash(
        data.password,
        Number(this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12)),
      );
    }

    let avatarKey = user.avatarUrl;

    if (file) {
      if (user.avatarUrl) {
        await this.minioService.deleteFile(user.avatarUrl);
      }
      avatarKey = await this.minioService.uploadFile(file, 'users');
    }

    const result = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...updateData,
        avatarUrl: avatarKey,
      },
      include: {
        vendor: {
          select: {
            vendorName: true,
          },
        },
      },
    });

    if (result.avatarUrl) {
      result.avatarUrl = await this.minioService.getFileUrl(result.avatarUrl);
    }

    await this.redisService.delByPattern('users:list:*');
    await this.redisService.del(`user:${userId}`);
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
