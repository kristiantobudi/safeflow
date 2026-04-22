import { Module } from '@nestjs/common';
import { TrainingService } from './training.service';
import { TrainingController } from './training.controller';
import { DatabaseModule } from '../database/database.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AppRedisModule } from '../common/redis/redis.module';
import { AppStorageModule } from '../common/minio/minio.module';

@Module({
  imports: [
    DatabaseModule,
    AuditLogModule,
    AppRedisModule,
    AppStorageModule,
  ],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}