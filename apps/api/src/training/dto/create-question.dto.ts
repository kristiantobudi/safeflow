import {
  IsString,
  IsArray,
  IsOptional,
  MinLength,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  examId!: string;

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
  options!: string[];

  @IsString()
  correctAnswer!: string;
}
