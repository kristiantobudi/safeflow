import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: any) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const requestId = (request as any).requestId || uuidv4();
    const isHttpException = exception instanceof HttpException;

    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;

    const message = isHttpException
      ? typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any)?.message || 'An error occurred'
      : 'Internal server error';

    const errors =
      typeof exceptionResponse === 'object'
        ? (exceptionResponse as any)?.errors ||
          ((exceptionResponse as any)?.message instanceof Array
            ? (exceptionResponse as any).message
            : undefined)
        : undefined;

    // Log error
    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} - ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
        'HttpExceptionFilter',
      );
    } else {
      this.logger.warn(
        `[${requestId}] ${request.method} ${request.url} - ${status}: ${message}`,
        'HttpExceptionFilter',
      );
    }

    const errorBody = {
      success: false,
      statusCode: status,
      message,
      errors: errors || undefined,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    if (typeof response.status === 'function') {
      response.status(status).send(errorBody);
    } else {
      const res = response as any;
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(errorBody));
    }
  }
}
