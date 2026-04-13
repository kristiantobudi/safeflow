import { Module } from '@nestjs/common';
import { WorkerVendorService } from './worker-vendor.service';
import { WorkerVendorController } from './worker-vendor.controller';
import { DatabaseModule } from '../../database/database.module';
import { AuditLogModule } from '../../audit-log/audit-log.module';
import { AppRedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [DatabaseModule, AuditLogModule, AppRedisModule],
  controllers: [WorkerVendorController],
  providers: [WorkerVendorService],
  exports: [WorkerVendorService],
})
export class WorkerVendorModule {}
