import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { CreateVerificationRequestDto, QuickVerificationDto, VerificationSearchDto } from './dto/verification-request.dto';
import { VerificationEntity, VerificationReport, FraudIndicator, OwnershipRecord } from './entities/verification.entity';
import { MOCK_LAND_REGISTRY, MockLandRecord, FRAUD_PATTERNS } from './data/mock-land-registry';
import * as crypto from 'crypto';

@Injectable()
export class VerificationService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabase = new SupabaseClient(
      this.configService.get('SUPABASE_URL') || '',
      this.configService.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    );
  }

  async createVerificationRequest(createDto: CreateVerificationRequestDto): Promise<VerificationEntity> {
    const timestamp = new Date().toISOString();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days validity

    try {
      // Initial verification processing
      const verificationId = crypto.randomUUID();
      const initialScore = await this.calculateInitialScore(createDto.coordinates);
      const riskLevel = this.determineRiskLevel(initialScore);

      const verificationData = {
        id: verificationId,
        property_id: createDto.property_id || null,
        coordinates: createDto.coordinates,
        property_size: createDto.property_size,
        requester_email: createDto.requester_email,
        requester_name: createDto.requester_name,
        requester_phone: createDto.requester_phone,
        verification_purpose: createDto.verification_purpose,
        status: 'pending' as const,
        verification_score: initialScore,
        risk_level: riskLevel,
        verification_type: createDto.verification_type || 'basic',
        ownership_status: 'not_found' as const,
        legal_compliance: 'requires_review' as const,
        purchase_recommendation: 'investigate_further' as const,
        requested_at: timestamp,
        expires_at: expiryDate.toISOString(),
        created_at: timestamp,
        updated_at: timestamp,
      };

      // Store in database
      const { data, error } = await this.supabase
        .from('verifications')
        .insert(verificationData)
        .select()
        .single();

      if (error) throw error;

      // Start async processing for detailed verification
      this.processVerificationAsync(verificationId);

      return data as VerificationEntity;
    } catch (error) {
      console.error(`[${timestamp}] Error creating verification request:`, error);
      throw new BadRequestException('Failed to create verification request');
    }
  }

  async quickVerification(quickDto: QuickVerificationDto): Promise<{
    found: boolean;
    basic_info?: Partial<MockLandRecord>;
    risk_indicators?: string[];
    recommendation: string;
  }> {
    try {
      const landRecord = this.findLandByCoordinates(quickDto.coordinates);
      
      if (!landRecord) {
        return {
          found: false,
          risk_indicators: ['no_registry_data'],
          recommendation: 'No land registry data found. Proceed with full verification before purchase.',
        };
      }

      const riskIndicators = this.identifyBasicRiskIndicators(landRecord);
      const recommendation = this.generateQuickRecommendation(landRecord, riskIndicators);

      return {
        found: true,
        basic_info: {
          parcel_id: landRecord.parcel_id,
          current_owner: landRecord.current_owner,
          status: landRecord.status,
          verification_status: landRecord.verification_status,
          land_use: landRecord.land_use,
          estimated_value: landRecord.estimated_value,
        },
        risk_indicators: riskIndicators,
        recommendation,
      };
    } catch (error) {
      console.error('Error in quick verification:', error);
      throw new BadRequestException('Failed to perform quick verification');
    }
  }

  async getVerificationById(verificationId: string): Promise<VerificationEntity> {
    try {
      const { data, error } = await this.supabase
        .from('verifications')
        .select('*')
        .eq('id', verificationId)
        .single();

      if (error || !data) {
        throw new NotFoundException('Verification request not found');
      }

      return data as VerificationEntity;
    } catch (error) {
      console.error('Error fetching verification:', error);
      throw error instanceof NotFoundException ? error : new BadRequestException('Failed to fetch verification');
    }
  }

  async searchVerifications(searchDto: VerificationSearchDto): Promise<VerificationEntity[]> {
    try {
      let query = this.supabase.from('verifications').select('*');

      if (searchDto.coordinates) {
        query = query.eq('coordinates', searchDto.coordinates);
      }
      if (searchDto.property_id) {
        query = query.eq('property_id', searchDto.property_id);
      }
      if (searchDto.requester_email) {
        query = query.eq('requester_email', searchDto.requester_email);
      }
      if (searchDto.status) {
        query = query.eq('status', searchDto.status);
      }
      if (searchDto.risk_level) {
        query = query.eq('risk_level', searchDto.risk_level);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return data as VerificationEntity[];
    } catch (error) {
      console.error('Error searching verifications:', error);
      throw new BadRequestException('Failed to search verifications');
    }
  }

  private async processVerificationAsync(verificationId: string): Promise<void> {
    try {
      // Simulate processing delay
      setTimeout(async () => {
        await this.completeVerificationProcessing(verificationId);
      }, 5000); // 5 second delay for demo
    } catch (error) {
      console.error('Error in async verification processing:', error);
    }
  }

  private async completeVerificationProcessing(verificationId: string): Promise<void> {
    try {
      const verification = await this.getVerificationById(verificationId);
      const landRecord = this.findLandByCoordinates(verification.coordinates);

      if (!landRecord) {
        await this.updateVerificationStatus(verificationId, 'completed', {
          ownership_status: 'not_found',
          legal_compliance: 'requires_review',
          purchase_recommendation: 'investigate_further',
          verification_score: 20,
        });
        return;
      }

      // Generate comprehensive report
      const report = await this.generateVerificationReport(landRecord, verification);
      const fraudIndicators = this.detectFraudPatterns(landRecord);
      const verificationScore = this.calculateFinalScore(landRecord, fraudIndicators);
      const ownershipStatus = this.determineOwnershipStatus(landRecord);
      const legalCompliance = this.assessLegalCompliance(landRecord);
      const purchaseRecommendation = this.generatePurchaseRecommendation(verificationScore, fraudIndicators, landRecord);

      await this.updateVerificationStatus(verificationId, 'completed', {
        ownership_status: ownershipStatus,
        legal_compliance: legalCompliance,
        purchase_recommendation: purchaseRecommendation,
        verification_score: verificationScore,
        verification_report: report,
      });

    } catch (error) {
      console.error('Error completing verification:', error);
      await this.updateVerificationStatus(verificationId, 'failed');
    }
  }

  private async updateVerificationStatus(
    verificationId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    additionalData?: Partial<VerificationEntity>
  ): Promise<void> {
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
      ...(status === 'completed' && { completed_at: new Date().toISOString() }),
      ...additionalData,
    };

    await this.supabase
      .from('verifications')
      .update(updateData)
      .eq('id', verificationId);
  }

  private findLandByCoordinates(coordinates: string): MockLandRecord | null {
    // Simple coordinate matching - in production, this would use proper geographic queries
    return MOCK_LAND_REGISTRY.find(record => 
      this.coordinatesMatch(record.coordinates, coordinates)
    ) || null;
  }

  private coordinatesMatch(coord1: string, coord2: string): boolean {
    // Simple string comparison - in production, would use geographic tolerance
    const normalize = (coord: string) => coord.replace(/\s/g, '');
    return normalize(coord1) === normalize(coord2);
  }

  private async calculateInitialScore(coordinates: string): Promise<number> {
    const landRecord = this.findLandByCoordinates(coordinates);
    if (!landRecord) return 20; // Low score for no data
    
    let score = 50; // Base score

    if (landRecord.verification_status === 'verified') score += 30;
    if (landRecord.status === 'available') score += 10;
    if (landRecord.legal_issues.length === 0) score += 10;

    return Math.min(score, 100);
  }

  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 80) return 'low';
    if (score >= 50) return 'medium';
    return 'high';
  }

  private identifyBasicRiskIndicators(landRecord: MockLandRecord): string[] {
    const indicators: string[] = [];

    if (landRecord.status === 'disputed') indicators.push('ownership_dispute');
    if (landRecord.verification_status === 'flagged') indicators.push('flagged_record');
    if (landRecord.legal_issues.length > 0) indicators.push('legal_issues');
    if (landRecord.environmental_restrictions.length > 0) indicators.push('environmental_restrictions');

    return indicators;
  }

  private generateQuickRecommendation(landRecord: MockLandRecord, riskIndicators: string[]): string {
    if (riskIndicators.length === 0 && landRecord.status === 'available') {
      return 'Initial checks look favorable. Proceed with full verification for purchase.';
    }
    if (riskIndicators.includes('ownership_dispute')) {
      return 'WARNING: Ownership disputes detected. Do not proceed without legal consultation.';
    }
    return 'Some concerns identified. Full verification strongly recommended before purchase.';
  }

  private async generateVerificationReport(landRecord: MockLandRecord, verification: VerificationEntity): Promise<VerificationReport> {
    const fraudIndicators = this.detectFraudPatterns(landRecord);
    
    return {
      executive_summary: this.generateExecutiveSummary(landRecord, fraudIndicators),
      ownership_details: {
        current_owner: landRecord.current_owner,
        ownership_verified: landRecord.verification_status === 'verified',
        ownership_history: landRecord.ownership_history.map(h => ({
          owner_name: h.owner_name,
          ownership_period: `${h.start_date} - ${h.end_date || 'Present'}`,
          transfer_method: h.transfer_method,
          verified: true, // Simplified for demo
        })),
      },
      legal_status: {
        zoning_compliance: landRecord.zoning_classification !== '',
        title_deed_status: landRecord.title_deed_number ? 'Available' : 'Not Available',
        legal_issues: landRecord.legal_issues,
      },
      risk_assessment: {
        fraud_indicators: fraudIndicators,
        market_value_consistency: this.assessMarketValue(landRecord),
        overall_risk_score: this.calculateFinalScore(landRecord, fraudIndicators),
      },
      buyer_recommendations: {
        next_steps: this.generateNextSteps(landRecord, fraudIndicators),
        required_documents: this.getRequiredDocuments(verification.verification_type),
        estimated_costs: {
          legal_fees: 'GHS 2,000 - 5,000',
          transfer_costs: 'GHS 1,500 - 3,000',
          additional_verifications: 'GHS 500 - 1,000',
          total_estimated: 'GHS 4,000 - 9,000',
        },
        timeline_guidance: 'Allow 2-4 weeks for complete verification and documentation.',
      },
      supporting_evidence: {
        documents_verified: landRecord.ownership_history.flatMap(h => h.documents),
        geographic_validation: {
          coordinates_valid: true,
          within_ghana_borders: true,
          overlaps_detected: false,
          zoning_compliance: landRecord.zoning_classification !== '',
          environmental_restrictions: landRecord.environmental_restrictions,
        },
        cross_references: [`Land Registry: ${landRecord.parcel_id}`, 'GIS Database: Verified'],
      },
    };
  }

  private detectFraudPatterns(landRecord: MockLandRecord): FraudIndicator[] {
    const indicators: FraudIndicator[] = [];

    // Check against known fraud patterns
    FRAUD_PATTERNS.forEach(pattern => {
      if (this.matchesFraudPattern(landRecord, pattern)) {
        indicators.push({
          type: pattern.pattern,
          severity: pattern.risk_level === 'high' ? 'high' : pattern.risk_level === 'medium' ? 'medium' : 'low',
          description: pattern.description,
          recommendation: this.getRecommendationForPattern(pattern.pattern),
        });
      }
    });

    return indicators;
  }

  private matchesFraudPattern(landRecord: MockLandRecord, pattern: any): boolean {
    // Simplified pattern matching based on pattern type
    switch (pattern.pattern) {
      case 'rapid_transfers':
        return pattern.check_function(landRecord.ownership_history);
      case 'below_market_value':
        if (landRecord.last_transaction_value && landRecord.estimated_value) {
          return pattern.check_function(landRecord.last_transaction_value, landRecord.estimated_value);
        }
        return false;
      case 'missing_documents':
        const allDocs = landRecord.ownership_history.flatMap(h => h.documents);
        return pattern.check_function(allDocs);
      default:
        return false;
    }
  }

  private getRecommendationForPattern(patternType: string): string {
    const recommendations = {
      rapid_transfers: 'Investigate the reason for frequent ownership changes and verify all transfer documents.',
      below_market_value: 'Conduct independent property valuation and investigate reasons for low transaction value.',
      missing_documents: 'Obtain and verify all required legal documents before proceeding.',
    };
    return recommendations[patternType] || 'Consult with legal experts for proper assessment.';
  }

  private detectPriceAnomaly(landRecord: MockLandRecord): boolean {
    // Simplified price anomaly detection
    if (!landRecord.last_transaction_value) return false;
    const priceChange = Math.abs(landRecord.estimated_value - landRecord.last_transaction_value) / landRecord.last_transaction_value;
    return priceChange > 0.5; // More than 50% change
  }

  private calculateFinalScore(landRecord: MockLandRecord, fraudIndicators: FraudIndicator[]): number {
    let score = 50; // Base score

    // Positive factors
    if (landRecord.verification_status === 'verified') score += 20;
    if (landRecord.status === 'available') score += 15;
    if (landRecord.legal_issues.length === 0) score += 10;
    if (landRecord.title_deed_number) score += 5;

    // Negative factors
    score -= fraudIndicators.length * 10;
    if (landRecord.status === 'disputed') score -= 30;
    score -= landRecord.legal_issues.length * 5;

    return Math.max(0, Math.min(100, score));
  }

  private determineOwnershipStatus(landRecord: MockLandRecord): 'verified' | 'disputed' | 'unclear' | 'not_found' {
    if (landRecord.status === 'disputed') return 'disputed';
    if (landRecord.verification_status === 'verified') return 'verified';
    if (landRecord.verification_status === 'flagged') return 'unclear';
    return 'verified';
  }

  private assessLegalCompliance(landRecord: MockLandRecord): 'compliant' | 'non_compliant' | 'requires_review' {
    if (landRecord.legal_issues.length === 0 && landRecord.zoning_classification) return 'compliant';
    if (landRecord.legal_issues.length > 2) return 'non_compliant';
    return 'requires_review';
  }

  private generatePurchaseRecommendation(
    score: number,
    fraudIndicators: FraudIndicator[],
    landRecord: MockLandRecord
  ): 'safe_to_purchase' | 'proceed_with_caution' | 'investigate_further' | 'do_not_purchase' {
    if (landRecord.status === 'disputed' || fraudIndicators.some(f => f.severity === 'high')) {
      return 'do_not_purchase';
    }
    if (score >= 80 && fraudIndicators.length === 0) return 'safe_to_purchase';
    if (score >= 60) return 'proceed_with_caution';
    return 'investigate_further';
  }

  private generateExecutiveSummary(landRecord: MockLandRecord, fraudIndicators: FraudIndicator[]): string {
    const risk = fraudIndicators.length > 0 ? 'moderate to high' : 'low';
    const status = landRecord.status === 'available' ? 'available for purchase' : landRecord.status;
    
    return `Land verification completed for parcel ${landRecord.parcel_id}. Property is currently ${status} with ${risk} risk level. Current owner: ${landRecord.current_owner}. ${fraudIndicators.length > 0 ? 'Several risk factors identified requiring attention.' : 'No major risk factors detected.'}`;
  }

  private assessMarketValue(landRecord: MockLandRecord): boolean {
    // Simplified market value assessment
    if (!landRecord.last_transaction_value) return true;
    const deviation = Math.abs(landRecord.estimated_value - landRecord.last_transaction_value) / landRecord.estimated_value;
    return deviation < 0.3; // Within 30% is considered consistent
  }

  private generateNextSteps(landRecord: MockLandRecord, fraudIndicators: FraudIndicator[]): string[] {
    const steps: string[] = [];

    if (fraudIndicators.length > 0) {
      steps.push('Address identified risk factors with legal counsel');
    }
    
    if (!landRecord.title_deed_number) {
      steps.push('Obtain and verify title deed documentation');
    }

    if (landRecord.legal_issues.length > 0) {
      steps.push('Resolve outstanding legal issues');
    }

    steps.push('Conduct physical site inspection');
    steps.push('Engage qualified surveyor for boundary verification');
    steps.push('Obtain legal clearance before payment');

    return steps;
  }

  private getRequiredDocuments(verificationType: string): string[] {
    const basicDocs = ['Title Deed', 'Survey Plan', 'Site Plan'];
    const standardDocs = [...basicDocs, 'Indenture', 'Building Permit', 'Tax Clearance'];
    const premiumDocs = [...standardDocs, 'Environmental Impact Assessment', 'Zoning Certificate', 'Development Permit'];

    switch (verificationType) {
      case 'premium': return premiumDocs;
      case 'standard': return standardDocs;
      default: return basicDocs;
    }
  }
}
