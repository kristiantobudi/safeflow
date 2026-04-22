import { IsString, IsNotEmpty } from 'class-validator';

export class AssignVendorProgramDto {
  @IsString()
  @IsNotEmpty()
  certificationProgramId!: string;
}
