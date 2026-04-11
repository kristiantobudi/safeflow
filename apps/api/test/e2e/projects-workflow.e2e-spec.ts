import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/database/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';
import { createTestApp, cleanDatabase } from '../setup';
import { Role, ProjectStatus, ApprovalStatus } from '@repo/database';
import * as bcrypt from 'bcryptjs';

describe('Projects Workflow (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  let requesterToken: string;
  let verificatorToken: string;
  let examinerToken: string;

  const password = 'Password@123';
  const hashedPassword = bcrypt.hashSync(password, 10);

  beforeAll(async () => {
    ({ app, prisma, redis } = await createTestApp());
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    await redis.flushall();

    // Create users
    const r = await prisma.user.create({
      data: { email: 'r@x.com', username: 'r', password: hashedPassword, role: Role.USER, firstName: 'R', isActive: true, isVerified: true }
    });
    const v = await prisma.user.create({
      data: { email: 'v@x.com', username: 'v', password: hashedPassword, role: Role.VERIFICATOR, firstName: 'V', isActive: true, isVerified: true }
    });
    const e = await prisma.user.create({
      data: { email: 'e@x.com', username: 'e', password: hashedPassword, role: Role.EXAMINER, firstName: 'E', isActive: true, isVerified: true }
    });

    // Login to get tokens
    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password });
      return res.body.data.accessToken;
    };

    requesterToken = await login('r@x.com');
    verificatorToken = await login('v@x.com');
    examinerToken = await login('e@x.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('should complete the full approval workflow', async () => {
    // 1. Create Project (Draft)
    const projectRes = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ unitKerja: 'IT Dept' })
      .expect(201);

    const projectId = projectRes.body.id;
    expect(projectRes.body.status).toBe(ProjectStatus.DRAFT);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/hirac`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        kegiatan: 'Coding',
        kategori: 'R',
        identifikasiBahaya: 'Carpal Tunnel',
        akibatRisiko: 'Pain',
        penilaianAwal: { akibat: 1, kemungkinan: 'A', tingkatRisiko: 'L' },
        pengendalian: 'Break every hour',
        penilaianLanjutan: { akibat: 1, kemungkinan: 'A', tingkatRisiko: 'L' }
      })
      .expect(201);

    // 3. Submit Project
    const submitRes = await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectId}/submit`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .expect(200);

    expect(submitRes.body.status).toBe(ProjectStatus.L1_REVIEW);

    // 4. Approve L1 (as Verificator)
    const approveL1Res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/approve`)
      .set('Authorization', `Bearer ${verificatorToken}`)
      .send({ note: 'Looks good' })
      .expect(201); // Controller returns 201 for POST

    expect(approveL1Res.body.status).toBe(ProjectStatus.L2_REVIEW);

    // 5. Approve L2 (as Examiner)
    const approveL2Res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/approve`)
      .set('Authorization', `Bearer ${examinerToken}`)
      .send({ note: 'Final approval' })
      .expect(201);

    expect(approveL2Res.body.status).toBe(ProjectStatus.APPROVED);

    // 6. Verify final state
    const finalProject = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .expect(200);

    expect(finalProject.body.status).toBe(ProjectStatus.APPROVED);
    expect(finalProject.body.approvalSteps).toHaveLength(2);
    expect(finalProject.body.approvalSteps[0].status).toBe(ApprovalStatus.APPROVED);
    expect(finalProject.body.approvalSteps[1].status).toBe(ApprovalStatus.APPROVED);
  });

  it('should support versioning and comparison', async () => {
    // 1. Create and Submit V1
    const p1 = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ unitKerja: 'V1 Dept' });
    const pid = p1.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${pid}/hirac`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        kegiatan: 'Old Task',
        kategori: 'R',
        identifikasiBahaya: 'Old hazard',
        akibatRisiko: 'Injury',
        penilaianAwal: { akibat: 1, kemungkinan: 'A', tingkatRisiko: 'L' },
        pengendalian: 'None',
        penilaianLanjutan: { akibat: 1, kemungkinan: 'A', tingkatRisiko: 'L' }
      });

    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${pid}/submit`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ changeNote: 'V1 Note' })
      .expect(200);

    // 2. Reject to go into REVISION
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${pid}/reject`)
      .set('Authorization', `Bearer ${verificatorToken}`)
      .send({ note: 'Needs change' })
      .expect(201);

    // 3. Modify HIRAC and Submit V2
    const current = await request(app.getHttpServer())
      .get(`/api/v1/projects/${pid}`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .expect(200);
    const hid = current.body.hiracs[0].id;

    // Update HIRAC
    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${pid}/hirac/${hid}`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ kegiatan: 'New Task' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${pid}/submit`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ changeNote: 'V2 Note' })
      .expect(200);

    // 4. Verify version list
    const versionsRes = await request(app.getHttpServer())
      .get(`/api/v1/projects/${pid}/versions`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .expect(200);

    expect(versionsRes.body).toHaveLength(2);
    expect(versionsRes.body[0].versionNumber).toBe(1);
    expect(versionsRes.body[1].versionNumber).toBe(2);

    // 5. Compare V1 vs V2
    const compareRes = await request(app.getHttpServer())
      .get(`/api/v1/projects/${pid}/versions/compare`)
      .query({ vA: 1, vB: 2 })
      .set('Authorization', `Bearer ${requesterToken}`)
      .expect(200);

    expect(compareRes.body.summary.modified).toBe(1);
    expect(compareRes.body.rows).toHaveLength(1);
    expect(compareRes.body.rows[0].diff.kegiatan).toBeDefined();
  });
});
