import { VendorStatus } from '@repo/database/generated/client';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateVendorDto {
  @IsString()
  @IsNotEmpty()
  vendorName!: string;

  @IsString()
  @IsNotEmpty()
  vendorAddress!: string;

  @IsString()
  @IsNotEmpty()
  vendorPhone!: string;

  @IsString()
  @IsNotEmpty()
  vendorEmail!: string;

  @IsString()
  @IsOptional()
  vendorWebsite!: string;

  @IsString()
  @IsOptional()
  vendorLogo!: string;

  @IsString()
  @IsOptional()
  vendorDescription!: string;
}
