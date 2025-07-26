export interface VerificationEntity {
  id: string;
  property_id?: string; // Link to existing property if applicable
  coordinates: string;
  property_size?: string;
  requester_email: string;
  requester_name: string;
  requester_phone?: string;
  verification_purpose: 'purchase_consideration' | 'due_diligence' | 'general_inquiry';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  verification_score: number; // 0-100
  risk_level: 'low' | 'medium' | 'high';
  verification_type: 'basic' | 'standard' | 'premium';
  
  // Results
  ownership_status: 'verified' | 'disputed' | 'unclear' | 'not_found';
  legal_compliance: 'compliant' | 'non_compliant' | 'requires_review';
  purchase_recommendation: 'safe_to_purchase' | 'proceed_with_caution' | 'investigate_further' | 'do_not_purchase';
  
  // Timestamps
  requested_at: string;
  completed_at?: string;
  expires_at: string; // Verification validity period
  
  // Report
  verification_report?: VerificationReport;
  
  created_at: string;
  updated_at: string;
}

export interface VerificationReport {
  executive_summary: string;
  ownership_details: {
    current_owner: string;
    ownership_verified: boolean;
    ownership_history: OwnershipRecord[];
  };
  legal_status: {
    zoning_compliance: boolean;
    title_deed_status: string;
    legal_issues: string[];
  };
  risk_assessment: {
    fraud_indicators: FraudIndicator[];
    market_value_consistency: boolean;
    overall_risk_score: number;
  };
  buyer_recommendations: {
    next_steps: string[];
    required_documents: string[];
    estimated_costs: CostEstimate;
    timeline_guidance: string;
  };
  supporting_evidence: {
    documents_verified: string[];
    geographic_validation: GeographicValidation;
    cross_references: string[];
  };
}

export interface OwnershipRecord {
  owner_name: string;
  ownership_period: string;
  transfer_method: string;
  verified: boolean;
}

export interface FraudIndicator {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
}

export interface CostEstimate {
  legal_fees: string;
  transfer_costs: string;
  additional_verifications: string;
  total_estimated: string;
}

export interface GeographicValidation {
  coordinates_valid: boolean;
  within_ghana_borders: boolean;
  overlaps_detected: boolean;
  zoning_compliance: boolean;
  environmental_restrictions: string[];
}
