export class UserEntity {
    id: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone: string;
    role: 'buyer' | 'seller' | 'admin';
    surname?: string;
    other_names?: string;
    nationality?: string;
    date_of_birth?: Date;
    ghana_card_number?: string;
    selfie_image?: string;
    ghana_card_front_image?: string;
    ghana_card_back_image?: string;
    reset_token?: string;
    reset_expires_at?: Date;
    is_active: boolean;
    pending_verification: boolean;
    deleted_at?: Date;
    created_at: Date;
    updated_at: Date;
  }