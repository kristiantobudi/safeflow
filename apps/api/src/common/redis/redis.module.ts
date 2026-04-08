import { Global, Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [RedisModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class AppRedisModule {}
