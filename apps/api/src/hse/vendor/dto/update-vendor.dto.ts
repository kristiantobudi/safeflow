import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateVendorDto {
  @IsString()
  @IsOptional()
  vendorName!: string;

  @IsString()
  @IsOptional()
  vendorAddress!: string;

  @IsString()
  @IsOptional()
  vendorPhone!: string;

  @IsString()
  @IsOptional()
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
