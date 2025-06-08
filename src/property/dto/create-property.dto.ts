import { IsString, IsEnum, IsOptional, IsInt, IsPhoneNumber, IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePropertyDto {
  @IsString()
  title: string;

  @IsEnum(['land', 'house', 'apartment', 'commercial'])
  type: 'land' | 'house' | 'apartment' | 'commercial';

  @IsString()
  price: string;

  @IsString()
  sizeNumber: string;

  @IsEnum(['sqft', 'sqm', 'acres', 'hectares'])
  sizeUnit: 'sqft' | 'sqm' | 'acres' | 'hectares';

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  features?: string;

  @IsString()
  address: string;

  @IsString()
  coordinates: string;

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
  ownerName: string;

  @IsPhoneNumber('GH')
  ownerContact: string;

  @IsEmail()
  ownerEmail: string;

  @IsOptional()
  governmentId?: Buffer;

  @IsOptional()
  surveyDocuments?: Buffer;
}