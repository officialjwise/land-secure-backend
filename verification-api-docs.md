# Land Verification API Documentation

## Overview

The Land Verification system provides comprehensive property verification services for potential buyers. It includes both quick verification checks and detailed verification reports.

## Base URL
```
http://localhost:3000
```

## Authentication

Most endpoints require JWT authentication. Include the bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Verification Endpoints

### 1. Quick Verification (Public)

**Endpoint:** `POST /verification/quick-check`  
**Description:** Perform a quick verification check without authentication  
**Authentication:** None required

**Request Body:**
```json
{
  "coordinates": "5.6037,-0.1870",
  "property_size": "2 acres"
}
```

**Response:**
```json
{
  "status_code": 200,
  "total": 1,
  "page": null,
  "limit": null,
  "data": {
    "found": true,
    "basic_info": {
      "parcel_id": "GLC-AC-2024-001234",
      "current_owner": "John Doe",
      "status": "available",
      "verification_status": "verified",
      "land_use": "residential",
      "estimated_value": 250000
    },
    "risk_indicators": [],
    "recommendation": "Initial checks look favorable. Proceed with full verification for purchase."
  }
}
```

### 2. Create Verification Request

**Endpoint:** `POST /verification/request`  
**Description:** Create a comprehensive verification request  
**Authentication:** Required

**Request Body:**
```json
{
  "coordinates": "5.6037,-0.1870",
  "property_size": "2 acres",
  "property_id": "existing-property-uuid",
  "requester_email": "buyer@example.com",
  "requester_name": "Jane Buyer",
  "requester_phone": "+233240123456",
  "verification_purpose": "purchase_consideration",
  "verification_type": "standard",
  "additional_notes": "Interested in purchasing for residential development"
}
```

**Verification Purpose Options:**
- `purchase_consideration` - Buyer considering purchase
- `due_diligence` - Legal/financial due diligence
- `general_inquiry` - General information request

**Verification Type Options:**
- `basic` - Basic ownership and status check
- `standard` - Comprehensive verification with legal review
- `premium` - Full verification with environmental and development assessments

**Response:**
```json
{
  "status_code": 201,
  "total": 1,
  "page": null,
  "limit": null,
  "data": {
    "id": "verification-uuid",
    "coordinates": "5.6037,-0.1870",
    "requester_email": "buyer@example.com",
    "status": "pending",
    "verification_score": 65,
    "risk_level": "medium",
    "verification_type": "standard",
    "requested_at": "2024-07-26T10:00:00Z",
    "expires_at": "2024-08-25T10:00:00Z"
  }
}
```

### 3. Get Verification Details

**Endpoint:** `GET /verification/{id}`  
**Description:** Get detailed verification results  
**Authentication:** Required

**Response:**
```json
{
  "status_code": 200,
  "total": 1,
  "page": null,
  "limit": null,
  "data": {
    "id": "verification-uuid",
    "status": "completed",
    "verification_score": 85,
    "risk_level": "low",
    "ownership_status": "verified",
    "legal_compliance": "compliant",
    "purchase_recommendation": "safe_to_purchase",
    "verification_report": {
      "executive_summary": "Land verification completed...",
      "ownership_details": {
        "current_owner": "John Doe",
        "ownership_verified": true,
        "ownership_history": [...]
      },
      "legal_status": {
        "zoning_compliance": true,
        "title_deed_status": "Available",
        "legal_issues": []
      },
      "risk_assessment": {
        "fraud_indicators": [],
        "market_value_consistency": true,
        "overall_risk_score": 85
      },
      "buyer_recommendations": {
        "next_steps": ["Conduct physical site inspection", "Engage qualified surveyor"],
        "required_documents": ["Title Deed", "Survey Plan"],
        "estimated_costs": {
          "legal_fees": "GHS 2,000 - 5,000",
          "total_estimated": "GHS 4,000 - 9,000"
        }
      }
    }
  }
}
```

### 4. Search Verifications

**Endpoint:** `GET /verification/search`  
**Description:** Search verification requests  
**Authentication:** Required

**Query Parameters:**
- `coordinates` - Filter by coordinates
- `property_id` - Filter by property ID
- `requester_email` - Filter by requester email
- `status` - Filter by status (pending, in_progress, completed, failed)
- `risk_level` - Filter by risk level (low, medium, high)

**Example:** `GET /verification/search?status=completed&risk_level=low`

### 5. Get Property Verifications

**Endpoint:** `GET /verification/property/{propertyId}`  
**Description:** Get all verifications for a specific property  
**Authentication:** Required

### 6. Get User Verifications

**Endpoint:** `GET /verification/user/{email}`  
**Description:** Get all verifications for a specific user  
**Authentication:** Required

## Property Integration Endpoints

### Get Property Verification Status

**Endpoint:** `GET /property/{propertyId}/verification-status`  
**Description:** Get verification summary for a property  
**Authentication:** None required

**Response:**
```json
{
  "status_code": 200,
  "total": 1,
  "page": null,
  "limit": null,
  "data": {
    "property": {
      "id": "property-uuid",
      "title": "2-Acre Residential Land",
      "coordinates": "5.6037,-0.1870",
      "status": "active"
    },
    "verification_summary": {
      "verification_count": 3,
      "avg_verification_score": 82,
      "risk_levels": {
        "low": 2,
        "medium": 1
      },
      "buyer_interest_level": "medium",
      "latest_verification": {
        "id": "latest-verification-uuid",
        "status": "completed",
        "verification_score": 85,
        "completed_at": "2024-07-25T15:30:00Z"
      }
    }
  }
}
```

## Status Codes and Error Handling

### Success Responses
- `200` - Success
- `201` - Created

### Error Responses
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found
- `500` - Internal Server Error

### Error Response Format
```json
{
  "status_code": 400,
  "total": null,
  "page": null,
  "limit": null,
  "data": {
    "message": "Validation failed",
    "error": "Bad Request"
  }
}
```

## Verification Workflow

1. **Quick Check** - Use quick verification for immediate basic information
2. **Full Request** - Create detailed verification request for purchase decisions
3. **Processing** - System processes verification (5-30 minutes depending on type)
4. **Results** - Retrieve comprehensive verification report
5. **Decision** - Use recommendations to guide purchase decision

## Integration with Mobile App

The verification system is designed to integrate with the mobile app frontend:

1. **Property Listings** - Show verification status badges on property cards
2. **Property Details** - Display verification summary and buyer interest level
3. **Verification Flow** - Guide users through verification request process
4. **Report Viewing** - Present verification reports in user-friendly format
5. **Notifications** - Alert users when verification is complete

## Database Setup

Before using the verification endpoints, run the SQL script to create the database table:

```sql
-- Run the contents of database/verifications.sql in your Supabase SQL editor
```

## Security Notes

- Verification reports contain sensitive data and require authentication
- Quick verification provides limited public information only
- Row Level Security (RLS) policies ensure users only see their own verifications
- Admin users can access all verification data for oversight
