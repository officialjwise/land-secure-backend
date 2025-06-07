import { IsEmail, IsString, IsEnum, IsOptional, IsPhoneNumber, IsDateString } from 'class-validator';

enum Role {
  SuperAdmin = 'super_admin',
  Buyer = 'buyer',
  Seller = 'seller',
}

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  password: string;

  @IsString({ message: 'First name is required' })
  firstName: string;

  @IsString({ message: 'Last name is required' })
  lastName: string;

  @IsPhoneNumber('GH', { message: 'Invalid Ghana phone number' })
  phone: string;

  @IsEnum(Role, { message: 'Invalid role' })
  role: Role;

  // Ghana Card details for sellers (optional, validated on role)
  @IsString()
  @IsOptional()
  surname?: string;

  @IsString()
  @IsOptional()
  otherNames?: string;

  @IsString()
  @IsOptional()
  nationality?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  ghanaCardNumber?: string;

  @IsString()
  @IsOptional()
  selfieImage?: string; // Base64 or URL

  @IsString()
  @IsOptional()
  ghanaCardFrontImage?: string; // Base64 or URL

  @IsString()
  @IsOptional()
  ghanaCardBackImage?: string; // Base64 or URL
}