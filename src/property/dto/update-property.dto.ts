import { IsString, IsEnum, IsOptional, IsInt, IsPhoneNumber, IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdatePropertyDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(['land', 'house', 'apartment', 'commercial'])
  @IsOptional()
  type?: 'land' | 'house' | 'apartment' | 'commercial';

  @IsString()
  @IsOptional()
  price?: string;

  @IsString()
  @IsOptional()
  sizeNumber?: string;

  @IsEnum(['sqft', 'sqm', 'acres', 'hectares'])
  @IsOptional()
  sizeUnit?: 'sqft' | 'sqm' | 'acres' | 'hectares';

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  features?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  coordinates?: string;

  @IsString()
  @IsOptional()
  sector?: string;

  @IsString()
  @IsOptional()
  block?: string;

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  bedrooms?: number;

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  bathrooms?: number;

  @IsString()
  @IsOptional()
  ownerName?: string;

  @IsPhoneNumber('GH')
  @IsOptional()
  ownerContact?: string;

  @IsEmail()
  @IsOptional()
  ownerEmail?: string;

  @IsOptional()
  governmentId?: Buffer;

  @IsOptional()
  surveyDocuments?: Buffer;
}