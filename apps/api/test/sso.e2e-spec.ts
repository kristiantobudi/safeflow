import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import { createTestApp, cleanDatabase } from './setup';
import { AuthProvider } from '@prisma/client';

describe('Google SSO (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  describe('GET /api/v1/auth/google', () => {
    it('should redirect to Google OAuth', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/google')
        .expect(302); // redirect

      expect(res.headers.location).toContain('accounts.google.com');
    });
  });

  describe('findOrCreateGoogleUser logic (unit-style via service)', () => {
    it('should create a new user from Google profile', async () => {
      const authService = app.get('AuthService');

      const googleUser = {
        googleId: 'google-test-id-123',
        email: 'google@example.com',
        displayName: 'Google User',
        avatarUrl: 'https://example.com/avatar.jpg',
        isEmailVerified: true,
      };

      const user = await authService.findOrCreateGoogleUser(googleUser);

      expect(user.email).toBe(googleUser.email);
      expect(user.googleId).toBe(googleUser.googleId);
      expect(user.authProvider).toBe(AuthProvider.GOOGLE);
      expect(user.password).toBeNull();
      expect(user.isEmailVerified).toBe(true);
    });

    it('should return existing user on second call with same googleId', async () => {
      const authService = app.get('AuthService');
      const googleUser = {
        googleId: 'google-existing-id',
        email: 'existing@example.com',
        displayName: 'Existing User',
        avatarUrl: null,
        isEmailVerified: true,
      };

      const first = await authService.findOrCreateGoogleUser(googleUser);
      const second = await authService.findOrCreateGoogleUser(googleUser);

      expect(first.id).toBe(second.id);
    });

    it('should link Google to existing LOCAL account with same email', async () => {
      // Create local account first
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'local@example.com',
          username: 'localuser',
          password: 'Test@1234',
        });

      const authService = app.get('AuthService');
      const googleUser = {
        googleId: 'google-link-id-999',
        email: 'local@example.com', // same email
        displayName: 'Local User via Google',
        avatarUrl: null,
        isEmailVerified: true,
      };

      const user = await authService.findOrCreateGoogleUser(googleUser);

      // Should be linked — still LOCAL provider but now has googleId
      expect(user.email).toBe('local@example.com');
      expect(user.googleId).toBe('google-link-id-999');
    });

    it('should generate unique username for new SSO user', async () => {
      const authService = app.get('AuthService');

      // Create two SSO users with similar names
      const user1 = await authService.findOrCreateGoogleUser({
        googleId: 'gid-1',
        email: 'john@example.com',
        displayName: 'John Doe',
        avatarUrl: null,
        isEmailVerified: true,
      });

      const user2 = await authService.findOrCreateGoogleUser({
        googleId: 'gid-2',
        email: 'john2@example.com',
        displayName: 'John Doe', // same displayName
        avatarUrl: null,
        isEmailVerified: true,
      });

      expect(user1.username).not.toBe(user2.username);
    });

    it('should block LOCAL login for SSO-only user', async () => {
      const authService = app.get('AuthService');
      await authService.findOrCreateGoogleUser({
        googleId: 'gid-sso-only',
        email: 'sso@example.com',
        displayName: 'SSO Only',
        avatarUrl: null,
        isEmailVerified: true,
      });

      // Try login via password — should throw
      await expect(
        authService.validateUser('sso@example.com', 'anypassword'),
      ).rejects.toThrow();
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user info', async () => {
      const regRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'me@example.com', username: 'meuser', password: 'Test@1234' });

      const { accessToken } = regRes.body.data;

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.email).toBe('me@example.com');
      expect(res.body.data.password).toBeUndefined();
      expect(res.body.data.twoFactorSecret).toBeUndefined();
    });
  });
});
