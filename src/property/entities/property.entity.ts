export class PropertyEntity {
  id: string;
  title: string;
  type: 'land' | 'house' | 'apartment' | 'commercial';
  price: string;
  size: string;
  description?: string;
  features?: string;
  address: string;
  coordinates: string;
  sector?: string;
  block?: string;
  bedrooms?: number;
  bathrooms?: number;
  owner_id: string;
  owner_name: string;
  owner_contact: string;
  owner_email: string;
  status: 'pending' | 'verified' | 'rejected';
  submitted_date: string;
  verified_date?: string;
  rejected_date?: string;
  rejection_reason?: string;
  verification_notes?: string;
  verified_by?: string;
  rejected_by?: string;
  last_updated: string;
  deleted_at?: string;
  documents: { name: string; url: string }[];
  transfer_status?: 'pending' | 'verified' | 'rejected'; // New field for transfer state
  transfer_request_date?: string; // When transfer was requested
  transfer_verified_date?: string; // When transfer was verified
  transfer_rejected_date?: string; // When transfer was rejected
  transfer_rejection_reason?: string; // Reason for transfer rejection
  new_owner_id?: string; // New owner after transfer
  new_owner_name?: string; // New owner name
  new_owner_contact?: string; // New owner contact
  new_owner_email?: string; // New owner email
  transfer_documents?: { name: string; url: string }[]; // Transfer documents
}