import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateExamDto {
  @IsString()
  moduleId!: string;

  @IsNumber()
  @Min(1)
  duration!: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxAttempts?: number;
}