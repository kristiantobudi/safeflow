import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/database/prisma.service';
import { createTestApp, cleanDatabase } from './setup';
import { Role } from '@prisma/client';

describe('Notifications (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let moderatorToken: string;
  let userToken: string;

  const adminUser   = { email: 'admin@test.com',     username: 'adminuser',     password: 'Admin@1234' };
  const modUser     = { email: 'mod@test.com',        username: 'moduser',       password: 'Mod@12345' };
  const normalUser  = { email: 'normal@test.com',     username: 'normaluser',    password: 'User@1234' };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);

    // Buat admin
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register').send(adminUser);
    adminToken = adminRes.body.data.accessToken;
    await prisma.user.update({
      where: { id: adminRes.body.data.user.id },
      data: { role: Role.ADMIN },
    });
    // Refresh token setelah role diubah
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    adminToken = adminLogin.body.data.accessToken;

    // Buat moderator
    const modRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register').send(modUser);
    await prisma.user.update({
      where: { id: modRes.body.data.user.id },
      data: { role: Role.MODERATOR },
    });
    const modLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: modUser.email, password: modUser.password });
    moderatorToken = modLogin.body.data.accessToken;

    // Buat user biasa
    const userRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register').send(normalUser);
    userToken = userRes.body.data.accessToken;
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  // ─── Access Control ───────────────────────────────────────────────────────

  describe('Access Control', () => {
    it('ADMIN bisa lihat notifikasi', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('MODERATOR bisa lihat notifikasi', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(200);
    });

    it('USER biasa TIDAK bisa lihat notifikasi (403)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('Tanpa token TIDAK bisa lihat notifikasi (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .expect(401);
    });
  });

  // ─── Notifikasi Dibuat Saat Register ─────────────────────────────────────

  describe('Notifikasi otomatis saat register', () => {
    it('harus ada notifikasi setelah user baru register (LOCAL)', async () => {
      // Daftarkan user baru
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'newbie@test.com', username: 'newbie', password: 'New@12345' });

      // Tunggu async notification selesai
      await new Promise((r) => setTimeout(r, 200));

      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const notif = res.body.data.notifications.find(
        (n: any) => n.type === 'USER_REGISTERED_LOCAL' &&
                    n.data?.email === 'newbie@test.com',
      );
      expect(notif).toBeDefined();
      expect(notif.title).toContain('Pengguna Baru');
      expect(notif.isRead).toBe(false);
    });

    it('notifikasi bisa dilihat oleh MODERATOR juga', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'another@test.com', username: 'another', password: 'Pass@1234' });

      await new Promise((r) => setTimeout(r, 200));

      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(200);

      expect(res.body.data.notifications.length).toBeGreaterThan(0);
    });
  });

  // ─── Fitur Notifikasi ─────────────────────────────────────────────────────

  describe('Fitur notifikasi', () => {
    beforeEach(async () => {
      // Seed beberapa notifikasi
      await request(app.getHttpServer()).post('/api/v1/auth/register')
        .send({ email: 'seed1@test.com', username: 'seed1', password: 'Seed@1234' });
      await request(app.getHttpServer()).post('/api/v1/auth/register')
        .send({ email: 'seed2@test.com', username: 'seed2', password: 'Seed@5678' });
      await new Promise((r) => setTimeout(r, 300));
    });

    it('GET /notifications — pagination berfungsi', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.notifications).toHaveLength(1);
      expect(res.body.data.limit).toBe(1);
      expect(res.body.data.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('GET /notifications?onlyUnread=true — hanya yang belum dibaca', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications?onlyUnread=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      res.body.data.notifications.forEach((n: any) => {
        expect(n.isRead).toBe(false);
      });
    });

    it('GET /notifications/unread-count — mengembalikan angka', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(typeof res.body.data.count).toBe('number');
      expect(res.body.data.count).toBeGreaterThan(0);
    });

    it('PATCH /notifications/:id/read — tandai satu sebagai dibaca', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${adminToken}`);

      const notifId = listRes.body.data.notifications[0].id;

      await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Unread count harus berkurang
      const countBefore = listRes.body.data.unreadCount;
      const countRes = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(countRes.body.data.count).toBeLessThan(countBefore);
    });

    it('PATCH /notifications/read-all — tandai semua sebagai dibaca', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const countRes = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(countRes.body.data.count).toBe(0);
    });

    it('DELETE /notifications/cleanup — ADMIN bisa hapus notifikasi lama', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/v1/notifications/cleanup?days=0')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.count).toBeGreaterThanOrEqual(0);
    });

    it('DELETE /notifications/cleanup — MODERATOR tidak bisa cleanup (403)', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/notifications/cleanup')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(403);
    });
  });
});
