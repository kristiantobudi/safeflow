import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { FastifyRequest } from 'fastify';

export const AUDIT_KEY = 'audit_action';

/**
 * Decorator to mark a controller method for automatic audit logging
 * Usage: @AuditAction('USER_PROFILE_UPDATE', 'User')
 */
export function AuditAction(action: string, entity?: string) {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(AUDIT_KEY, { action, entity }, descriptor.value);
    return descriptor;
  };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditMeta = this.reflector.get<{ action: string; entity?: string }>(
      AUDIT_KEY,
      context.getHandler(),
    );

    if (!auditMeta) return next.handle();

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const user = (request as any).user;
    const { action, entity } = auditMeta;

    return next.handle().pipe(
      tap({
        next: (response) => {
          this.auditLogService.log({
            userId: user?.id,
            action,
            entity,
            entityId: response?.data?.id || user?.id,
            newValue: response?.data,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'] as string,
            requestId: (request as any).requestId,
            status: 'SUCCESS',
          });
        },
        error: (err) => {
          this.auditLogService.log({
            userId: user?.id,
            action: action + '_FAILED',
            entity,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'] as string,
            requestId: (request as any).requestId,
            status: 'FAILURE',
            metadata: { error: err.message },
          });
        },
      }),
    );
  }
}
