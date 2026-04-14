import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ActivityCategory, RiskLevel, StatusControl } from '@repo/database';

export class RiskAssessmentDto {
  @IsInt()
  akibat!: number;

  @IsString()
  kemungkinan!: string;

  @IsEnum(RiskLevel)
  tingkatRisiko!: RiskLevel;
}

export class CreateHiracDto {
  @IsOptional()
  @IsString()
  no?: string;

  @IsString()
  @IsNotEmpty()
  kegiatan!: string;

  @IsEnum(ActivityCategory)
  kategori!: ActivityCategory;

  @IsString()
  @IsNotEmpty()
  identifikasiBahaya!: string;

  @IsString()
  @IsNotEmpty()
  akibatRisiko!: string;

  @ValidateNested()
  @Type(() => RiskAssessmentDto)
  penilaianAwal!: RiskAssessmentDto;

  @IsBoolean()
  @IsOptional()
  risikoDapatDiterimaAwal?: boolean;

  @IsString()
  @IsOptional()
  peraturanTerkait?: string;

  @IsString()
  @IsNotEmpty()
  pengendalian!: string;

  @ValidateNested()
  @Type(() => RiskAssessmentDto)
  penilaianLanjutan!: RiskAssessmentDto;

  @IsBoolean()
  @IsOptional()
  risikoDapatDiterimaLanjutan?: boolean;

  @IsString()
  @IsOptional()
  peluang?: string;

  @IsString()
  @IsOptional()
  picId?: string;

  @IsEnum(StatusControl)
  @IsOptional()
  status?: StatusControl;
}
