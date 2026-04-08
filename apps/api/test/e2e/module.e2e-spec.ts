import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/database/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';
import { createTestApp, cleanDatabase } from '../setup';
import * as path from 'path';
import * as fs from 'fs';

describe('Materi (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let adminToken: string;

  const adminUser = {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin-module@example.com',
    username: 'adminmodule',
    password: 'Password@123',
  };

  const testModule = {
    title: 'Test Module',
    description: 'This is a test module',
  };

  const testFilePath = path.join(__dirname, 'test-file.pdf');

  beforeAll(async () => {
    ({ app, prisma, redis } = await createTestApp());
    // Create a dummy PDF file for testing
    fs.writeFileSync(testFilePath, 'dummy pdf content');
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    await redis.flushall();

    // Register and promote admin
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(adminUser);
    adminToken = adminRes.body.data.accessToken;
    await prisma.user.update({
      where: { id: adminRes.body.data.user.id },
      data: { role: 'ADMIN', isActive: true, isVerified: true },
    });
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await redis.flushall();
    await app.close();
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  // MAT-01: Create Module
  describe('POST /api/v1/module', () => {
    it('should create a module with file upload', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/module')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('files', testFilePath)
        .field('title', testModule.title)
        .field('description', testModule.description)
        .expect(200);

      expect(res.body.title).toBe(testModule.title);
      expect(res.body.files).toHaveLength(1);
    });
  });

  // MAT-03 & MAT-04: Details & Caching
  describe('GET /api/v1/module/:id', () => {
    let moduleId: string;

    beforeEach(async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/module')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('files', testFilePath)
        .field('title', testModule.title)
        .field('description', testModule.description);
      moduleId = createRes.body.id;
    });

    it('should return module details and cache them', async () => {
      // 1. First fetch
      const res = await request(app.getHttpServer())
        .get(`/api/v1/module/${moduleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(moduleId);

      // 2. Refresh tokens or check redis directly (MAT-04)
      const cacheKey = `module:detail:${moduleId}`;
      const cache = await redis.get(cacheKey);
      expect(cache).toBeDefined();
    });

    it('should invalidate cache on update', async () => {
      // 1. Ensure cached
      await request(app.getHttpServer())
        .get(`/api/v1/module/${moduleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // 2. Update module
      await request(app.getHttpServer())
        .patch(`/api/v1/module/${moduleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Title', description: 'Updated Description' })
        .expect(200);

      // 3. Verify cache is gone (MAT-04 Invalidation)
      const cache = await redis.get(`module:detail:${moduleId}`);
      expect(cache).toBeNull();
    });
  });

  // MAT-05 & MAT-06: Soft Delete
  describe('DELETE /api/v1/module/:id', () => {
    let moduleId: string;

    beforeEach(async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/module')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('files', testFilePath)
        .field('title', testModule.title)
        .field('description', testModule.description);
      moduleId = createRes.body.id;
    });

    it('should soft delete the module', async () => {
      // 1. Delete
      await request(app.getHttpServer())
        .delete(`/api/v1/module/${moduleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 2. Verify not found in active list
      const res = await request(app.getHttpServer())
        .get('/api/v1/module')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const found = res.body.data.module.find((m: any) => m.id === moduleId);
      expect(found).toBeUndefined();

      // 3. Verify database still contains it with deletedAt
      const dbModule = await prisma.module.findUnique({
        where: { id: moduleId },
      });
      expect(dbModule).toBeDefined();
      expect(dbModule?.deletedAt).not.toBeNull();
    });
  });
});
