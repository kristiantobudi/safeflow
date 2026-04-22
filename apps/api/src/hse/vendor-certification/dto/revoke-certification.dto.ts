import { IsString, IsNotEmpty } from 'class-validator';

export class RevokeCertificationDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
