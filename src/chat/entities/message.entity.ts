export class MessageEntity {
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
