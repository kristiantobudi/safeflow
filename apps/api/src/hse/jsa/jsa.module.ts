import { Module } from '@nestjs/common';
import { JsaService } from './jsa.service';
import { JsaController } from './jsa.controller';
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
  controllers: [JsaController],
  providers: [JsaService],
  exports: [JsaService],
})
export class JsaModule {}
