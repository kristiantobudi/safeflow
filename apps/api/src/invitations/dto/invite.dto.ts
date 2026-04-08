import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '@repo/database';

export class SingleInviteDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  email!: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Role harus USER, ADMIN, atau MODERATOR' })
  role?: Role;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Catatan maksimal 300 karakter' })
  note?: string;
}

export class BulkInviteDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Minimal 1 undangan' })
  @ArrayMaxSize(50, { message: 'Maksimal 50 undangan sekaligus' })
  @ValidateNested({ each: true })
  @Type(() => SingleInviteDto)
  invites!: SingleInviteDto[];
}
