import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import speakeasy from 'speakeasy';
import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, cleanDatabase } from '../setup';

describe('OTP / 2FA (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let redis: any;

  const testUser = {
    firstName: 'OTP',
    lastName: 'User',
    email: 'otp-suite-user@example.com',
    username: 'otpuser',
    password: 'Test@1234',
  };

  beforeAll(async () => {
    ({ app, prisma, redis } = await createTestApp());
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    await redis.flushall();

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser);

    if (res.status !== 201) {
      console.error('OTP Suite Register Fail:', res.status, res.body);
    }
    expect(res.status).toBe(201);

    accessToken = res.body.data.accessToken;
    userId = res.body.data.user.id;

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true, isVerified: true },
    });
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────────────
  // STATUS
  // ─────────────────────────────────────────────────────────────────────
  describe('GET /api/v1/otp/status', () => {
    it('should return 2FA disabled by default', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/otp/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.twoFactorEnabled).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // SETUP (Generate QR / Secret)
  // ─────────────────────────────────────────────────────────────────────
  describe('POST /api/v1/otp/setup', () => {
    it('should return QR code and secret', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/otp/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body.data.secret).toBeDefined();
      expect(res.body.data.qrCode).toMatch(/^data:image\/png;base64,/);
      expect(res.body.data.manualEntryKey).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer()).post('/api/v1/otp/setup').expect(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // ENABLE 2FA
  // ─────────────────────────────────────────────────────────────────────
  describe('POST /api/v1/otp/enable', () => {
    let secret: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/otp/setup')
        .set('Authorization', `Bearer ${accessToken}`);
      secret = res.body.data.secret;
    });

    it('should enable 2FA with valid token and return backup codes', async () => {
      const token = speakeasy.totp({ secret, encoding: 'base32' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/otp/enable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token })
        .expect(200);

      expect(res.body.data.backupCodes).toHaveLength(8);
      expect(res.body.data.warning).toBeDefined();

      // Verify 2FA is now enabled
      const statusRes = await request(app.getHttpServer())
        .get('/api/v1/otp/status')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(statusRes.body.data.twoFactorEnabled).toBe(true);
    });

    it('should enforce rate limiting after 5 rapid enable attempts', async () => {
      // Perform 5 successful attempts (they will be rejected due to missing setup, but we focus on rate limit)
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/otp/enable')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ token: '000000' })
          .expect(400);
      }
      // 6th attempt should be rate limited
      await request(app.getHttpServer())
        .post('/api/v1/otp/enable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: '000000' })
        .expect(429);
    });

    it('should reject invalid OTP token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/otp/enable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: '000000' })
        .expect(400);
    });

    it('should reject if setup was not done first', async () => {
      await cleanDatabase(prisma);
      const freshRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...testUser, email: 'fresh2@test.com', username: 'fresh2' });

      await prisma.user.update({
        where: { id: freshRes.body.data.user.id },
        data: { isActive: true, isVerified: true },
      });

      await request(app.getHttpServer())
        .post('/api/v1/otp/enable')
        .set('Authorization', `Bearer ${freshRes.body.data.accessToken}`)
        .send({ token: '123456' })
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // LOGIN WITH 2FA
  // ─────────────────────────────────────────────────────────────────────
  describe('2FA Login Flow', () => {
    let secret: string;
    let backupCodes: string[];

    beforeEach(async () => {
      // Setup and enable 2FA
      const setupRes = await request(app.getHttpServer())
        .post('/api/v1/otp/setup')
        .set('Authorization', `Bearer ${accessToken}`);
      
      if (setupRes.status !== 201 && setupRes.status !== 200) {
        console.error('2FA Setup Fail:', setupRes.status, setupRes.body);
      }
      expect(setupRes.status).toBe(201);
      secret = setupRes.body.data.secret;

      const token = speakeasy.totp({ secret, encoding: 'base32' });
      const enableRes = await request(app.getHttpServer())
        .post('/api/v1/otp/enable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token });
      
      if (enableRes.status !== 200) {
        console.error('2FA Enable Fail:', enableRes.status, enableRes.body);
      }
      expect(enableRes.status).toBe(200);
      backupCodes = enableRes.body.data.backupCodes;
    });

    it('should require 2FA on login and return pendingToken', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(res.body.data.requires2FA).toBe(true);
      expect(res.body.data.pendingToken).toBeDefined();
      expect(res.body.data.accessToken).toBeUndefined();
    });

    it('should complete login with valid OTP code', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      const pendingToken = loginRes.body.data.pendingToken;
      const otpCode = speakeasy.totp({ secret, encoding: 'base32' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login/2fa')
        .send({ pendingToken, otpCode })
        .expect(200);

      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.requires2FA).toBe(false);
    });

    it('should reject wrong OTP code on /login/2fa', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      const pendingToken = loginRes.body.data.pendingToken;

      await request(app.getHttpServer())
        .post('/api/v1/auth/login/2fa')
        .send({ pendingToken, otpCode: '000000' })
        .expect(403);
    });

    it('should complete login using a backup code', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      const pendingToken = loginRes.body.data.pendingToken;

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login/2fa')
        .send({ pendingToken, otpCode: backupCodes[0] })
        .expect(200);

      expect(res.body.data.accessToken).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // DISABLE 2FA
  // ─────────────────────────────────────────────────────────────────────
  describe('DELETE /api/v1/otp/disable', () => {
    let secret: string;

    beforeEach(async () => {
      const setupRes = await request(app.getHttpServer())
        .post('/api/v1/otp/setup')
        .set('Authorization', `Bearer ${accessToken}`);
      secret = setupRes.body.data.secret;

      const token = speakeasy.totp({ secret, encoding: 'base32' });
      await request(app.getHttpServer())
        .post('/api/v1/otp/enable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token });
    });

    it('should disable 2FA with valid OTP', async () => {
      const token = speakeasy.totp({ secret, encoding: 'base32' });

      const res = await request(app.getHttpServer())
        .delete('/api/v1/otp/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token })
        .expect(200);

      expect(res.body.message).toBeDefined();

      const statusRes = await request(app.getHttpServer())
        .get('/api/v1/otp/status')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(statusRes.body.data.twoFactorEnabled).toBe(false);
    });

    it('should reject invalid token when disabling', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/otp/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: '000000' })
        .expect(400);
    });
  });
});
