import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateChatDto {
  @IsNotEmpty()
  @IsUUID()
  property_id: string;

  @IsNotEmpty()
  @IsUUID()
  seller_id: string;

  @IsNotEmpty()
  @IsString()
  property_title: string;
}
