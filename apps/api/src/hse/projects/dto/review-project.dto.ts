import { IsString, IsOptional } from 'class-validator';

export class ReviewProjectDto {
  @IsString()
  @IsOptional()
  note?: string;
}
