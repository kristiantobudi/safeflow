import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: any) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Attach requestId to request for tracing
    const requestId = uuidv4();
    (request as any).requestId = requestId;
    response.setHeader('X-Request-Id', requestId);

    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    this.logger.log(
      `[${requestId}] --> ${method} ${url} | IP: ${ip} | UA: ${userAgent}`,
      'HTTP',
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;
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
