export interface MockLandRecord {
  id: string;
  parcel_id: string; // GLC-AC-2024-001234 format
  coordinates: string;
  region: string;
  district: string;
  locality: string;
  property_size: string;
  land_use: 'residential' | 'commercial' | 'agricultural' | 'industrial' | 'mixed';
  
  // Ownership
  current_owner: string;
  owner_id: string;
  ownership_type: 'freehold' | 'leasehold' | 'customary' | 'government' | 'stool_land';
  title_deed_number?: string;
  
  // Status
  status: 'available' | 'allocated' | 'disputed' | 'reserved' | 'sold';
  verification_status: 'verified' | 'pending' | 'flagged' | 'expired';
  
  // Legal
  zoning_classification: string;
  environmental_restrictions: string[];
  legal_issues: string[];
  
  // Financial
  estimated_value: number;
  last_transaction_value?: number;
  last_transaction_date?: string;
  
  // History
  ownership_history: OwnershipHistory[];
  
  created_at: string;
  updated_at: string;
}

export interface OwnershipHistory {
  owner_name: string;
  owner_id: string;
  start_date: string;
  end_date?: string;
  transfer_method: 'purchase' | 'inheritance' | 'gift' | 'allocation' | 'court_order';
  transaction_value?: number;
  documents: string[];
}

// Mock Land Registry Database
export const MOCK_LAND_REGISTRY: MockLandRecord[] = [
  {
    id: "land-001",
    parcel_id: "GLC-GA-2024-001234",
    coordinates: "5.6037,-0.1870",
    region: "Greater Accra",
    district: "Accra Metropolitan",
    locality: "East Legon",
    property_size: "2.5 acres",
    land_use: "residential",
    current_owner: "Kwame Asante",
    owner_id: "GHA-123456789-1",
    ownership_type: "freehold",
    title_deed_number: "TD-GA-2024-5678",
    status: "allocated",
    verification_status: "verified",
    zoning_classification: "Residential Zone R1",
    environmental_restrictions: [],
    legal_issues: [],
    estimated_value: 250000,
    last_transaction_value: 200000,
    last_transaction_date: "2023-06-15",
    ownership_history: [
      {
        owner_name: "Kwame Asante",
        owner_id: "GHA-123456789-1",
        start_date: "2023-06-15",
        transfer_method: "purchase",
        transaction_value: 200000,
        documents: ["title_deed", "purchase_agreement", "survey_plan"]
      }
    ],
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z"
  },
  {
    id: "land-002",
    parcel_id: "GLC-AS-2024-002345",
    coordinates: "6.6885,-1.6244",
    region: "Ashanti",
    district: "Kumasi Metropolitan",
    locality: "Ahodwo",
    property_size: "10 hectares",
    land_use: "agricultural",
    current_owner: "Akosua Mensah",
    owner_id: "GHA-987654321-2",
    ownership_type: "customary",
    status: "allocated",
    verification_status: "verified",
    zoning_classification: "Agricultural Zone A1",
    environmental_restrictions: ["wetland_buffer"],
    legal_issues: [],
    estimated_value: 150000,
    ownership_history: [
      {
        owner_name: "Akosua Mensah",
        owner_id: "GHA-987654321-2",
        start_date: "2020-03-10",
        transfer_method: "inheritance",
        documents: ["customary_deed", "family_consent", "survey_plan"]
      }
    ],
    created_at: "2024-01-10T08:30:00Z",
    updated_at: "2024-01-10T08:30:00Z"
  },
  {
    id: "land-003",
    parcel_id: "GLC-GA-2024-003456",
    coordinates: "5.5500,-0.2000",
    region: "Greater Accra",
    district: "Accra Metropolitan",
    locality: "Osu",
    property_size: "0.8 acres",
    land_use: "commercial",
    current_owner: "Multiple Claimants",
    owner_id: "DISPUTED",
    ownership_type: "customary",
    status: "disputed",
    verification_status: "flagged",
    zoning_classification: "Commercial Zone C2",
    environmental_restrictions: [],
    legal_issues: ["multiple_ownership_claims", "court_case_pending"],
    estimated_value: 500000,
    ownership_history: [
      {
        owner_name: "John Doe",
        owner_id: "GHA-111222333-3",
        start_date: "2018-01-01",
        transfer_method: "purchase",
        transaction_value: 300000,
        documents: ["disputed_title_deed"]
      },
      {
        owner_name: "Jane Smith",
        owner_id: "GHA-444555666-4",
        start_date: "2019-05-15",
        transfer_method: "purchase",
        transaction_value: 350000,
        documents: ["disputed_title_deed"]
      }
    ],
    created_at: "2024-01-05T14:20:00Z",
    updated_at: "2024-01-20T16:45:00Z"
  },
  {
    id: "land-004",
    parcel_id: "GLC-NR-2024-004567",
    coordinates: "9.4034,-0.8424",
    region: "Northern",
    district: "Tamale Metropolitan",
    locality: "Tamale Central",
    property_size: "50 acres",
    land_use: "agricultural",
    current_owner: "Government of Ghana",
    owner_id: "GOV-GH-001",
    ownership_type: "government",
    status: "available",
    verification_status: "verified",
    zoning_classification: "Agricultural Zone A2",
    environmental_restrictions: ["wildlife_corridor"],
    legal_issues: [],
    estimated_value: 75000,
    ownership_history: [
      {
        owner_name: "Government of Ghana",
        owner_id: "GOV-GH-001",
        start_date: "1957-03-06",
        transfer_method: "allocation",
        documents: ["government_allocation", "survey_plan"]
      }
    ],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
];

// Fraud patterns and indicators
export const FRAUD_PATTERNS = [
  {
    pattern: "rapid_transfers",
    description: "Multiple ownership transfers within 6 months",
    risk_level: "high" as const,
    check_function: (history: OwnershipHistory[]) => {
      const recentTransfers = history.filter(h => {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return new Date(h.start_date) > sixMonthsAgo;
      });
      return recentTransfers.length > 2;
    }
  },
  {
    pattern: "below_market_value",
    description: "Transaction significantly below estimated market value",
    risk_level: "medium" as const,
    check_function: (lastValue: number, estimatedValue: number) => {
      return lastValue < (estimatedValue * 0.6); // More than 40% below market
    }
  },
  {
    pattern: "missing_documents",
    description: "Critical ownership documents missing",
    risk_level: "high" as const,
    check_function: (documents: string[]) => {
      const required = ["title_deed", "survey_plan"];
      return !required.every(doc => documents.includes(doc));
    }
  }
];
