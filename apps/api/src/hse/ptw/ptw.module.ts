import { Module } from '@nestjs/common';
import { PtwService } from './ptw.service';
import { PtwController } from './ptw.controller';
import { DatabaseModule } from '../../database/database.module';
import { AuditLogModule } from '../../audit-log/audit-log.module';
import { AppRedisModule } from '../../common/redis/redis.module';
import { VendorCertificationModule } from '../vendor-certification/vendor-certification.module';

@Module({
  imports: [
    DatabaseModule,
    AuditLogModule,
    AppRedisModule,
    VendorCertificationModule,
  ],
  controllers: [PtwController],
  providers: [PtwService],
  exports: [PtwService],
})
export class PtwModule {}
