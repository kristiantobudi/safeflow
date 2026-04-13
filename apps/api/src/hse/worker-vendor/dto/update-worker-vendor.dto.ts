import { IsString, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class UpdateWorkerVendorDto {
  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Worker name must be at least 3 characters' })
  workerName!: string;

  @IsString()
  @IsOptional()
  @MinLength(10, { message: 'Worker phone must be at least 10 characters' })
  workerPhone!: string;

  @IsString()
  @IsOptional()
  workerAddress!: string;

  @IsString()
  @IsOptional()
  workerStatus!: string;

  @IsString()
  @IsNotEmpty({ message: 'Vendor ID is required' })
  vendorId!: string;
}
