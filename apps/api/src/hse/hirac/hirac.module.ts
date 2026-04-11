import { Module } from '@nestjs/common';
import { HiracService } from './hirac.service';
import { DatabaseModule } from '../../database/database.module';
import { AuditLogModule } from '../../audit-log/audit-log.module';
import { AppRedisModule } from '../../common/redis/redis.module';
import { HiracController } from './hirac.controller';

@Module({
  imports: [DatabaseModule, AuditLogModule, AppRedisModule],
  controllers: [HiracController],
  providers: [HiracService],
  exports: [HiracService],
})
export class HiracModule {}
