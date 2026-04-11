import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  unitKerja!: string;

  @IsString()
  @IsOptional()
  lokasiKerja?: string;

  @IsString()
  @IsOptional()
  tanggal?: string;
}
