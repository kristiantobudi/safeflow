import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RedisService } from '../common/redis/redis.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

const mockUsersService = {
  updateRefreshToken: jest.fn(),
  findById: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'JWT_REFRESH_SECRET') return 'refresh_secret';
    return null;
  }),
};

const mockAuditLogService = {
  log: jest.fn(),
};

const mockRedisService = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logout', () => {
    it('should blacklist the access token and delete refresh token from redis', async () => {
      const userId = 'user-123';
      const accessToken = 'access-token-123';
      const mockReq = {
        cookies: { access_token: accessToken },
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
        session: { destroy: jest.fn((cb) => cb()) },
      };

      await service.logout(userId, mockReq);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `blacklist:${accessToken}`,
        'true',
        3600,
      );
      expect(mockRedisService.del).toHaveBeenCalledWith(`rt:${userId}`);
      expect(mockUsersService.updateRefreshToken).toHaveBeenCalledWith(
        userId,
        null,
      );
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_LOGGED_OUT' }),
      );
    });
  });

  describe('refreshTokens', () => {
    it('should use cached refresh token from redis if available', async () => {
      const userId = 'user-123';
      const refreshToken = 'rt-123';
      const hashedRT = 'hashed-rt-123';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockRedisService.get.mockResolvedValue(hashedRT);
      mockUsersService.findById.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        role: 'USER',
      });
      mockJwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refreshTokens(userId, refreshToken);

      expect(mockRedisService.get).toHaveBeenCalledWith(`rt:${userId}`);
      expect(result).toBeDefined();
    });

    it('should throw UnauthorizedException if tokens do not match', async () => {
      const userId = 'user-123';
      const refreshToken = 'wrong-rt';
      mockRedisService.get.mockResolvedValue('hashed-rt-123');
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshTokens(userId, refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
