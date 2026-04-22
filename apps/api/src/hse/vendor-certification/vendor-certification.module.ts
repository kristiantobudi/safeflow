import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditLogModule } from '../../audit-log/audit-log.module';
import { AppRedisModule } from '../../common/redis/redis.module';
import { CertificationProgramService } from './certification-program.service';
import { VendorCertificationService } from './vendor-certification.service';
import {
  CertificationProgramController,
  VendorCertificationController,
} from './vendor-certification.controller';
import { VendorCertifiedGuard } from './vendor-certified.guard';

@Module({
  imports: [DatabaseModule, AuditLogModule, AppRedisModule],
  controllers: [CertificationProgramController, VendorCertificationController],
  providers: [
    CertificationProgramService,
    VendorCertificationService,
    VendorCertifiedGuard,
  ],
  exports: [VendorCertificationService, VendorCertifiedGuard],
})
export class VendorCertificationModule {}
