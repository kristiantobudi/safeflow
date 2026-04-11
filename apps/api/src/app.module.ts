import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { LinksModule } from './links/links.module';

import { AppService } from './app.service';
import { AppController } from './app.controller';

import { DatabaseModule } from './database/database.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston/dist/winston.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { winstonConfig } from './logger/winston.config';
import appConfig from './config/app.config';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { RedisModule } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { AppRedisModule } from './common/redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { InvitationsModule } from './invitations/invitations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProjectsModule } from './hse/projects/projects.module';
import { HiracModule } from './hse/hirac/hirac.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ─── Config ────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // ─── Logger (Winston) ──────────────────────────────────────────
    WinstonModule.forRootAsync({
      useFactory: (configService: ConfigService) =>
        winstonConfig(configService),
      inject: [ConfigService],
    }),

    // ─── Redis & Cache ─────────────────────────────────────────────
    AppRedisModule,
    RedisModule.forRoot({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      type: 'single',
    }),
    ThrottlerModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('THROTTLE_TTL', 60) * 1000,
            limit: configService.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
        storage: new ThrottlerStorageRedisService(
          new Redis(
            configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
          ),
        ),
      }),
      inject: [ConfigService],
      imports: [ConfigModule],
    }),
    RedisModule.forRoot({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      type: 'single',
    }),

    // ─── Database ──────────────────────────────────────────────────
    DatabaseModule,
    AuditLogModule,

    // ─── Feature Modules ───────────────────────────────────────────
    UsersModule,
    AuthModule,
    AppRedisModule,
    InvitationsModule,
    NotificationsModule,
    ProjectsModule,
    HiracModule,
  ],
})
export class AppModule {}
