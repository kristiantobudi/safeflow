import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreatePtwDto {
  /**
   * Judul / deskripsi pekerjaan yang akan dilakukan.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  judulPekerjaan!: string;

  /**
   * ID JsaProject yang sudah berstatus APPROVED.
   * PTW hanya dapat dibuat jika JSA terkait sudah disetujui.
   */
  @IsString()
  @IsNotEmpty()
  jsaProjectId!: string;

  /**
   * Lokasi pelaksanaan pekerjaan.
   */
  @IsString()
  @IsOptional()
  lokasiPekerjaan?: string;

  /**
   * Tanggal rencana mulai pekerjaan (ISO 8601).
   * Contoh: "2026-04-20T08:00:00.000Z"
   */
  @IsDateString()
  @IsOptional()
  tanggalMulai?: string;

  /**
   * Tanggal rencana selesai pekerjaan (ISO 8601).
   * Harus setelah tanggalMulai.
   */
  @IsDateString()
  @IsOptional()
  tanggalSelesai?: string;

  /**
   * Keterangan atau catatan tambahan terkait pekerjaan.
   */
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  keteranganTambahan?: string;
}
