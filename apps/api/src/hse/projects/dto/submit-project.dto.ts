import { IsString, IsOptional } from 'class-validator';

export class SubmitProjectDto {
  /**
   * Ringkasan perubahan yang dilakukan pada revisi ini.
   * Wajib diisi saat re-submit dari status REVISION agar reviewer
   * tahu apa yang sudah diperbaiki.
   */
  @IsString()
  @IsOptional()
  changeNote?: string;
}
