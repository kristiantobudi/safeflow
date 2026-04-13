import { VendorStatus } from '@repo/database/generated/client';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';

export class CreateWorkerVendorDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Worker name must be at least 3 characters' })
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Worker phone must be at least 10 characters' })
  phone!: string;

  @IsString()
  @IsOptional()
  address!: string;

  @IsString()
  @IsOptional()
  @IsEnum(VendorStatus)
  status!: VendorStatus;

  @IsString()
  @IsNotEmpty({ message: 'Vendor ID is required' })
  vendorId!: string;
}
