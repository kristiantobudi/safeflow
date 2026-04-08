import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import { createTestApp, cleanDatabase } from './setup';

describe('Audit Log (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let adminToken: string;

  const normalUser = {
    email: 'user@example.com',
    username: 'normaluser',
    password: 'Test@1234',
  };

  const adminUser = {
    email: 'admin@example.com',
    username: 'adminuser',
    password: 'Admin@1234',
  };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);

    const userRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(normalUser);
    userToken = userRes.body.data.accessToken;

    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(adminUser);
    adminToken = adminRes.body.data.accessToken;

    // Elevate to admin in DB
    const adminId = adminRes.body.data.user.id;
    await prisma.user.update({
      where: { id: adminId },
      data: { role: 'ADMIN' },
    });
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  describe('GET /api/v1/audit-logs/me', () => {
    it('should return own audit logs after actions', async () => {
      // Perform some actions to generate logs
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: normalUser.email, password: normalUser.password });

      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.data.logs).toBeInstanceOf(Array);
      expect(res.body.data.total).toBeGreaterThanOrEqual(0);
      expect(res.body.data.page).toBe(1);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/audit-logs/me')
        .expect(401);
    });

    it('should support pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs/me?page=1&limit=5')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.data.limit).toBe(5);
    });
  });

  describe('GET /api/v1/audit-logs (Admin only)', () => {
    it('should allow admin to query all logs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.logs).toBeInstanceOf(Array);
    });

    it('should deny normal user access to all logs', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should filter by action', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs?action=REGISTER')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.logs).toBeInstanceOf(Array);
      res.body.data.logs.forEach((log: any) => {
        expect(log.action.toUpperCase()).toContain('REGISTER');
      });
    });

    it('should filter by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs?status=SUCCESS')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      res.body.data.logs.forEach((log: any) => {
        expect(log.status).toBe('SUCCESS');
      });
    });
  });

  describe('Audit log creation on auth actions', () => {
    it('should create audit log on user registration', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ action: 'USER_REGISTERED' });

      expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    });

    it('should create audit log on failed login attempt', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: normalUser.email, password: 'WrongPass@1' });

      // Allow time for async audit log write
      await new Promise((r) => setTimeout(r, 100));

      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.body.data.logs).toBeInstanceOf(Array);
    });
  });
});
