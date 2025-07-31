import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertyVerificationRequest } from './dto/property-verification-request.dto';
import { TransferRequestDto } from './dto/transfer-request.dto';
import { TransferVerificationRequest } from './dto/transfer-verification-request.dto';
import { PropertyEntity } from './entities/property.entity';
import * as crypto from 'crypto';

@Injectable()
export class PropertyService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabase = new SupabaseClient(
      this.configService.get('SUPABASE_URL') || '',
      this.configService.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    );
  }

  async createProperty(createPropertyDto: CreatePropertyDto, userId: string): Promise<PropertyEntity> {
    const timestamp = new Date().toISOString();
    try {
      const user = await this.supabase.from('users').select('role').eq('id', userId).single();
      if (user.data?.role !== 'seller' && user.data?.role !== 'admin') {
        throw new UnauthorizedException('Only sellers and admins can create properties');
      }

      // Validate and clean property data based on type
      const cleanedPropertyData = this.validateAndCleanPropertyData(createPropertyDto);

      const size = `${cleanedPropertyData.sizeNumber} ${cleanedPropertyData.sizeUnit}`;
      const documents = await this.uploadDocuments(cleanedPropertyData);

      const { data, error } = await this.supabase.from('properties').insert({
        title: cleanedPropertyData.title,
        type: cleanedPropertyData.type,
        price: cleanedPropertyData.price,
        size,
        description: cleanedPropertyData.description,
        features: cleanedPropertyData.features,
        address: cleanedPropertyData.address,
        coordinates: cleanedPropertyData.coordinates,
        sector: cleanedPropertyData.sector,
        block: cleanedPropertyData.block,
        bedrooms: cleanedPropertyData.bedrooms,
        bathrooms: cleanedPropertyData.bathrooms,
        owner_id: userId,
        owner_name: cleanedPropertyData.ownerName,
        owner_contact: cleanedPropertyData.ownerContact,
        owner_email: cleanedPropertyData.ownerEmail,
        status: 'pending',
        submitted_date: timestamp,
        last_updated: timestamp,
        documents,
      }).select().single();

      if (error) throw error;
      console.log(`[${timestamp}] Created property ${data.id} by user ${userId}`);
      return data as PropertyEntity;
    } catch (error) {
      console.error(`[${timestamp}] Error creating property:`, error);
      throw error instanceof UnauthorizedException ? error : new BadRequestException('Failed to create property');
    }
  }

  async uploadDocuments(createPropertyDto: CreatePropertyDto | UpdatePropertyDto | TransferRequestDto): Promise<{ name: string; url: string }[]> {
    const documents: { name: string; url: string }[] = [];
    if ('governmentId' in createPropertyDto && createPropertyDto.governmentId) {
      const url = await this.uploadFile(createPropertyDto.governmentId, `documents/gov-id/${crypto.randomUUID()}.jpg`);
      documents.push({ name: 'governmentId.jpg', url });
    }
    if ('surveyDocuments' in createPropertyDto && createPropertyDto.surveyDocuments) {
      const url = await this.uploadFile(createPropertyDto.surveyDocuments, `documents/survey/${crypto.randomUUID()}.jpg`);
      documents.push({ name: 'surveyDocuments.jpg', url });
    }
    if ('transferDocuments' in createPropertyDto && createPropertyDto.transferDocuments) {
      const url = await this.uploadFile(createPropertyDto.transferDocuments, `documents/transfer/${crypto.randomUUID()}.jpg`);
      documents.push({ name: 'transferDocuments.jpg', url });
    }
    return documents;
  }

  async uploadFile(fileBuffer: Buffer, path: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from('property-documents')
      .upload(path, fileBuffer, { upsert: true, contentType: 'image/jpeg' });
    if (error) throw error;
    const { data: urlData } = this.supabase.storage.from('property-documents').getPublicUrl(path);
    return urlData.publicUrl;
  }

  async getPropertyById(propertyId: string): Promise<PropertyEntity> {
    const timestamp = new Date().toISOString();
    try {
      const { data, error } = await this.supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .is('deleted_at', null)
        .single();
      if (error) throw error;
      if (!data) throw new BadRequestException('Property not found');
      console.log(`[${timestamp}] Retrieved property ${propertyId}`);
      return data as PropertyEntity;
    } catch (error) {
      console.error(`[${timestamp}] Error retrieving property ${propertyId}:`, error);
      throw new BadRequestException('Failed to retrieve property');
    }
  }

  async updateProperty(propertyId: string, updatePropertyDto: UpdatePropertyDto, userId: string): Promise<PropertyEntity> {
    const timestamp = new Date().toISOString();
    try {
      const user = await this.supabase.from('users').select('role').eq('id', userId).single();
      if (user.data?.role !== 'seller') throw new UnauthorizedException('Only sellers can update properties');

      const property = await this.getPropertyById(propertyId);
      if (property.owner_id !== userId) throw new UnauthorizedException('Not authorized to update this property');
      if (property.status === 'verified') throw new BadRequestException('Verified properties require re-verification');

      const size = updatePropertyDto.sizeNumber && updatePropertyDto.sizeUnit ? `${updatePropertyDto.sizeNumber} ${updatePropertyDto.sizeUnit}` : property.size;
      const documents = await this.uploadDocuments(updatePropertyDto);

      const { data, error } = await this.supabase
        .from('properties')
        .update({
          title: updatePropertyDto.title ?? property.title,
          type: updatePropertyDto.type ?? property.type,
          price: updatePropertyDto.price ?? property.price,
          size,
          description: updatePropertyDto.description ?? property.description,
          features: updatePropertyDto.features ?? property.features,
          address: updatePropertyDto.address ?? property.address,
          coordinates: updatePropertyDto.coordinates ?? property.coordinates,
          sector: updatePropertyDto.sector ?? property.sector,
          block: updatePropertyDto.block ?? property.block,
          bedrooms: updatePropertyDto.bedrooms ?? property.bedrooms,
          bathrooms: updatePropertyDto.bathrooms ?? property.bathrooms,
          owner_name: updatePropertyDto.ownerName ?? property.owner_name,
          owner_contact: updatePropertyDto.ownerContact ?? property.owner_contact,
          owner_email: updatePropertyDto.ownerEmail ?? property.owner_email,
          documents: [...property.documents, ...documents],
          status: 'pending',
          last_updated: timestamp,
        })
        .eq('id', propertyId)
        .select()
        .single();

      if (error) throw error;
      console.log(`[${timestamp}] Updated property ${propertyId} by user ${userId}`);
      return data as PropertyEntity;
    } catch (error) {
      console.error(`[${timestamp}] Error updating property ${propertyId}:`, error);
      throw error instanceof UnauthorizedException || error instanceof BadRequestException ? error : new BadRequestException('Failed to update property');
    }
  }

  async deleteProperty(propertyId: string, userId: string): Promise<{ message: string }> {
    const timestamp = new Date().toISOString();
    try {
      const user = await this.supabase.from('users').select('role').eq('id', userId).single();
      if (user.data?.role !== 'seller') throw new UnauthorizedException('Only sellers can delete properties');

      const property = await this.getPropertyById(propertyId);
      if (property.owner_id !== userId) throw new UnauthorizedException('Not authorized to delete this property');

      const { data, error } = await this.supabase
        .from('properties')
        .update({ deleted_at: timestamp, last_updated: timestamp })
        .eq('id', propertyId)
        .select()
        .single();

      if (error) throw error;
      console.log(`[${timestamp}] Deleted property ${propertyId} by user ${userId}`);
      return { message: 'Property soft deleted successfully' };
    } catch (error) {
      console.error(`[${timestamp}] Error deleting property ${propertyId}:`, error);
      throw error instanceof UnauthorizedException || error instanceof BadRequestException ? error : new BadRequestException('Failed to delete property');
    }
  }

  async getProperties(query: { search?: string; type?: string; status?: string; page?: number; limit?: number }): Promise<{ properties: PropertyEntity[]; total: number; page: number; limit: number }> {
    const timestamp = new Date().toISOString();
    try {
      const { page = 1, limit = 10, search, type, status } = query;
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      let queryBuilder = this.supabase
        .from('properties')
        .select('*', { count: 'exact' })
        .range(start, end)
        .is('deleted_at', null);

      if (search) {
        queryBuilder = queryBuilder.ilike('title', `%${search}%`)
          .or(`owner_name.ilike.%${search}%,id.ilike.%${search}%`);
      }
      if (type && type !== 'all') queryBuilder = queryBuilder.eq('type', type);
      if (status && status !== 'all') queryBuilder = queryBuilder.eq('status', status);

      const { data, error, count } = await queryBuilder;
      if (error) throw error;
      console.log(`[${timestamp}] Retrieved ${data.length} properties with query ${JSON.stringify(query)}`);
      return {
        properties: data as PropertyEntity[],
        total: count || 0,
        page,
        limit,
      };
    } catch (error) {
      console.error(`[${timestamp}] Error retrieving properties:`, error);
      throw new BadRequestException('Failed to retrieve properties');
    }
  }

  async getVerificationProperties(query: { status: string; search?: string; type?: string; page?: number; limit?: number }): Promise<{ properties: PropertyEntity[]; total: number; page: number; limit: number }> {
    const timestamp = new Date().toISOString();
    try {
      const { page = 1, limit = 10, status, search, type } = query;
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      if (!['pending', 'verified', 'rejected'].includes(status)) throw new BadRequestException('Invalid status');

      let queryBuilder = this.supabase
        .from('properties')
        .select('*', { count: 'exact' })
        .range(start, end)
        .eq('status', status)
        .is('deleted_at', null);

      if (search) {
        queryBuilder = queryBuilder.ilike('title', `%${search}%`)
          .or(`owner_name.ilike.%${search}%,id.ilike.%${search}%`);
      }
      if (type && type !== 'all') queryBuilder = queryBuilder.eq('type', type);

      const { data, error, count } = await queryBuilder;
      if (error) throw error;
      console.log(`[${timestamp}] Retrieved ${data.length} verification properties with query ${JSON.stringify(query)}`);
      return {
        properties: data as PropertyEntity[],
        total: count || 0,
        page,
        limit,
      };
    } catch (error) {
      console.error(`[${timestamp}] Error retrieving verification properties:`, error);
      throw new BadRequestException('Failed to retrieve verification properties');
    }
  }

  async verifyProperty(propertyId: string, verificationRequest: PropertyVerificationRequest, adminId: string): Promise<PropertyEntity> {
    const timestamp = new Date().toISOString();
    try {
      const admin = await this.supabase.from('users').select('role').eq('id', adminId).single();
      if (admin.data?.role !== 'admin') throw new UnauthorizedException('Only admins can verify properties');

      const property = await this.getPropertyById(propertyId);
      if (property.status !== 'pending') throw new BadRequestException('Only pending properties can be verified');

      const updateData = {
        status: verificationRequest.action === 'approve' ? 'verified' : 'rejected',
        verification_notes: verificationRequest.verificationNotes,
        ...(verificationRequest.action === 'approve' ? { verified_date: timestamp, verified_by: adminId } : { rejected_date: timestamp, rejected_by: adminId, rejection_reason: verificationRequest.rejectionReason }),
        last_updated: timestamp,
      };

      const { data, error } = await this.supabase
        .from('properties')
        .update(updateData)
        .eq('id', propertyId)
        .select()
        .single();

      if (error) throw error;
      console.log(`[${timestamp}] ${verificationRequest.action} property ${propertyId} by admin ${adminId}`);
      return data as PropertyEntity;
    } catch (error) {
      console.error(`[${timestamp}] Error verifying property ${propertyId}:`, error);
      throw error instanceof UnauthorizedException || error instanceof BadRequestException ? error : new BadRequestException('Failed to verify property');
    }
  }

  async quickApproveProperty(propertyId: string, adminId: string): Promise<PropertyEntity> {
    const timestamp = new Date().toISOString();
    try {
      const admin = await this.supabase.from('users').select('role').eq('id', adminId).single();
      if (admin.data?.role !== 'admin') throw new UnauthorizedException('Only admins can approve properties');

      const { data, error } = await this.supabase
        .from('properties')
        .update({
          status: 'verified',
          verification_notes: 'Quick approval',
          verified_date: timestamp,
          verified_by: adminId,
          last_updated: timestamp,
        })
        .eq('id', propertyId)
        .select()
        .single();

      if (error) throw error;
      console.log(`[${timestamp}] Quick approved property ${propertyId} by admin ${adminId}`);
      return data as PropertyEntity;
    } catch (error) {
      console.error(`[${timestamp}] Error quick approving property ${propertyId}:`, error);
      throw error instanceof UnauthorizedException || error instanceof BadRequestException ? error : new BadRequestException('Failed to quick approve property');
    }
  }

  async quickRejectProperty(propertyId: string, adminId: string): Promise<PropertyEntity> {
    const timestamp = new Date().toISOString();
    try {
      const admin = await this.supabase.from('users').select('role').eq('id', adminId).single();
      if (admin.data?.role !== 'admin') throw new UnauthorizedException('Only admins can reject properties');

      const { data, error } = await this.supabase
        .from('properties')
        .update({
          status: 'rejected',
          rejection_reason: 'Quick rejection',
          rejected_date: timestamp,
          rejected_by: adminId,
          last_updated: timestamp,
        })
        .eq('id', propertyId)
        .select()
        .single();

      if (error) throw error;
      console.log(`[${timestamp}] Quick rejected property ${propertyId} by admin ${adminId}`);
      return data as PropertyEntity;
    } catch (error) {
      console.error(`[${timestamp}] Error quick rejecting property ${propertyId}:`, error);
      throw error instanceof UnauthorizedException || error instanceof BadRequestException ? error : new BadRequestException('Failed to quick reject property');
    }
  }

  async getPropertyDocuments(propertyId: string): Promise<{ name: string; url: string }[]> {
    const timestamp = new Date().toISOString();
    try {
      const property = await this.getPropertyById(propertyId);
      console.log(`[${timestamp}] Retrieved documents for property ${propertyId}`);
      return property.documents;
    } catch (error) {
      console.error(`[${timestamp}] Error retrieving documents for property ${propertyId}:`, error);
      throw new BadRequestException('Failed to retrieve property documents');
    }
  }

  async requestPropertyTransfer(propertyId: string, transferRequest: TransferRequestDto, userId: string): Promise<PropertyEntity> {
    const timestamp = new Date().toISOString();
    try {
      const user = await this.supabase.from('users').select('role').eq('id', userId).single();
      if (user.data?.role !== 'seller') throw new UnauthorizedException('Only sellers can initiate transfers');

      const property = await this.getPropertyById(propertyId);
      if (property.owner_id !== userId) throw new UnauthorizedException('Not authorized to transfer this property');
      if (property.status !== 'verified') throw new BadRequestException('Only verified properties can be transferred');

      const transferDocuments = await this.uploadDocuments(transferRequest);

      const { data, error } = await this.supabase
        .from('properties')
        .update({
          transfer_status: 'pending',
          transfer_request_date: timestamp,
          new_owner_name: transferRequest.newOwnerName,
          new_owner_contact: transferRequest.newOwnerContact,
          new_owner_email: transferRequest.newOwnerEmail,
          transfer_reason: transferRequest.transferReason,
          transfer_documents: transferDocuments,
          last_updated: timestamp,
        })
        .eq('id', propertyId)
        .select()
        .single();

      if (error) throw error;
      console.log(`[${timestamp}] Requested transfer for property ${propertyId} by user ${userId}`);
      return data as PropertyEntity;
    } catch (error) {
      console.error(`[${timestamp}] Error requesting transfer for property ${propertyId}:`, error);
      throw error instanceof UnauthorizedException || error instanceof BadRequestException ? error : new BadRequestException('Failed to request transfer');
    }
  }

  async verifyPropertyTransfer(propertyId: string, verificationRequest: TransferVerificationRequest, adminId: string): Promise<PropertyEntity> {
    const timestamp = new Date().toISOString();
    try {
      const admin = await this.supabase.from('users').select('role').eq('id', adminId).single();
      if (admin.data?.role !== 'admin') throw new UnauthorizedException('Only admins can verify transfers');

      const property = await this.getPropertyById(propertyId);
      if (property.transfer_status !== 'pending') throw new BadRequestException('Only pending transfers can be verified');

      const updateData = {
        transfer_status: verificationRequest.action === 'approve' ? 'verified' : 'rejected',
        verification_notes: verificationRequest.verificationNotes,
        ...(verificationRequest.action === 'approve' ? { 
          transfer_verified_date: timestamp, 
          verified_by: adminId,
          owner_id: await this.findOrCreateUser(
            property.new_owner_email || '',
            property.new_owner_name || '',
            property.new_owner_contact || ''
          ),
        } : { 
          transfer_rejected_date: timestamp, 
          rejected_by: adminId, 
          transfer_rejection_reason: verificationRequest.rejectionReason 
        }),
        last_updated: timestamp,
      };

      const { data, error } = await this.supabase
        .from('properties')
        .update(updateData)
        .eq('id', propertyId)
        .select()
        .single();

      if (error) throw error;
      console.log(`[${timestamp}] ${verificationRequest.action} transfer for property ${propertyId} by admin ${adminId}`);
      return data as PropertyEntity;
    } catch (error) {
      console.error(`[${timestamp}] Error verifying transfer for property ${propertyId}:`, error);
      throw error instanceof UnauthorizedException || error instanceof BadRequestException ? error : new BadRequestException('Failed to verify transfer');
    }
  }

  async findOrCreateUser(email: string, name: string, contact: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (data) return data.id;

    const { data: newUser, error: insertError } = await this.supabase
      .from('users')
      .insert({
        email,
        name,
        contact,
        role: 'seller',
      })
      .select('id')
      .single();

    if (insertError) throw insertError;
    return newUser.id;
  }

  async getPropertyStats(): Promise<{ totalProperties: number; pendingVerification: number; verifiedProperties: number; rejectedProperties: number; pendingTransfers: number }> {
    const timestamp = new Date().toISOString();
    try {
      const { count: total } = await this.supabase.from('properties').select('*', { count: 'exact' }).is('deleted_at', null);
      const { count: pending } = await this.supabase.from('properties').select('*', { count: 'exact' }).eq('status', 'pending').is('deleted_at', null);
      const { count: verified } = await this.supabase.from('properties').select('*', { count: 'exact' }).eq('status', 'verified').is('deleted_at', null);
      const { count: rejected } = await this.supabase.from('properties').select('*', { count: 'exact' }).eq('status', 'rejected').is('deleted_at', null);
      const { count: pendingTransfers } = await this.supabase.from('properties').select('*', { count: 'exact' }).eq('transfer_status', 'pending').is('deleted_at', null);

      console.log(`[${timestamp}] Retrieved property stats`);
      return {
        totalProperties: total || 0,
        pendingVerification: pending || 0,
        verifiedProperties: verified || 0,
        rejectedProperties: rejected || 0,
        pendingTransfers: pendingTransfers || 0,
      };
    } catch (error) {
      console.error(`[${timestamp}] Error retrieving property stats:`, error);
      throw new BadRequestException('Failed to retrieve property stats');
    }
  }

  private validateAndCleanPropertyData(propertyData: CreatePropertyDto): CreatePropertyDto {
    const cleaned = { ...propertyData };
    
    // Validate size units for property type
    const validSizeUnits = {
      land: ['sqm', 'acres', 'hectares'],
      house: ['sqft', 'sqm'],
      apartment: ['sqft', 'sqm'],
      commercial: ['sqft', 'sqm']
    };

    if (cleaned.type && validSizeUnits[cleaned.type]) {
      if (!validSizeUnits[cleaned.type].includes(cleaned.sizeUnit)) {
        throw new BadRequestException(
          `Invalid size unit '${cleaned.sizeUnit}' for property type '${cleaned.type}'. ` +
          `Valid units are: ${validSizeUnits[cleaned.type].join(', ')}`
        );
      }
    }

    // Clean inappropriate fields based on property type
    if (cleaned.type === 'land' || cleaned.type === 'commercial') {
      if (cleaned.bedrooms !== undefined && cleaned.bedrooms !== null) {
        throw new BadRequestException(`Bedrooms field is not allowed for ${cleaned.type} properties`);
      }
      if (cleaned.bathrooms !== undefined && cleaned.bathrooms !== null) {
        throw new BadRequestException(`Bathrooms field is not allowed for ${cleaned.type} properties`);
      }
      // Remove these fields entirely
      delete cleaned.bedrooms;
      delete cleaned.bathrooms;
    }

    // Validate required fields for houses and apartments
    if (cleaned.type === 'house' || cleaned.type === 'apartment') {
      if (!cleaned.bedrooms || cleaned.bedrooms < 1) {
        throw new BadRequestException(`Bedrooms is required and must be at least 1 for ${cleaned.type} properties`);
      }
      if (!cleaned.bathrooms || cleaned.bathrooms < 1) {
        throw new BadRequestException(`Bathrooms is required and must be at least 1 for ${cleaned.type} properties`);
      }
    }

    // Validate coordinates format
    if (cleaned.coordinates) {
      const coordPattern = /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/;
      if (!coordPattern.test(cleaned.coordinates)) {
        throw new BadRequestException('Coordinates must be in format "latitude,longitude" (e.g., "5.6037,-0.1870")');
      }
    }

    // Validate price format (remove currency symbols if present)
    if (cleaned.price) {
      cleaned.price = cleaned.price.replace(/[$,\s]/g, '');
      if (!/^\d+(\.\d+)?$/.test(cleaned.price)) {
        throw new BadRequestException('Price must be a valid number');
      }
    }

    return cleaned;
  }

  async getPropertyVerificationSummary(propertyId: string): Promise<{
    verification_count: number;
    latest_verification?: any;
    verification_scores: number[];
    avg_verification_score: number;
    risk_levels: { [key: string]: number };
    buyer_interest_level: 'low' | 'medium' | 'high';
  }> {
    try {
      // Get all verifications for this property
      const { data: verifications, error } = await this.supabase
        .from('verifications')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!verifications || verifications.length === 0) {
        return {
          verification_count: 0,
          verification_scores: [],
          avg_verification_score: 0,
          risk_levels: {},
          buyer_interest_level: 'low'
        };
      }

      const scores = verifications
        .filter(v => v.verification_score !== null)
        .map(v => v.verification_score);
      
      const avgScore = scores.length > 0 ? 
        scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

      const riskCounts = verifications.reduce((acc, v) => {
        acc[v.risk_level] = (acc[v.risk_level] || 0) + 1;
        return acc;
      }, {});

      const interestLevel = verifications.length >= 5 ? 'high' : 
                           verifications.length >= 2 ? 'medium' : 'low';

      return {
        verification_count: verifications.length,
        latest_verification: verifications[0],
        verification_scores: scores,
        avg_verification_score: Math.round(avgScore),
        risk_levels: riskCounts,
        buyer_interest_level: interestLevel
      };
    } catch (error) {
      console.error('Error getting property verification summary:', error);
      return {
        verification_count: 0,
        verification_scores: [],
        avg_verification_score: 0,
        risk_levels: {},
        buyer_interest_level: 'low'
      };
    }
  }
}