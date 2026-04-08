import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/database/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';
import { createTestApp, cleanDatabase } from '../setup';
import { MailService } from '../../src/mail/mail.service';
import { Role } from '@prisma/client';
import * as excelParser from '../../src/utils/excel.parser';

// Mock the excel parser utility
jest.mock('../../src/utils/excel.parser');

// Increase Jest timeout for E2E tests involving background tasks and sleep
jest.setTimeout(60000);

describe('Auth Bulk Registration via Excel (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let mailService: MailService;
  let sendUserEmailSpy: jest.SpyInstance;
  let sendAdminReportSpy: jest.SpyInstance;

  beforeAll(async () => {
    ({ app, prisma, redis } = await createTestApp());
    mailService = app.get(MailService);

    // Spy on MailService methods
    sendUserEmailSpy = jest.spyOn(mailService, 'sendBulkRegistrationEmail').mockResolvedValue(undefined);
    sendAdminReportSpy = jest.spyOn(mailService, 'sendAdminBulkReportEmail').mockResolvedValue(undefined);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    await redis.flushall();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await redis.flushall();
    await app.close();
  });

  async function createAdmin() {
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        username: 'admin_bulk',
        password: 'Password@123',
      });
    
    const adminId = adminRes.body.data.user.id;
    await prisma.user.update({
      where: { id: adminId },
      data: { role: Role.ADMIN, isActive: true, isVerified: true },
    });
    
    return adminRes.body.data.accessToken;
  }

  it('BULK-01: should process excel, register users, and send emails in background', async () => {
    const adminToken = await createAdmin();

    // Prepare mock data for 12 users (to test chunking beyond 10)
    const mockUsers = Array.from({ length: 12 }, (_, i) => ({
      firstName: `User${i}`,
      lastName: 'Test',
      email: `user${i}@example.com`,
      username: `user_bulk_${i}`,
      password: `Pass@${i}123`,
    }));

    (excelParser.parseExcelRegisterUser as jest.Mock).mockReturnValue(mockUsers);

    // Perform upload request (using a dummy buffer)
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register/upload-register')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('dummy excel content'), 'test.xlsx');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(12);

    // Wait a bit for background tasks (setImmediate + chunk delays)
    // Since we have chunk of 10 and 1s delay, 12 users = 2 chunks.
    // Total wait time should be around 1.5 - 2s
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Verify User emails
    expect(sendUserEmailSpy).toHaveBeenCalledTimes(12);
    expect(sendUserEmailSpy).toHaveBeenCalledWith(expect.objectContaining({
      email: 'user0@example.com',
      plainPassword: 'Pass@0123',
    }));

    // Verify Admin report email
    expect(sendAdminReportSpy).toHaveBeenCalledTimes(1);
    expect(sendAdminReportSpy).toBeCalledWith(expect.objectContaining({
      totalProcessed: 12,
      totalSuccess: 12,
      totalFailed: 0,
    }));
  });

  it('BULK-02: should include failure details in admin report', async () => {
    const adminToken = await createAdmin();

    // Prepare mock data: 1 success, 1 duplicate (already in DB from createAdmin), 1 invalid
    const mockUsers = [
      { firstName: 'Success', lastName: 'User', email: 'success@example.com', username: 'success_u', password: 'Password@123' },
      { firstName: 'Admin', lastName: 'User', email: 'admin@example.com', username: 'admin_bulk', password: 'Password@123' }, // Duplicate
      { firstName: '', lastName: '', email: 'invalid@example.com', username: 'invalid', password: '' }, // Invalid data (missing password/name)
    ];

    (excelParser.parseExcelRegisterUser as jest.Mock).mockReturnValue(mockUsers);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register/upload-register')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('dummy content'), 'fail_test.xlsx');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(1);
    expect(res.body.failed).toBe(2);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 1 user success = 1 email
    expect(sendUserEmailSpy).toHaveBeenCalledTimes(1);
    
    // Admin report should still be sent
    expect(sendAdminReportSpy).toHaveBeenCalledTimes(1);
    expect(sendAdminReportSpy).toHaveBeenCalledWith(expect.objectContaining({
      totalProcessed: 3,
      totalSuccess: 1,
      totalFailed: 2,
      skippedDetails: expect.arrayContaining([
        expect.objectContaining({ reason: 'Already exists in DB' }),
        expect.objectContaining({ reason: 'Invalid data' }),
      ]),
    }));
  });
});
