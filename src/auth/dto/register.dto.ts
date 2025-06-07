import { IsString, IsOptional, IsEmail, IsEnum, Matches, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

enum Role {
  BUYER = 'buyer',
  SELLER = 'seller',
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,128}$/, {
    message: 'Password must be 8-128 characters long and contain letters, numbers, and special characters',
  })
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @Matches(/^\+233\d{9}$/, { message: 'Phone must be a valid Ghanaian number starting with +233' })
  phone: string;

  @IsEnum(Role)
  role: string;

  @IsString()
  @IsOptional()
  surname?: string;

  @IsString()
  @IsOptional()
  otherNames?: string;

  @IsString()
  @IsOptional()
  nationality?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Date of birth must be a valid ISO date (e.g., YYYY-MM-DD)' })
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  ghanaCardNumber?: string;

  @IsOptional()
  @Type(() => Buffer)
  selfieImage?: Buffer;

  @IsOptional()
  @Type(() => Buffer)
  ghanaCardFrontImage?: Buffer;

  @IsOptional()
  @Type(() => Buffer)
  ghanaCardBackImage?: Buffer;
}