import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * APD (Alat Pelindung Diri) sub-DTO.
 * Semua field bersifat opsional — default false jika tidak dikirim.
 */
export class CreateJsaApdDto {
  @IsBoolean()
  @IsOptional()
  safetyHelmet?: boolean;

  @IsBoolean()
  @IsOptional()
  safetyShoes?: boolean;

  @IsBoolean()
  @IsOptional()
  gloves?: boolean;

  @IsBoolean()
  @IsOptional()
  safetyGlasses?: boolean;

  @IsBoolean()
  @IsOptional()
  safetyVest?: boolean;

  @IsBoolean()
  @IsOptional()
  safetyBodyHarness?: boolean;

  @IsString()
  @IsOptional()
  others?: string;
}

export class CreateJsaDto {
  /**
   * Jenis / nama kegiatan pekerjaan.
   * Contoh: "PENGUKURAN (SURVEY)"
   */
  @IsString()
  @IsNotEmpty()
  jenisKegiatan!: string;

  /**
   * Lokasi pelaksanaan kegiatan.
   */
  @IsString()
  @IsOptional()
  lokasiKegiatan?: string;

  /**
   * Tanggal pelaksanaan kegiatan (ISO 8601).
   */
  @IsDateString()
  @IsOptional()
  tanggalDibuat?: string;

  /**
   * Referensi nomor / judul dokumen HIRARC terkait (free-text).
   */
  @IsString()
  @IsOptional()
  referensiHirarc?: string;

  /**
   * ID record Hirac yang terhubung dengan JSA ini.
   * Opsional saat pembuatan; dapat di-link setelah JSA dibuat.
   */
  @IsString()
  @IsOptional()
  hiracId?: string;

  /**
   * Nama pelaksana utama / supervisor in charge.
   */
  @IsString()
  @IsOptional()
  pelaksanaUtama?: string;

  /**
   * Nama HSE in charge.
   */
  @IsString()
  @IsOptional()
  hseInCharge?: string;

  /**
   * Data APD yang digunakan dalam kegiatan ini.
   */
  @ValidateNested()
  @Type(() => CreateJsaApdDto)
  @IsOptional()
  apd?: CreateJsaApdDto;
}
