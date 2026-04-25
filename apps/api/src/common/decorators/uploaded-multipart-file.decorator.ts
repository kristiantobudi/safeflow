import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the uploaded file set by FastifyFileInterceptor.
 * Use this instead of @UploadedFile() when using FastifyFileInterceptor,
 * because Fastify's built-in request.file is a method (not a property)
 * and NestJS's @UploadedFile() reads req.file which may return the raw
 * Fastify multipart method rather than our parsed file object.
 */
export const UploadedMultipartFile = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.__uploadedFile ?? null;
  },
);
