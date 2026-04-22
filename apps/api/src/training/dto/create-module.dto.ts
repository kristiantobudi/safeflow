import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateModuleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;
}