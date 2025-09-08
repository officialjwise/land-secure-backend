import { IsString, IsEnum, IsOptional, IsInt, IsPhoneNumber, IsEmail, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsConditionallyRequired, IsConditionallyForbidden, IsValidSizeUnit } from '../validators/conditional.validator';

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
  @IsValidSizeUnit({ message: 'Invalid size unit for the selected property type' })
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
  @IsConditionallyRequired(
    (obj: CreatePropertyDto) => obj.type === 'house' || obj.type === 'apartment',
    { message: 'Bedrooms is required for houses and apartments' }
  )
  @IsConditionallyForbidden(
    (obj: CreatePropertyDto) => obj.type === 'land' || obj.type === 'commercial',
    { message: 'Bedrooms is not allowed for land and commercial properties' }
  )
  bedrooms?: number;

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsConditionallyRequired(
    (obj: CreatePropertyDto) => obj.type === 'house' || obj.type === 'apartment',
    { message: 'Bathrooms is required for houses and apartments' }
  )
  @IsConditionallyForbidden(
    (obj: CreatePropertyDto) => obj.type === 'land' || obj.type === 'commercial',
    { message: 'Bathrooms is not allowed for land and commercial properties' }
  )
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

  @IsOptional()
  propertyImage?: Buffer;
}