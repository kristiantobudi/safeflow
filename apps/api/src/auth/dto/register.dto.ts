import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';
import * as Yup from 'yup';

// Class-validator DTO (for NestJS pipes)
export class RegisterDto {
  @IsString()
  @MinLength(3, { message: 'First name must be at least 3 characters' })
  firstName!: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail({}, { message: 'Please provide a valid email' })
  email!: string;

  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(20, { message: 'Username must not exceed 20 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  username!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain uppercase, lowercase, number, and special character',
  })
  password!: string;

  @IsOptional()
  @IsString()
  invitationToken?: string;
}

// Yup schema (for manual validation use)
export const registerSchema = Yup.object({
  firstName: Yup.string()
    .min(3, 'First name min 3 chars')
    .required('First name is required'),
  lastName: Yup.string().optional(),
  email: Yup.string().email('Invalid email').required('Email is required'),
  username: Yup.string()
    .min(3, 'Username min 3 chars')
    .max(20, 'Username max 20 chars')
    .matches(/^[a-zA-Z0-9_]+$/, 'Username alphanumeric only')
    .required('Username is required'),
  password: Yup.string()
    .min(8, 'Password min 8 chars')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/,
      'Password must contain uppercase, lowercase, number, and special character',
    )
    .required('Password is required'),
});
