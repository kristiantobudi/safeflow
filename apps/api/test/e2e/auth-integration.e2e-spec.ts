import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/database/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';
import { createTestApp, cleanDatabase } from '../setup';
import { MailService } from '../../src/mail/mail.service';
import { AuthService } from '../../src/auth/auth.service';
import { GoogleAuthGuard } from '../../src/common/guards/google-auth.guard';
import { Role, InvitationStatus, AuthProvider, NotificationType } from '@prisma/client';

// Increase Jest timeout for E2E tests
jest.setTimeout(60000);

describe('Advanced Authentication Integration (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let mailService: MailService;
  let authService: AuthService;
  let mailSpy: jest.SpyInstance;

  // For Google SSO mocking
  let currentGoogleUser: any = null;

  const mockGoogleProfile = {
    googleId: 'google-test-id-12345',
    email: 'google-test@example.com',
    displayName: 'Google Test User',
    avatarUrl: 'http://example.com/avatar.jpg',
    isEmailVerified: true,
  };

  beforeAll(async () => {
    ({ app, prisma, redis } = await createTestApp((builder) => {
      return builder.overrideGuard(GoogleAuthGuard).useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = currentGoogleUser;
          return true;
        },
      });
    }));
    mailService = app.get(MailService);
    authService = app.get(AuthService);
    mailSpy = jest.spyOn(mailService, 'notifyAdminsNewUser').mockResolvedValue(undefined);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    await redis.flushall();
    mailSpy.mockClear();
    currentGoogleUser = null;
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await redis.flushall();
    await app.close();
  });

  describe('Invitations Integration', () => {
    let adminToken: string;
    let adminId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Admin', lastName: 'User', email: 'admin-e2e@example.com',
          username: 'admin_e2e', password: 'Password@123',
        });
      adminToken = res.body.data.accessToken;
      adminId = res.body.data.user.id;
      await prisma.user.update({
        where: { id: adminId },
        data: { role: Role.ADMIN, isActive: true, isVerified: true },
      });
    });

    it('INV-02: should register user via invitation and trigger notifications', async () => {
      const inviteEmail = 'invited-user@example.com';
      const inviteRes = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: inviteEmail, role: Role.EXAMINER });
      
      const token = inviteRes.body.data.token; // Fixed: access data.token

      const regRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Invited', lastName: 'Name', email: inviteEmail,
          username: 'invited_guy', password: 'Password@123', invitationToken: token,
        });

      expect(regRes.status).toBe(201);
      expect(regRes.body.data.user.role).toBe(Role.EXAMINER);
      
      const invitation = await prisma.invitation.findUnique({ where: { token } });
      expect(invitation?.status).toBe(InvitationStatus.ACCEPTED);
      expect(mailSpy).toHaveBeenCalled();
    });
  });

  describe('Google SSO Integration', () => {
    it('SSO-01: should register a new user via Google SSO', async () => {
      currentGoogleUser = await authService.findOrCreateGoogleUser(mockGoogleProfile);
      
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/google/callback');

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(mockGoogleProfile.email);
      expect(res.body.data.user.authProvider).toBe(AuthProvider.GOOGLE);
    });

    it('SSO-02: should link Google account to existing local account', async () => {
      const sso2Profile = { 
        ...mockGoogleProfile, 
        googleId: 'google-sso2-id', 
        email: 'sso2-link@example.com' 
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Local', lastName: 'User', email: sso2Profile.email,
          username: 'sso2_user', password: 'Password@123',
        });
      
      mailSpy.mockClear();

      currentGoogleUser = await authService.findOrCreateGoogleUser(sso2Profile);

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/google/callback');

      expect(res.status).toBe(200);
      const user = await prisma.user.findUnique({ where: { email: sso2Profile.email } });
      expect(user?.googleId).toBe(sso2Profile.googleId);
    });
  });
});
