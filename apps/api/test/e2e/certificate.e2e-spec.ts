import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/database/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';
import { createTestApp, cleanDatabase } from '../setup';

describe('Certificate (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let userToken: string;
  let userId: string;
  let attemptId: string;

  const testUser = {
    firstName: 'Cert',
    lastName: 'User',
    email: 'cert-user@example.com',
    username: 'certuser',
    password: 'Password@123',
  };

  beforeAll(async () => {
    ({ app, prisma, redis } = await createTestApp());
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    await redis.flushall();

    // 1. Setup User
    const userRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser);
    userToken = userRes.body.data.accessToken;
    userId = userRes.body.data.user.id;

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true, isVerified: true },
    });

    // 2. Create Dummy Passed Exam Attempt
    const module = await prisma.module.create({
      data: { title: 'Cert Module', createdBy: userId },
    });
    const exam = await prisma.exam.create({
      data: { moduleId: module.id, duration: 60, createdBy: userId },
    });
    const attempt = await prisma.examAttempt.create({
      data: {
        userId,
        examId: exam.id,
        status: 'FINISHED',
        score: 85,
        isPassed: true,
        passedAt: new Date(),
        questionIds: [],
        startTime: new Date(),
        endTime: new Date(),
      },
    });
    attemptId = attempt.id;
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await redis.flushall();
    await app.close();
  });

  // CERT-01: Generation
  describe('POST /api/v1/certificate/:attemptId', () => {
    it('should generate certificate for passed exam', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/certificate/${attemptId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.certNumber).toBeDefined();
      expect(res.body.attemptId).toBe(attemptId);
    });

    it('should return 400 if certificate already exists', async () => {
      // First generation
      await request(app.getHttpServer())
        .post(`/api/v1/certificate/${attemptId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Second generation
      await request(app.getHttpServer())
        .post(`/api/v1/certificate/${attemptId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });
  });

  // CERT-03: Caching
  describe('Caching', () => {
    it('should cache certificate on generation', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/certificate/${attemptId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const cache = await redis.get(`cert:${attemptId}`);
      expect(cache).toBeDefined();
      expect(JSON.parse(cache!).attemptId).toBe(attemptId);
    });
  });
});
