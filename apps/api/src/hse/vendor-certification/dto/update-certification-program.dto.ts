import { IsString, IsOptional, IsInt, Min, IsArray, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCertificationProgramDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  validityDays?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  moduleIds?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
