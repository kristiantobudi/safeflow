import { IsString, IsNotEmpty, MinLength, IsOptional, IsEnum } from 'class-validator';
import { VendorStatus } from '@repo/database/generated/client';

export class UpdateWorkerVendorDto {
  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Worker name must be at least 3 characters' })
  name!: string;

  @IsString()
  @IsOptional()
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
  @IsOptional()
  vendorId?: string;
}
