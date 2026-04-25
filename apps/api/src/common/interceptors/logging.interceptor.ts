import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FastifyRequest, FastifyReply } from 'fastify';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: any) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();

    // Attach requestId to request for tracing
    const requestId = uuidv4();
    (request as any).requestId = requestId;
    if (typeof response.header === 'function') {
      response.header('X-Request-Id', requestId);
    }

    const { method, url, ip } = request;
    const userAgent = (request.headers['user-agent'] as string) || '';
    const startTime = Date.now();

    this.logger.log(
      `[${requestId}] --> ${method} ${url} | IP: ${ip} | UA: ${userAgent}`,
      'HTTP',
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          this.logger.log(
            `[${requestId}] <-- ${method} ${url} | ${statusCode} | ${duration}ms`,
            'HTTP',
          );
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `[${requestId}] <-- ${method} ${url} | ERROR | ${duration}ms`,
            err?.stack,
            'HTTP',
          );
        },
      }),
    );
  }
}
