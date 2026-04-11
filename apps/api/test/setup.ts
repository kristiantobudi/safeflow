import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/common/redis/redis.service';

export async function createTestApp(
  overrideCallback?: (builder: any) => any,
): Promise<{
  app: INestApplication;
  prisma: PrismaService;
  redis: RedisService;
}> {
  let builder = Test.createTestingModule({
    imports: [AppModule],
  });

  if (overrideCallback) {
    builder = overrideCallback(builder);
  }

  const moduleFixture: TestingModule = await builder.compile();

  const app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.use(
    require('express-session')({
      secret: 'test_secret',
      resave: false,
      saveUninitialized: false,
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api/v1');

  await app.init();
  await app.listen(0);

  const prisma = app.get(PrismaService);
  const redis = app.get(RedisService);

  return { app, prisma, redis };
}

export async function cleanDatabase(prisma: PrismaService) {
  // Clear all tables for PostgreSQL
  // Delete child/dependent records first to avoid relation violations
  await prisma.answer.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.examAttempt.deleteMany();
  await prisma.question.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.moduleFile.deleteMany();
  await prisma.module.deleteMany();
  await prisma.position.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.versionApproval.deleteMany();
  await prisma.hiracVersion.deleteMany();
  await prisma.projectVersion.deleteMany();
  await prisma.hirac.deleteMany();
  await prisma.project.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}
