export class ChatResponseDto {
  id: string;
  property_id: string;
  buyer_id: string;
  seller_id: string;
  buyer_name: string;
  seller_name: string;
  property_title: string;
  status: 'active' | 'archived' | 'blocked';
  last_message_at: Date;
  unread_count: number;
  created_at: Date;
  updated_at: Date;
}

export class MessageResponseDto {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'buyer' | 'seller';
  content: string;
  message_type: 'text' | 'image' | 'document' | 'location';
  attachment_url?: string;
  is_read: boolean;
  read_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export class ChatWithMessagesDto extends ChatResponseDto {
  messages: MessageResponseDto[];
}
