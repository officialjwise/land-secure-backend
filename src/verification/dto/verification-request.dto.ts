import { IsString, IsEmail, IsEnum, IsOptional, IsPhoneNumber, Matches } from 'class-validator';

export class CreateVerificationRequestDto {
  @IsString()
  coordinates: string;

  @IsString()
  @IsOptional()
  property_size?: string;

  @IsString()
  @IsOptional()
  property_id?: string; // If verifying an existing listed property

  @IsEmail()
  requester_email: string;

  @IsString()
  requester_name: string;

  @IsPhoneNumber('GH')
  @IsOptional()
  requester_phone?: string;

  @IsEnum(['purchase_consideration', 'due_diligence', 'general_inquiry'])
  verification_purpose: 'purchase_consideration' | 'due_diligence' | 'general_inquiry';

  @IsEnum(['basic', 'standard', 'premium'])
  @IsOptional()
  verification_type?: 'basic' | 'standard' | 'premium';

  @IsString()
  @IsOptional()
  additional_notes?: string;
}

export class QuickVerificationDto {
  @IsString()
  @Matches(/^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/, {
    message: 'Coordinates must be in format "latitude,longitude"'
  })
  coordinates: string;

  @IsString()
  @IsOptional()
  property_size?: string;
}

export class VerificationSearchDto {
  @IsString()
  @IsOptional()
  coordinates?: string;

  @IsString()
  @IsOptional()
  property_id?: string;

  @IsEmail()
  @IsOptional()
  requester_email?: string;

  @IsEnum(['pending', 'in_progress', 'completed', 'failed'])
  @IsOptional()
  status?: string;

  @IsEnum(['low', 'medium', 'high'])
  @IsOptional()
  risk_level?: string;
}
