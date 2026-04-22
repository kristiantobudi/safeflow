import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateModuleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;
}