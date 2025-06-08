import { IsString, IsEnum, IsOptional, IsEmail, IsPhoneNumber } from 'class-validator';

export class TransferRequestDto {
  @IsString()
  newOwnerName: string;

  @IsPhoneNumber('GH')
  newOwnerContact: string;

  @IsEmail()
  newOwnerEmail: string;

  @IsString()
  @IsOptional()
  transferReason?: string;

  @IsOptional()
  transferDocuments?: Buffer;
}