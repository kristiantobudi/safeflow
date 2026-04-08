import { Module } from '@nestjs/common';

import { LinksModule } from './links/links.module';

import { AppService } from './app.service';
import { AppController } from './app.controller';

import { DatabaseModule } from './database/database.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [DatabaseModule, AuditLogModule, LinksModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

