import { IsEnum, IsString, IsOptional } from 'class-validator';

export class PropertyVerificationRequest {
  @IsEnum(['approve', 'reject'])
  action: 'approve' | 'reject';

  @IsString()
  verificationNotes: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}