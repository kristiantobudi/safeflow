import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/database/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';
import { createTestApp, cleanDatabase } from '../setup';
import { Role, ProjectStatus } from '@repo/database';
import * as bcrypt from 'bcryptjs';

describe('HIRAC Management (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let token: string;
  const password = 'Password@123';

  beforeAll(async () => {
    ({ app, prisma, redis } = await createTestApp());
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    await redis.flushall();

    const user = await prisma.user.create({
      data: {
        email: 'test@x.com',
        username: 'test',
        firstName: 'Test',
        password: bcrypt.hashSync(password, 10),
        role: Role.USER,
        isActive: true,
        isVerified: true,
      },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@x.com', password });
    token = res.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should manage HIRAC lifecycle (CRUD, Soft-Delete, Restore)', async () => {
    // 1. Create Project
    const projRes = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ unitKerja: 'HSE Test' });
    const pid = projRes.body.id;

    // 2. Add HIRAC
    const hiracRes = await request(app.getHttpServer())
      .post(`/api/v1/projects/${pid}/hirac`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        kegiatan: 'Scaffolding',
        kategori: 'R',
        identifikasiBahaya: 'Falling',
        akibatRisiko: 'Fracture',
        penilaianAwal: { akibat: 3, kemungkinan: 'B', tingkatRisiko: 'H' },
        pengendalian: 'Safety harness',
        penilaianLanjutan: { akibat: 3, kemungkinan: 'A', tingkatRisiko: 'M' },
      })
      .expect(201);
    const hid = hiracRes.body.id;

    // 3. Update HIRAC
    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${pid}/hirac/${hid}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ kegiatan: 'Updated Scaffolding' })
      .expect(200);

    // 4. Soft-delete HIRAC
    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${pid}/hirac/${hid}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Verify it's not in the project view
    const projectView = await request(app.getHttpServer())
      .get(`/api/v1/projects/${pid}`)
      .set('Authorization', `Bearer ${token}`);
    expect(projectView.body.hiracs).toHaveLength(0);

    // 5. Restore HIRAC
    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${pid}/hirac/${hid}/restore`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Verify it's back
    const projectView2 = await request(app.getHttpServer())
      .get(`/api/v1/projects/${pid}`)
      .set('Authorization', `Bearer ${token}`);
    expect(projectView2.body.hiracs).toHaveLength(1);
    expect(projectView2.body.hiracs[0].kegiatan).toBe('Updated Scaffolding');
  });

  it('should not allow modifying HIRAC when project is under review', async () => {
    const projRes = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ unitKerja: 'Lock Test' });
    const pid = projRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${pid}/hirac`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        kegiatan: 'Working',
        kategori: 'R',
        identifikasiBahaya: 'Heat',
        akibatRisiko: 'Dehydration',
        penilaianAwal: { akibat: 1, kemungkinan: 'A', tingkatRisiko: 'L' },
        pengendalian: 'Water',
        penilaianLanjutan: { akibat: 1, kemungkinan: 'A', tingkatRisiko: 'L' },
      });

    // Submit
    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${pid}/submit`)
      .set('Authorization', `Bearer ${token}`);

    // Try to add HIRAC while in L1_REVIEW
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${pid}/hirac`)
      .set('Authorization', `Bearer ${token}`)
      .send({ kegiatan: 'Forbidden' })
      .expect(400); // HiracService rejects if status is not DRAFT/REVISION
  });
});
