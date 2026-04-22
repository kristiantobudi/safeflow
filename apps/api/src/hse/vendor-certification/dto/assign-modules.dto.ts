import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export class AssignModulesDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  moduleIds!: string[];
}
