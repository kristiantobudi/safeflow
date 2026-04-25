import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FastifyRequest } from 'fastify';

interface FastifyFileInterceptorOptions {
  maxFileSize?: number;
  allowedMimeTypes?: string[];
}

@Injectable()
export class FastifyFileInterceptor implements NestInterceptor {
  constructor(
    private readonly fieldName: string,
    private readonly options?: FastifyFileInterceptorOptions,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    if (!request.isMultipart()) {
      return next.handle();
    }

    try {
      const fields: Record<string, string> = {};
      let uploadedFile: any = null;

      for await (const part of request.parts()) {
        if (part.type === 'file') {
          // Collect chunks manually — toBuffer() may return Uint8Array or
          // behave inconsistently across @fastify/multipart versions.
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const buffer = Buffer.concat(chunks);

          if (
            this.options?.maxFileSize &&
            buffer.length > this.options.maxFileSize
          ) {
            throw new BadRequestException('File too large');
          }

          if (
            this.options?.allowedMimeTypes &&
            !this.options.allowedMimeTypes.includes(part.mimetype)
          ) {
            throw new BadRequestException('Invalid file type');
          }

          if (part.fieldname === this.fieldName) {
            uploadedFile = {
              fieldname: part.fieldname,
              originalname: part.filename ?? `upload_${Date.now()}`,
              encoding: part.encoding,
              mimetype: part.mimetype,
              size: buffer.length,
              buffer,
            };
          }
        } else {
          // Text field
          fields[part.fieldname] = (part as any).value as string;
        }
      }

      // Attach file so @UploadedFile() can read it.
      // Use a custom key to avoid collision with Fastify's built-in
      // request.file() method which is non-writable in some versions.
      (request as any).__uploadedFile = uploadedFile;
      // Also try setting request.file directly as a fallback
      try {
        (request as any).file = uploadedFile;
      } catch (_) {
        // ignore if non-writable
      }

      // Merge text fields into body so @Body() works normally
      (request as any).body = { ...((request as any).body ?? {}), ...fields };

      return next.handle();
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(err?.message || 'File upload error');
    }
  }
}

export function FastifyFile(
  fieldName: string,
  options?: FastifyFileInterceptorOptions,
) {
  return new FastifyFileInterceptor(fieldName, options);
}
