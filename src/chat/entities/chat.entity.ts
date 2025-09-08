export class ChatEntity {
  id: string;
  property_id: string;
  buyer_id: string;
  seller_id: string;
  buyer_name: string;
  seller_name: string;
  property_title: string;
  status: 'active' | 'archived' | 'blocked';
  last_message_at: Date;
  created_at: Date;
  updated_at: Date;
}
