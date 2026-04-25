import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import pgSession from 'connect-pg-simple';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { RedisIoAdapter } from './config/redis.adapter';
import fastifyHelmet from '@fastify/helmet';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyCompress from '@fastify/compress';
import fastifyMultipart from '@fastify/multipart';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false,
    }),
    {
      bufferLogs: true,
    },
  );

  const configService = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  // Use Winston as the logger
  app.useLogger(logger);

  // ─── Brotli Compression ───────────────────────────────────────────────────
  await app.register(fastifyCompress as any, {
    encodings: ['br', 'gzip'],
  });

  // ─── File Uploads ─────────────────────────────────────────────────────────
  await app.register(fastifyMultipart as any);

  await app.register(fastifyHelmet as any, {
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
  });

  await app.register(fastifyCookie as any, {
    secret: configService.get<string>('COOKIE_SECRET'),
  });

  const sessionMaxAge =
    Number(configService.get('SESSION_MAX_AGE')) || 86400000;

  const PgStore = pgSession({
    session: Object.assign(function () {}, { Store: function () {} }),
  } as any);

  await app.register(fastifySession as any, {
    secret: configService.get<string>('SESSION_SECRET') || 'default_secret',
    saveUninitialized: false,
    rolling: true,
    cookieName: 'sid',
    store: new PgStore({
      conString: configService.get<string>('DATABASE_URL'),
      tableName: 'session',
      ttl: sessionMaxAge / 1000,
    }) as any,
    cookie: {
      httpOnly: true,
      secure: configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: sessionMaxAge,
    },
  });

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

  // ─── Start Server ─────────────────────────────────────────────────────────
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Application running on port ${port}`, 'Bootstrap');
  logger.log(`✅ Redis adapter connected`, 'Bootstrap');
  logger.log(`📌 Environment: ${configService.get('NODE_ENV')}`, 'Bootstrap');
}

bootstrap();
