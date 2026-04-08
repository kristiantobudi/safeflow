import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import * as Yup from 'yup';

@Injectable()
export class YupValidationPipe implements PipeTransform {
  constructor(private readonly schema: Yup.AnyObjectSchema) {}

  async transform<T>(value: T): Promise<T> {
    try {
      const validatedValue = await this.schema.validate(value, {
        abortEarly: false,
        stripUnknown: true,
      });
      return validatedValue;
    } catch (error) {
      if (error instanceof Yup.ValidationError) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: error.inner.map((err) => ({
            field: err.path,
            message: err.message,
          })),
        });
      }
      throw error;
    }
  }
}
