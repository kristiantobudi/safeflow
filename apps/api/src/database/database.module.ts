import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mongoose from 'mongoose';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: 'MONGODB_CONNECTION',
      useFactory: async (
        configService: ConfigService,
        logger: any,
      ): Promise<typeof mongoose> => {
        const uri = configService.get<string>('MONGODB_URI') || '';
        if (!uri) {
          throw new Error('MONGODB_URI is not defined in the environment');
        }
        try {
          const connection = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
          });

          mongoose.connection.on('connected', () =>
            logger.log('MongoDB connected', 'DatabaseModule'),
          );
          mongoose.connection.on('error', (err) =>
            logger.error(
              'MongoDB error: ' + err.message,
              err.stack,
              'DatabaseModule',
            ),
          );
          mongoose.connection.on('disconnected', () =>
            logger.warn('MongoDB disconnected', 'DatabaseModule'),
          );

          logger.log('MongoDB connection established', 'DatabaseModule');
          return connection;
        } catch (error: any) {
          logger.error(
            'MongoDB connection failed',
            error.stack,
            'DatabaseModule',
          );
          throw error;
        }
      },
      inject: [ConfigService, WINSTON_MODULE_NEST_PROVIDER],
    },
  ],
  exports: [PrismaService, 'MONGODB_CONNECTION'],
})
export class DatabaseModule {}
