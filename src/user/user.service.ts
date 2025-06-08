import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Transporter } from 'nodemailer';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  private supabase: SupabaseClient;
  private transporter: Transporter;

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {
    this.supabase = new SupabaseClient(
      this.configService.get('SUPABASE_URL') || '',
      this.configService.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    );
    this.transporter = require('nodemailer').createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get('EMAIL_USER') || '',
        pass: this.configService.get('EMAIL_PASS') || '',
      },
    });
  }

  async getAllUsers(filters: { search?: string; role?: string; status?: string }, pagination: { page: number; limit: number }): Promise<{ users: UserEntity[]; total: number; page: number; limit: number; message: string }> {
    const timestamp = new Date().toISOString();
    try {
      const { page, limit } = pagination;
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      let query = this.supabase
        .from('users')
        .select('*', { count: 'exact' })
        .range(start, end)
        .is('deleted_at', null);

      if (filters.search) {
        query = query.ilike('email', `%${filters.search}%`)
          .or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
      }
      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      if (filters.status) {
        query = query.eq('is_active', filters.status === 'active');
      }

    const { data, error, count } = await query;
    if (error) throw error;
    console.log(`[${timestamp}] Retrieved ${data.length} users with filters ${JSON.stringify(filters)}`);
    return {
      total: count || 0,
      page,
      limit,
      message: 'Users retrieved successfully',
      users: data as UserEntity[]
    };
    } catch (error) {
      console.error(`[${timestamp}] Error retrieving users:`, error);
      throw new BadRequestException('Failed to retrieve users');
    }
  }

  async getUserById(id: string): Promise<UserEntity> {
    const timestamp = new Date().toISOString();
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();
      if (error) throw error;
      if (!data) throw new BadRequestException('User not found');
      console.log(`[${timestamp}] Retrieved user ${id}`);
      return data as UserEntity;
    } catch (error) {
      console.error(`[${timestamp}] Error retrieving user ${id}:`, error);
      throw new BadRequestException('Failed to retrieve user');
    }
  }

  async createUser(userData: any, adminId: string): Promise<UserEntity> {
    const timestamp = new Date().toISOString();
    try {
      const { email, password, firstName, lastName, phone, role, ...sellerFields } = userData;
      const admin = await this.getUserById(adminId);
      if (admin.role !== 'admin') throw new UnauthorizedException('Only admins can create users');

      const existingUser = await this.supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .is('deleted_at', null)
        .single();
      if (existingUser.data) throw new BadRequestException('Email already registered');

      const hashedPassword = await bcrypt.hash(password || 'TempPass123!', 10);
      const resetToken = uuidv4();
      const resetExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const { data, error } = await this.supabase.from('users').insert({
        id: uuidv4(),
        email,
        password: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        phone,
        role,
        ...(['seller'].includes(role) ? sellerFields : {}),
        reset_token: resetToken,
        reset_expires_at: resetExpiresAt,
        is_active: false,
        created_at: new Date(),
        updated_at: new Date(),
      }).select().single();

      if (error) throw error;

      await this.transporter.sendMail({
        from: this.configService.get('EMAIL_USER'),
        to: email,
        subject: 'Password Reset Required',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Account Created</h2>
            <p>Hello ${firstName} ${lastName},</p>
            <p>Your account has been created. Please reset your password using the link below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="http://localhost:3000/auth/reset-password?token=${resetToken}" 
                 style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; font-size: 12px;">This link expires in 10 minutes.</p>
          </div>
        `,
      });

      console.log(`[${timestamp}] Created user ${email} with reset token ${resetToken}`);
      return data as UserEntity;
    } catch (error) {
      console.error(`[${timestamp}] Error creating user:`, error);
      throw error instanceof BadRequestException || error instanceof UnauthorizedException ? error : new BadRequestException('Failed to create user');
    }
  }

  async updateUser(id: string, userData: any, adminId: string): Promise<UserEntity> {
    const timestamp = new Date().toISOString();
    try {
      const admin = await this.getUserById(adminId);
      if (admin.role !== 'admin') throw new UnauthorizedException('Only admins can update users');

      const { email, firstName, lastName, phone, role, is_active, ...sellerFields } = userData;
      const { data: existingUser, error: fetchError } = await this.supabase
        .from('users')
        .select('email')
        .eq('id', id)
        .is('deleted_at', null)
        .single();
      if (fetchError || !existingUser) throw new BadRequestException('User not found');

      const { data, error } = await this.supabase
        .from('users')
        .update({
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
          role,
          is_active,
          ...(['seller'].includes(role) ? sellerFields : {}),
          updated_at: new Date(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      console.log(`[${timestamp}] Updated user ${id}`);
      return data as UserEntity;
    } catch (error) {
      console.error(`[${timestamp}] Error updating user ${id}:`, error);
      throw error instanceof BadRequestException || error instanceof UnauthorizedException ? error : new BadRequestException('Failed to update user');
    }
  }

  async deleteUser(id: string, adminId: string): Promise<{ message: string }> {
    const timestamp = new Date().toISOString();
    try {
      const admin = await this.getUserById(adminId);
      if (admin.role !== 'admin') throw new UnauthorizedException('Only admins can delete users');

      const { data, error } = await this.supabase
        .from('users')
        .update({ deleted_at: new Date(), updated_at: new Date() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new BadRequestException('User not found');
      console.log(`[${timestamp}] Soft deleted user ${id}`);
      return { message: 'User soft deleted successfully' };
    } catch (error) {
      console.error(`[${timestamp}] Error deleting user ${id}:`, error);
      throw error instanceof BadRequestException || error instanceof UnauthorizedException ? error : new BadRequestException('Failed to delete user');
    }
  }

  async updateRolePermissions(roleData: { role: string; permissions: string[] }, adminId: string): Promise<{ role: string; permissions: string[] }> {
    const timestamp = new Date().toISOString();
    try {
      const admin = await this.getUserById(adminId);
      if (admin.role !== 'admin') throw new UnauthorizedException('Only admins can update role permissions');

      const { role, permissions } = roleData;
      const { data, error } = await this.supabase
        .from('roles')
        .upsert({ role, permissions }, { onConflict: 'role' })
        .select();

      if (error) throw error;
      console.log(`[${timestamp}] Updated permissions for role ${role}`);
      return data[0];
    } catch (error) {
      console.error(`[${timestamp}] Error updating role permissions for ${roleData.role}:`, error);
      throw error instanceof BadRequestException || error instanceof UnauthorizedException ? error : new BadRequestException('Failed to update role permissions');
    }
  }

  async getMyProfile(userId: string): Promise<{ id: string; email: string; firstName: string; lastName: string; phone: string; role: 'buyer' | 'seller' | 'admin'; isActive: boolean }> {
    const timestamp = new Date().toISOString();
    try {
      const user = await this.getUserById(userId);
      console.log(`[${timestamp}] Retrieved profile for user ${userId}`);
      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        isActive: user.is_active,
      };
    } catch (error) {
      console.error(`[${timestamp}] Error retrieving profile for ${userId}:`, error);
      throw new BadRequestException('Failed to retrieve profile');
    }
  }

  async updateMyProfile(
    userId: string, 
    updateData: { 
      firstName?: string; 
      lastName?: string; 
      phone?: string; 
      email?: string; 
      selfieImage?: Buffer; 
      ghanaCardFrontImage?: Buffer; 
      ghanaCardBackImage?: Buffer 
    }
  ): Promise<{ message: string; user: UserEntity }> {
    const timestamp = new Date().toISOString();
    
    try {
      // Get user and validate existence
      const user = await this.getUserById(userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }
  
      // Check if user is trying to update document images
      const isUpdatingDocuments = !!(
        updateData.selfieImage || 
        updateData.ghanaCardFrontImage || 
        updateData.ghanaCardBackImage
      );
  
      // Handle non-seller users (buyers, admins, etc.)
      if (user.role !== 'seller') {
        // Non-sellers cannot upload documents
        if (isUpdatingDocuments) {
          throw new BadRequestException('Only sellers can upload verification documents');
        }
  
        const { firstName, lastName, phone, email } = updateData;
        
        const { data, error } = await this.supabase
          .from('users')
          .update({
            first_name: firstName,
            last_name: lastName,
            phone,
            email,
            updated_at: new Date(),
          })
          .eq('id', userId)
          .select()
          .single();
  
        if (error) {
          console.error(`[${timestamp}] Supabase error updating user ${userId}:`, error);
          throw new BadRequestException('Failed to update profile');
        }
        
        if (!data) {
          throw new BadRequestException('User not found after update');
        }
  
        console.log(`[${timestamp}] Updated profile for user ${userId}`);
        return {
          message: 'Profile updated successfully',
          user: data as UserEntity,
        };
      }
  
      // Handle seller users
      if (user.role === 'seller') {
        // If trying to update documents
        if (isUpdatingDocuments) {
          // Verified sellers cannot update documents
          if (user.is_active) {
            throw new BadRequestException('Verified sellers cannot update verification documents');
          }
          
          // Sellers without pending verification cannot update documents
          if (!user.pending_verification) {
            throw new BadRequestException('No pending verification found. Please contact support to resubmit documents');
          }
  
          // Handle image uploads with proper error handling
          let selfieImageUrl = user.selfie_image;
          let ghanaCardFrontImageUrl = user.ghana_card_front_image;
          let ghanaCardBackImageUrl = user.ghana_card_back_image;
  
          try {
            if (updateData.selfieImage) {
              selfieImageUrl = await this.uploadImage(
                updateData.selfieImage, 
                `documents/selfie/${userId}`
              );
            }
            
            if (updateData.ghanaCardFrontImage) {
              ghanaCardFrontImageUrl = await this.uploadImage(
                updateData.ghanaCardFrontImage, 
                `documents/ghana-card-front/${userId}`
              );
            }
            
            if (updateData.ghanaCardBackImage) {
              ghanaCardBackImageUrl = await this.uploadImage(
                updateData.ghanaCardBackImage, 
                `documents/ghana-card-back/${userId}`
              );
            }
          } catch (uploadError) {
            console.error(`[${timestamp}] Error uploading images for user ${userId}:`, uploadError);
            throw new BadRequestException('Failed to upload images');
          }
  
          // Update profile with documents
          const { data, error } = await this.supabase
            .from('users')
            .update({
              first_name: updateData.firstName,
              last_name: updateData.lastName,
              phone: updateData.phone,
              email: updateData.email,
              selfie_image: selfieImageUrl,
              ghana_card_front_image: ghanaCardFrontImageUrl,
              ghana_card_back_image: ghanaCardBackImageUrl,
              updated_at: new Date(),
            })
            .eq('id', userId)
            .select()
            .single();
  
          if (error) {
            console.error(`[${timestamp}] Supabase error updating seller ${userId}:`, error);
            throw new BadRequestException('Failed to update profile and documents');
          }
          
          if (!data) {
            throw new BadRequestException('User not found after update');
          }
  
          console.log(`[${timestamp}] Updated profile and resubmitted documents for user ${userId}`);
          return {
            message: 'Profile and documents updated for verification',
            user: data as UserEntity,
          };
        } else {
          // Only updating basic profile information (no documents)
          const { firstName, lastName, phone, email } = updateData;
          
          const { data, error } = await this.supabase
            .from('users')
            .update({
              first_name: firstName,
              last_name: lastName,
              phone,
              email,
              updated_at: new Date(),
            })
            .eq('id', userId)
            .select()
            .single();
  
          if (error) {
            console.error(`[${timestamp}] Supabase error updating seller profile ${userId}:`, error);
            throw new BadRequestException('Failed to update profile');
          }
          
          if (!data) {
            throw new BadRequestException('User not found after update');
          }
  
          console.log(`[${timestamp}] Updated basic profile for seller ${userId}`);
          return {
            message: 'Profile updated successfully',
            user: data as UserEntity,
          };
        }
      }

      // Catch-all return (though this should never be reached due to role checks above)
      throw new BadRequestException('Unsupported user role or operation');
  
    } catch (error) {
      console.error(`[${timestamp}] Error updating profile for ${userId}:`, error);
      
      // Re-throw known exceptions
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      
      // Wrap unknown errors
      throw new BadRequestException('Failed to update profile');
    }
  }

  async uploadImage(fileBuffer: Buffer, pathPrefix: string): Promise<string> {
    const timestamp = new Date().toISOString();
    const fileName = `${pathPrefix}/${uuidv4()}.jpg`;
    try {
      const { data, error } = await this.supabase.storage
        .from('user-images')
        .upload(fileName, fileBuffer, { upsert: true, contentType: 'image/jpeg' });
      if (error) throw error;
      const { data: urlData } = this.supabase.storage.from('user-images').getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (error) {
      console.error(`[${timestamp}] Image upload failed for ${fileName}:`, error);
      throw new BadRequestException('Failed to upload image');
    }
  }
}