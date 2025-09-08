import { IsString, IsNotEmpty, IsUUID, IsOptional, IsEnum } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty()
  @IsUUID()
  chat_id: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(['text', 'image', 'document', 'location'])
  message_type?: 'text' | 'image' | 'document' | 'location' = 'text';

  @IsOptional()
  @IsString()
  attachment_url?: string;
}
