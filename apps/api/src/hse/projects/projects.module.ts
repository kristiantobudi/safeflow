import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { DatabaseModule } from '../../database/database.module';
import { AuditLogModule } from '../../audit-log/audit-log.module';
import { HiracModule } from '../hirac/hirac.module';

import { AppRedisModule } from '../../common/redis/redis.module';
import { ProjectVersionService } from './project-version.service';

@Module({
  imports: [DatabaseModule, AuditLogModule, AppRedisModule, HiracModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectVersionService],
  exports: [ProjectsService, ProjectVersionService],
})
export class ProjectsModule {}
