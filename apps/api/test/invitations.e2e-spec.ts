import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import { createTestApp, cleanDatabase } from './setup';
import { Role } from '@prisma/client';

describe('Invitations (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let adminId: string;
  let modToken: string;
  let userToken: string;

  const admin = { email: 'admin@inv.com', username: 'admininv', password: 'Admin@1234' };
  const mod   = { email: 'mod@inv.com',   username: 'modinv',   password: 'Mod@12345' };
  const user  = { email: 'user@inv.com',  username: 'userinv',  password: 'User@1234' };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);

    // Buat & elevate admin
    const ar = await request(app.getHttpServer()).post('/api/v1/auth/register').send(admin);
    adminId = ar.body.data.user.id;
    await prisma.user.update({ where: { id: adminId }, data: { role: Role.ADMIN } });
    const al = await request(app.getHttpServer()).post('/api/v1/auth/login')
      .send({ email: admin.email, password: admin.password });
    adminToken = al.body.data.accessToken;

    // Buat & elevate moderator
    const mr = await request(app.getHttpServer()).post('/api/v1/auth/register').send(mod);
    await prisma.user.update({ where: { id: mr.body.data.user.id }, data: { role: Role.MODERATOR } });
    const ml = await request(app.getHttpServer()).post('/api/v1/auth/login')
      .send({ email: mod.email, password: mod.password });
    modToken = ml.body.data.accessToken;

    // User biasa
    const ur = await request(app.getHttpServer()).post('/api/v1/auth/register').send(user);
    userToken = ur.body.data.accessToken;
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  // ─── Single Invite ────────────────────────────────────────────────────────

  describe('POST /api/v1/invitations (single)', () => {
    it('Admin bisa kirim undangan', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'newuser@example.com', role: 'USER', note: 'Selamat datang!' })
        .expect(201);

      expect(res.body.data.email).toBe('newuser@example.com');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.role).toBe('USER');
    });

    it('Moderator bisa kirim undangan', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${modToken}`)
        .send({ email: 'invited@example.com' })
        .expect(201);
    });

    it('User biasa TIDAK bisa kirim undangan (403)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ email: 'x@example.com' })
        .expect(403);
    });

    it('Tolak email yang sudah terdaftar', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: user.email })  // email user yang sudah ada
        .expect(400);

      expect(res.body.message).toContain('sudah terdaftar');
    });

    it('Tolak undangan duplikat ke email yang sama (PENDING)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'dup@example.com' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'dup@example.com' })
        .expect(400);
    });

    it('Validasi email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'bukan-email' })
        .expect(400);
    });
  });

  // ─── Bulk Invite ─────────────────────────────────────────────────────────

  describe('POST /api/v1/invitations/bulk', () => {
    it('Berhasil kirim bulk undangan', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/invitations/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          invites: [
            { email: 'bulk1@example.com', role: 'USER' },
            { email: 'bulk2@example.com', role: 'MODERATOR', note: 'Untuk moderasi' },
            { email: 'bulk3@example.com' },
          ],
        })
        .expect(201);

      expect(res.body.data.summary.total).toBe(3);
      expect(res.body.data.summary.sent).toBe(3);
      expect(res.body.data.summary.failed).toBe(0);
      expect(res.body.data.successful).toHaveLength(3);
    });

    it('Partial success: beberapa email gagal, yang lain tetap berhasil', async () => {
      // user@inv.com sudah terdaftar
      const res = await request(app.getHttpServer())
        .post('/api/v1/invitations/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          invites: [
            { email: 'valid@example.com' },
            { email: user.email },  // sudah terdaftar → gagal
          ],
        })
        .expect(201);

      expect(res.body.data.summary.sent).toBe(1);
      expect(res.body.data.summary.failed).toBe(1);
      expect(res.body.data.failed[0].reason).toContain('sudah terdaftar');
    });

    it('Deduplikasi email dalam satu batch', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/invitations/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          invites: [
            { email: 'same@example.com' },
            { email: 'same@example.com' }, // duplikat
          ],
        })
        .expect(201);

      expect(res.body.data.summary.sent).toBe(1);
    });

    it('Tolak jika melebihi 50 email', async () => {
      const invites = Array.from({ length: 51 }, (_, i) => ({
        email: `user${i}@example.com`,
      }));
      await request(app.getHttpServer())
        .post('/api/v1/invitations/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ invites })
        .expect(400);
    });
  });

  // ─── Verify Token (Public) ───────────────────────────────────────────────

  describe('GET /api/v1/invitations/verify/:token', () => {
    let inviteToken: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'verify@example.com', role: 'USER', note: 'Halo!' });
      inviteToken = res.body.data.token;
    });

    it('Token valid mengembalikan detail undangan', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/invitations/verify/${inviteToken}`)
        .expect(200);

      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.invitation.email).toBe('verify@example.com');
      expect(res.body.data.invitation.role).toBe('USER');
      expect(res.body.data.invitation.invitedBy).toBeDefined();
    });

    it('Token tidak valid mengembalikan 404', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/invitations/verify/tokenpalsu123')
        .expect(404);
    });

    it('Endpoint ini PUBLIC — tidak perlu token JWT', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/invitations/verify/${inviteToken}`)
        .expect(200); // tanpa Authorization header
    });
  });

  // ─── Register via Invitation ─────────────────────────────────────────────

  describe('Register via invitation token', () => {
    let inviteToken: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'invited@example.com', role: 'MODERATOR' });
      inviteToken = res.body.data.token;
    });

    it('Berhasil register dengan token undangan yang valid', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invited@example.com',
          username: 'inviteduser',
          password: 'Invited@1234',
          invitationToken: inviteToken,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.viaInvitation).toBe(true);
      // Role dari undangan harus dipakai
      expect(res.body.data.user.role).toBe('MODERATOR');
    });

    it('Undangan statusnya ACCEPTED setelah register', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invited@example.com',
          username: 'inviteduser2',
          password: 'Invited@1234',
          invitationToken: inviteToken,
        });

      const invitation = await prisma.invitation.findFirst({
        where: { token: inviteToken },
      });
      expect(invitation.status).toBe('ACCEPTED');
    });

    it('Token yang sudah dipakai tidak bisa dipakai lagi', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invited@example.com',
          username: 'inviteduser3',
          password: 'Invited@1234',
          invitationToken: inviteToken,
        });

      // Coba register dengan email berbeda tapi token yang sama
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'other@example.com',
          username: 'otheruser',
          password: 'Other@1234',
          invitationToken: inviteToken,
        })
        .expect(400);
    });

    it('Tolak jika email tidak cocok dengan undangan', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'different@example.com', // beda dari email di undangan
          username: 'diffuser',
          password: 'Diff@1234',
          invitationToken: inviteToken,
        })
        .expect(400);

      expect(res.body.message).toContain('Email tidak sesuai');
    });

    it('Bisa register tanpa token undangan (normal flow tetap berjalan)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'normal@example.com',
          username: 'normalreg',
          password: 'Normal@1234',
          // tanpa invitationToken
        })
        .expect(201);
    });
  });

  // ─── Revoke ──────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/invitations/:id/revoke', () => {
    let invitationId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'torevoke@example.com' });
      invitationId = res.body.data.id;
    });

    it('Admin bisa revoke undangan', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/invitations/${invitationId}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.message).toContain('berhasil dibatalkan');
    });

    it('Token yang sudah di-revoke tidak valid lagi', async () => {
      const inviteRes = await prisma.invitation.findUnique({
        where: { id: invitationId },
      });
      const token = inviteRes.token;

      await request(app.getHttpServer())
        .delete(`/api/v1/invitations/${invitationId}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`);

      await request(app.getHttpServer())
        .get(`/api/v1/invitations/verify/${token}`)
        .expect(400);
    });
  });

  // ─── Resend ──────────────────────────────────────────────────────────────

  describe('PATCH /api/v1/invitations/:id/resend', () => {
    it('Admin bisa resend undangan dan token berubah', async () => {
      const inv = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'resend@example.com' });

      const oldToken = inv.body.data.token;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/invitations/${inv.body.data.id}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.token).not.toBe(oldToken);
      expect(res.body.data.status).toBe('PENDING');
    });
  });

  // ─── List & Stats ─────────────────────────────────────────────────────────

  describe('GET /api/v1/invitations & /stats', () => {
    it('Admin bisa lihat semua undangan', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'list1@example.com' });

      const res = await request(app.getHttpServer())
        .get('/api/v1/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.invitations.length).toBeGreaterThan(0);
    });

    it('Filter berdasarkan status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/invitations?status=PENDING')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      res.body.data.invitations.forEach((inv: any) => {
        expect(inv.status).toBe('PENDING');
      });
    });

    it('GET /stats hanya untuk Admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/invitations/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('pending');
      expect(res.body.data).toHaveProperty('accepted');
    });
  });
});
