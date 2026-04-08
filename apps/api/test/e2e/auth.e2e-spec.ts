import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/database/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';
import { createTestApp, cleanDatabase } from '../setup';

describe('Authentication (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  const testUser = {
    firstName: 'Auth',
    lastName: 'Test',
    email: 'auth-test@example.com',
    username: 'authtest',
    password: 'Password@123',
  };

  beforeAll(async () => {
    ({ app, prisma, redis } = await createTestApp());
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    await redis.flushall();
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await redis.flushall();
    await app.close();
  });

  // AUTH-01: Register valid
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser);

      if (res.status !== 201) {
        console.error('❌ REGISTRATION FAILED:', res.status, res.body);
      } else {
        // Activate user for subsequent tests
        await prisma.user.update({
          where: { id: res.body.data.user.id },
          data: { isActive: true, isVerified: true },
        });
      }

      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.accessToken).toBeDefined();
    });

    // AUTH-02: Register duplicate
    it('should return 409 when registering with existing email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);

      expect(res.body.message).toBeDefined();
    });
  });

  // AUTH-03 & AUTH-04: Login
  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser);

      await prisma.user.update({
        where: { id: res.body.data.user.id },
        data: { isActive: true, isVerified: true },
      });
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should return 401 with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword@123' })
        .expect(401);
    });
  });

  // AUTH-05 & AUTH-06: Logout & Blacklist
  describe('POST /api/v1/auth/logout', () => {
    let accessToken: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser);
      accessToken = res.body.data.accessToken;

      await prisma.user.update({
        where: { id: res.body.data.user.id },
        data: { isActive: true, isVerified: true },
      });
    });

    it('should logout and blacklist the token', async () => {
      // 1. Perform logout
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 2. Verify blacklisted token cannot be used anymore (AUTH-06)
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });

  // AUTH-07: Refresh Token
  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;
    let userId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser);
      refreshToken = res.body.data.refreshToken;
      userId = res.body.data.user.id;

      await prisma.user.update({
        where: { id: userId },
        data: { isActive: true, isVerified: true },
      });
    });

    it('should refresh access token using a valid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ userId, refreshToken })
        .expect(200);

      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });
  });
});
