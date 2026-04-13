import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MinioModule as NestMinioModule } from 'nestjs-minio-client';
import { MinioService } from './minio.service';

@Global()
@Module({
  imports: [
    NestMinioModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        endPoint: configService.get<string>('MINIO_ENDPOINT', 'localhost'),
        port: parseInt(configService.get<string>('MINIO_PORT', '9000')),
        useSSL: configService.get<string>('MINIO_USE_SSL') === 'true',
        accessKey: configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
        secretKey: configService.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
      }),
    }),
  ],
  providers: [MinioService],
  exports: [MinioService],
})
export class AppStorageModule {}
