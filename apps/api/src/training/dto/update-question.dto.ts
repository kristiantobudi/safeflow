import {
  IsString,
  IsArray,
  IsOptional,
  MinLength,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class UpdateQuestionDto {
  @IsString()
  @IsOptional()
  question?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @IsOptional()
  options?: string[];

  @IsString()
  @IsOptional()
  correctAnswer?: string;
}