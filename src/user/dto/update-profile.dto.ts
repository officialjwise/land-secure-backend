import { IsString, IsOptional, IsEmail, IsPhoneNumber } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsPhoneNumber('GH')
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  selfieImage?: Buffer;

  @IsOptional()
  ghanaCardFrontImage?: Buffer;

  @IsOptional()
  ghanaCardBackImage?: Buffer;
}