import { ConfigService } from '@nestjs/config';
import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const devFormat = printf(
  ({ level, message, timestamp, stack, context, requestId }) => {
    const ctx = context ? `[${context}]` : '';
    const rid = requestId ? `[${requestId}]` : '';
    return `${timestamp} ${level} ${ctx}${rid} ${stack || message}`;
  },
);

export const winstonConfig = (
  configService: ConfigService,
): WinstonModuleOptions => {
  const isProduction = configService.get('NODE_ENV') === 'production';

  const transports: winston.transport[] = [
    // ─── Console ──────────────────────────────────────────
    new winston.transports.Console({
      format: isProduction
        ? combine(timestamp(), errors({ stack: true }), json())
        : combine(
            colorize({ all: true }),
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            errors({ stack: true }),
            devFormat,
          ),
    }),

    // ─── Rotating File: All logs ──────────────────────────
    ...(!isProduction
      ? [
          new winston.transports.DailyRotateFile({
            filename: 'logs/application-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            format: combine(timestamp(), errors({ stack: true }), json()),
          }),
          // ─── Rotating File: Error logs only ──────────────────
          new winston.transports.DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d',
            format: combine(timestamp(), errors({ stack: true }), json()),
          }),
        ]
      : []),
  ];

  return {
    level: isProduction ? 'info' : 'debug',
    format: combine(timestamp(), errors({ stack: true })),
    transports,
    exceptionHandlers: isProduction
      ? []
      : [
          new winston.transports.DailyRotateFile({
            filename: 'logs/exceptions-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxFiles: '30d',
          }),
        ],
    rejectionHandlers: isProduction
      ? []
      : [
          new winston.transports.DailyRotateFile({
            filename: 'logs/rejections-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxFiles: '30d',
          }),
        ],
  };
};
