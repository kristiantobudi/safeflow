import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { Server } from 'socket.io';
import { RedisIoAdapter } from './config/redis.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  // Use Winston as the logger
  app.useLogger(logger);

  // ─── Security Headers (Helmet) ───────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: 'same-site' },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      ieNoOpen: true,
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true,
    }),
  );

  // ─── Cookie Parser ────────────────────────────────────────────────────────
  app.use(cookieParser(configService.get<string>('COOKIE_SECRET')));

  const sessionMaxAge =
    Number(configService.get('SESSION_MAX_AGE')) || 86400000;

  // ─── Session ─────────────────────────────────────────────────────────────
  app.use(
    session({
      secret: configService.get<string>('SESSION_SECRET') || 'default_secret',
      resave: false,
      saveUninitialized: false,
      rolling: true,
      name: 'sid',
      store: MongoStore.create({
        mongoUrl: configService.get<string>('MONGODB_URI'),
        collectionName: 'sessions',
        ttl: sessionMaxAge / 1000, // in seconds
        autoRemove: 'interval',
        autoRemoveInterval: 10, // minutes
      }),
      cookie: {
        httpOnly: true,
        secure: configService.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: sessionMaxAge,
      },
    }),
  );

  // ─── Global Prefix ────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ─── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin:
      configService.get<string>('NODE_ENV') === 'production'
        ? ['https://yourdomain.com']
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });

  // ─── Global Pipes ─────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Global Filters ───────────────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  // ─── Global Interceptors ─────────────────────────────────────────────────
  app.useGlobalInterceptors(
    new LoggingInterceptor(logger),
    new TransformInterceptor(),
  );

  const port = configService.get<number>('PORT', 1945);
  const redisAdapter = new RedisIoAdapter(app);
  await redisAdapter.connectToRedis();
  app.useWebSocketAdapter(redisAdapter);
  await app.listen(port);

  logger.log(`🚀 Application running on port ${port}`, 'Bootstrap');
  logger.log(`✅ Redis adapter connected`, 'Bootstrap');
  logger.log(`📌 Environment: ${configService.get('NODE_ENV')}`, 'Bootstrap');
}

bootstrap();
