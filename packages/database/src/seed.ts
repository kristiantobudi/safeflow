import {
  PrismaClient,
  Role,
  JobTitle,
  ActivityCategory,
  RiskLevel,
  StatusControl,
  ProjectStatus,
  ApprovalStatus,
} from '../generated/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  const password = await bcrypt.hash('password123', 12);

  // 1. Create Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@safeflow.com' },
    update: {},
    create: {
      firstName: 'Admin',
      lastName: 'System',
      email: 'admin@safeflow.com',
      username: 'admin',
      password,
      role: Role.ADMIN,
      jobTitle: JobTitle.VERIFICATOR,
      isActive: true,
      isVerified: true,
      isEmailVerified: true,
    },
  });

  const verificator = await prisma.user.upsert({
    where: { email: 'verificator@safeflow.com' },
    update: {},
    create: {
      firstName: 'Vera',
      lastName: 'Verificator',
      email: 'verificator@safeflow.com',
      username: 'verificator',
      password,
      role: Role.VERIFICATOR,
      jobTitle: JobTitle.VERIFICATOR,
      isActive: true,
      isVerified: true,
      isEmailVerified: true,
    },
  });

  const examiner = await prisma.user.upsert({
    where: { email: 'examiner@safeflow.com' },
    update: {},
    create: {
      firstName: 'Ezra',
      lastName: 'Examiner',
      email: 'examiner@safeflow.com',
      username: 'examiner',
      password,
      role: Role.EXAMINER,
      jobTitle: JobTitle.REQUESTER,
      isActive: true,
      isVerified: true,
      isEmailVerified: true,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@safeflow.com' },
    update: {},
    create: {
      firstName: 'Umar',
      lastName: 'User',
      email: 'user@safeflow.com',
      username: 'user',
      password,
      role: Role.USER,
      jobTitle: JobTitle.REQUESTER,
      isActive: true,
      isVerified: true,
      isEmailVerified: true,
    },
  });

  console.log('✅ Users created.');

  // 2. Create Module
  const hseModule = await prisma.module.upsert({
    where: { title: 'Basic HSE Safety Training' },
    update: {},
    create: {
      title: 'Basic HSE Safety Training',
      description: 'Fundamental safety training for all personnel.',
      createdBy: admin.id,
      files: {
        create: [
          {
            filename: 'safety_manual.pdf',
            url: 'https://example.com/safety_manual.pdf',
          },
        ],
      },
    },
  });

  console.log('✅ HSE Module created.');

  // 3. Create Exam
  const exam = await prisma.exam.create({
    data: {
      moduleId: hseModule.id,
      duration: 30, // 30 minutes
      maxAttempts: 3,
      createdBy: admin.id,
      question: {
        create: [
          {
            question: 'Sebutkan salah satu alat pelindung diri (APD) utama?',
            options: ['Helm', 'Buku', 'Pena'],
            correctAnswer: 'Helm',
          },
          {
            question: 'Apa fungsi dari sepatu safety?',
            options: ['Melindungi kaki', 'Gaya', 'Lari'],
            correctAnswer: 'Melindungi kaki',
          },
        ],
      },
    },
  });

  console.log('✅ Exam and questions created.');

  // 4. Create Project with HIRAC
  const project = await prisma.project.create({
    data: {
      unitKerja: 'Operation Unit 1',
      lokasiKerja: 'Lantai 2, Building A',
      tanggal: new Date().toISOString(),
      createdBy: user.id,
      status: ProjectStatus.DRAFT,
      hiracs: {
        create: [
          {
            no: 1,
            kegiatan: 'Pekerjaan di Ketinggian',
            kategori: ActivityCategory.R,
            identifikasiBahaya: 'Jatuh dari ketinggian',
            akibatRisiko: 'Luka berat / Kematian',
            penilaianAwalAkibat: 4,
            penilaianAwalKemungkinan: 'C',
            penilaianAwalTingkatRisiko: RiskLevel.H,
            pengendalian: 'Menggunakan Full Body Harness',
            penilaianLanjutanAkibat: 4,
            penilaianLanjutanKemungkinan: 'E',
            penilaianLanjutanTingkatRisiko: RiskLevel.M,
            status: StatusControl.OPEN,
          },
        ],
      },
      approvalSteps: {
        create: [
          {
            stepOrder: 1,
            requiredRole: Role.VERIFICATOR,
            status: ApprovalStatus.PENDING,
          },
          {
            stepOrder: 2,
            requiredRole: Role.ADMIN,
            status: ApprovalStatus.PENDING,
          },
        ],
      },
    },
  });

  console.log('✅ Project with HIRAC and approvals created.');
  console.log('🌱 Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error while seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
