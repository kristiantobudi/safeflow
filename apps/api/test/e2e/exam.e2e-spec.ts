import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/database/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';
import { createTestApp, cleanDatabase } from '../setup';
import { io, Socket } from 'socket.io-client';

describe('Exam (E2E + WebSocket)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let adminToken: string;
  let userToken: string;
  let userId: string;
  let examId: string;
  let port: number;

  const adminUser = {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin-exam-suite@example.com',
    username: 'adminexam',
    password: 'Password@123',
  };

  const participantUser = {
    firstName: 'Partisipan',
    lastName: 'User',
    email: 'partisipan-suite@example.com',
    username: 'partisipan',
    password: 'Password@123',
  };

  beforeAll(async () => {
    ({ app, prisma, redis } = await createTestApp());
    const address = app.getHttpServer().address();
    port = typeof address === 'string' ? 0 : address?.port || 0;
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    await redis.flushall();

    // 1. Setup Admin & User
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(adminUser);
    adminToken = adminRes.body.data.accessToken;
    await prisma.user.update({
      where: { id: adminRes.body.data.user.id },
      data: { role: 'ADMIN', isActive: true, isVerified: true },
    });

    const userRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(participantUser);
    userToken = userRes.body.data.accessToken;
    userId = userRes.body.data.user.id;
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true, isVerified: true },
    });

    // 2. Create Module & Exam
    const module = await prisma.module.create({
      data: {
        title: 'Test Module',
        description: 'desc',
        createdBy: adminRes.body.data.user.id,
      },
    });

    const examRes = await request(app.getHttpServer())
      .post('/api/v1/exam')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ moduleId: module.id, duration: 60, maxAttempts: 3 })
      .expect(200);
    examId = examRes.body.id;

    // 3. Add internal Questions manually for simplicity in tests
    await prisma.question.create({
      data: {
        examId,
        question: 'What is 1+1?',
        options: ['1', '2', '3', '4'],
        correctAnswer: '2',
      },
    });
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await redis.flushall();
    await app.close();
  });

  // EXAM-01 to EXAM-03: Lifecycle
  describe('Exam Lifecycle', () => {
    it('should start an exam attempt', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/exam/${examId}/start`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.attemptId).toBeDefined();
      expect(res.body.endTime).toBeDefined();
    });
  });

  // EXAM-04: Write-Behind via WebSocket
  describe('Write-Behind Strategy (WebSocket)', () => {
    let socket: Socket;
    let attemptId: string;
    let questionId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/exam/${examId}/start`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      attemptId = res.body.attemptId;

      // Use the correct namespace and options
      socket = io(`http://localhost:${port}/exam`, {
        transports: ['websocket'],
        auth: { token: userToken },
      });

      await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => {
          socket.emit('joinExam', { attemptId });

          socket.on('exam:init', (data) => {
            questionId = data.questions[0].id;
            resolve();
          });

          socket.on('exception', (err) => {
            reject(new Error(err.message));
          });
        });
        socket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Socket connection timeout')), 5000);
      });
    });

    afterEach(() => {
      socket.disconnect();
    });

    it('should save answer to Redis but NOT to Database immediately (Write-Behind)', async () => {
      // 1. Send answer via socket
      socket.emit('answer', {
        attemptId,
        questionId,
        answer: '2',
      });

      // Wait for socket processing
      await new Promise((r) => setTimeout(r, 500));

      // 2. Verify Redis has the answer
      const redisKey = `attempt:${attemptId}:answers`;
      const redisAnswers = await redis.hgetall(redisKey);
      expect(redisAnswers[questionId]).toBe('2');

      // 3. Verify Database Answer collection is empty (Write-Behind)
      const dbAnswers = await prisma.answer.findMany({
        where: { attemptId },
      });
      expect(dbAnswers).toHaveLength(0);
    });

    it('should sync answers to Database on submitExam and clear Redis', async () => {
      // 1. Populate Redis first
      await redis.hset(`attempt:${attemptId}:answers`, questionId, '2');

      // 2. Submit Exam via WebSocket
      await new Promise<void>((resolve) => {
        socket.emit('submitExam', { attemptId });
        socket.on('exam:finished', async (data) => {
          expect(data.score).toBeDefined();
          // Small delay to ensure server-side Redis del completes
          await new Promise((r) => setTimeout(r, 100));
          resolve();
        });
      });

      // 3. Verify Database is populated (Sync)
      const dbAnswers = await prisma.answer.findMany({
        where: { attemptId },
      });
      expect(dbAnswers).toHaveLength(1);
      expect(dbAnswers[0].selectedAnswer).toBe('2');

      // 4. Verify Redis is cleared
      const redisAnswers = await redis.hgetall(`attempt:${attemptId}:answers`);
      expect(Object.keys(redisAnswers)).toHaveLength(0);
    });
  });
});
