import { Inject, Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Transporter } from 'nodemailer';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { ResponseHandler } from '../common/response.handler';
import { Messages } from '../common/messages';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

// Define the interface for temp user data
interface TempUserData {
  email: string;
  hashedOtp: string;
  hashedPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  surname: string | null;
  otherNames: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  ghanaCardNumber: string | null;
  selfieImageUrl: string | null;
  ghanaCardFrontImageUrl: string | null;
  ghanaCardBackImageUrl: string | null;
  expiresAt: number;
}

// In-memory storage for temporary registration data and tokens
const tempUserDataStore: Record<string, TempUserData> = {};
const tokenEmailMap: Record<string, string> = {};

@Injectable()
export class AuthService {
  private supabase;
  private transporter: Transporter;

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {
    this.supabase = createClient(
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

  async register(registerDto: RegisterDto, res: Response): Promise<void> {
    const timestamp = new Date().toISOString();
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      surname,
      otherNames,
      nationality,
      dateOfBirth,
      ghanaCardNumber,
      selfieImage,
      ghanaCardFrontImage,
      ghanaCardBackImage,
    } = registerDto;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check for existing user
    const { data: existingUser, error: userError } = await this.supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();
    if (userError && userError.code !== 'PGRST116') {
      console.error(`[${timestamp}] Error checking existing user for ${email}:`, userError);
      throw new BadRequestException(userError.message);
    }
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    // Upload images to Supabase Storage for seller role
    let selfieImageUrl: string | null = null;
    let ghanaCardFrontImageUrl: string | null = null;
    let ghanaCardBackImageUrl: string | null = null;
    if (role === 'seller') {
      if (selfieImage) {
        selfieImageUrl = await this.uploadImage(selfieImage, `temp/selfie/${email}`);
      }
      if (ghanaCardFrontImage) {
        ghanaCardFrontImageUrl = await this.uploadImage(ghanaCardFrontImage, `temp/ghana-card-front/${email}`);
      }
      if (ghanaCardBackImage) {
        ghanaCardBackImageUrl = await this.uploadImage(ghanaCardBackImage, `temp/ghana-card-back/${email}`);
      }
    }

    const tempUserData: TempUserData = {
      email,
      hashedOtp,
      hashedPassword,
      firstName,
      lastName,
      phone,
      role,
      surname: role === 'seller' ? (surname || null) : null,
      otherNames: role === 'seller' ? (otherNames || null) : null,
      nationality: role === 'seller' ? (nationality || null) : null,
      dateOfBirth: role === 'seller' ? (dateOfBirth || null) : null,
      ghanaCardNumber: role === 'seller' ? (ghanaCardNumber || null) : null,
      selfieImageUrl,
      ghanaCardFrontImageUrl,
      ghanaCardBackImageUrl,
      expiresAt: Date.now() + 10 * 60 * 1000,
    };

    // Store temporary data in in-memory object
    tempUserDataStore[email] = tempUserData;
    console.log(`[${timestamp}] Stored temporary registration data for ${email} in memory`);

    // Send verification email
    try {
      console.log(`[${timestamp}] Sending verification email to ${email}`);
      await this.transporter.sendMail({
        from: this.configService.get('EMAIL_USER'),
        to: email,
        subject: 'Email Verification - Complete Your Registration',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome! Please verify your email address</h2>
            <p>Hello ${firstName} ${lastName},</p>
            <p>Thank you for registering. Please use the OTP code below to verify your email address:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="background-color: #007bff; color: white; padding: 12px 24px; border-radius: 4px; font-size: 1.5em; letter-spacing: 2px;">${otp}</span>
            </div>
            <p><strong>Your OTP code: ${otp}</strong> (for future reference)</p>
            <p style="color: #666; font-size: 12px;">
              This OTP will expire in 10 minutes. If you didn't request this, please ignore this email.
            </p>
          </div>
        `,
      });
      console.log(`[${timestamp}] Verification email sent successfully to ${email}`);
    } catch (emailError) {
      console.error(`[${timestamp}] Failed to send verification email to ${email}:`, emailError);
      delete tempUserDataStore[email];
      if (role === 'seller') {
        await this.cleanupTempImages(email);
      }
      throw new BadRequestException('Failed to send verification email. Please try again.');
    }

    ResponseHandler.success(res, Messages.OTP_SENT, {
      message: 'Registration initiated. Please check your email for verification instructions.',
      email,
    });
  }

  async verifyEmail(email: string, otp: string, res: Response): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Attempting to verify email for: ${email} with otp: ${otp}`);

    if (!email || !otp) {
      throw new BadRequestException('Email and OTP are required');
    }

    // Check for existing user
    const { data: existingUser, error: userError } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser && existingUser.role === 'admin') {
      // Admin login OTP verification
      const tempData = tempUserDataStore[email];
      if (!tempData || !tempData.hashedOtp || !tempData.expiresAt) {
        throw new UnauthorizedException('No OTP found. Please request a new login.');
      }
      if (tempData.expiresAt < Date.now()) {
        delete tempUserDataStore[email];
        throw new UnauthorizedException('OTP expired. Please request a new login.');
      }
      const isOtpValid = await bcrypt.compare(otp, tempData.hashedOtp);
      if (!isOtpValid) {
        throw new UnauthorizedException('Invalid OTP.');
      }
      delete tempUserDataStore[email];
      // Return tokens and user info for admin
      const payload = { sub: existingUser.id, email: existingUser.email, role: existingUser.role };
      const accessToken = this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '1h',
      });
      const refreshToken = this.jwtService.sign(payload, {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
        expiresIn: '7d',
      });
      await this.supabase
        .from('users')
        .update({ last_login_at: new Date(), updated_at: new Date() })
        .eq('id', existingUser.id);
      ResponseHandler.success(res, Messages.LOGIN_SUCCESS, {
        message: 'Login successful',
        user: {
          id: existingUser.id,
          email: existingUser.email,
          firstName: existingUser.first_name,
          lastName: existingUser.last_name,
          role: existingUser.role,
          isActive: existingUser.is_active,
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in_access: '1h',
          expires_in_refresh: '7d',
        },
      });
      return;
    }

    // Registration verification (existing logic)
    const tempData = tempUserDataStore[email];
    if (!tempData) {
      console.error(`[${timestamp}] No temporary registration found for email ${email}`);
      throw new BadRequestException('No registration found for this email. Please register again.');
    }

    // Check expiration
    const now = Date.now();
    if (tempData.expiresAt < now) {
      console.error(`[${timestamp}] OTP expired for email ${email}`);
      delete tempUserDataStore[email];
      if (tempData.role === 'seller') {
        await this.cleanupTempImages(email);
      }
      throw new BadRequestException('OTP has expired. Please register again.');
    }

    // Check OTP
    const isOtpValid = await bcrypt.compare(otp, tempData.hashedOtp);
    if (!isOtpValid) {
      throw new BadRequestException('Invalid OTP');
    }

    // Check for existing user
    const { data: existingUserAfterOtpCheck, error: userErrorAfterOtpCheck } = await this.supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUserAfterOtpCheck) {
      delete tempUserDataStore[email];
      if (tempData.role === 'seller') {
        await this.cleanupTempImages(email);
      }
      throw new BadRequestException('Email already registered. Please login instead.');
    }

    const userId = uuidv4();
    const verificationPayload = { sub: userId, email: tempData.email, role: tempData.role };
    const accessToken = this.jwtService.sign(verificationPayload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '1h',
    });
    const refreshToken = this.jwtService.sign(verificationPayload, {
      secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      expiresIn: '7d',
    });

    try {
      const { error: insertError } = await this.supabase.from('users').insert({
        id: userId,
        email: tempData.email,
        password: tempData.hashedPassword,
        first_name: tempData.firstName,
        last_name: tempData.lastName,
        phone: tempData.phone,
        role: tempData.role,
        surname: tempData.role === 'seller' ? tempData.surname : null,
        other_names: tempData.role === 'seller' ? tempData.otherNames : null,
        nationality: tempData.role === 'seller' ? tempData.nationality : null,
        date_of_birth: tempData.role === 'seller' ? tempData.dateOfBirth : null,
        ghana_card_number: tempData.role === 'seller' ? tempData.ghanaCardNumber : null,
        selfie_image: tempData.selfieImageUrl,
        ghana_card_front_image: tempData.ghanaCardFrontImageUrl,
        ghana_card_back_image: tempData.ghanaCardBackImageUrl,
        is_active: tempData.role === 'seller' ? false : true,
        verification_token: null,
        pending_verification: tempData.role === 'seller' ? true : false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      if (insertError) {
        console.error(`[${timestamp}] Error creating user for ${tempData.email}:`, insertError);
        if (tempData.role === 'seller') {
          await this.cleanupTempImages(email);
        }
        throw new BadRequestException('Failed to create user account');
      }

      delete tempUserDataStore[email];
      console.log(`[${timestamp}] Email verified and user created successfully for ${tempData.email}`);
      ResponseHandler.success(res, Messages.EMAIL_VERIFIED, {
        message: 'Email verified successfully! Welcome to the platform.',
        user: {
          id: userId,
          email: tempData.email,
          firstName: tempData.firstName,
          lastName: tempData.lastName,
          role: tempData.role,
          isActive: tempData.role === 'seller' ? false : true,
          pendingVerification: tempData.role === 'seller' ? true : false,
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in_access: '1h',
          expires_in_refresh: '7d',
        },
      });
    } catch (error) {
      console.error(`[${timestamp}] Error during user creation for ${tempData.email}:`, error);
      if (tempData.role === 'seller') {
        await this.cleanupTempImages(email);
      }
      throw new BadRequestException('Failed to complete registration. Please try again.');
    }
  }

  async uploadImage(fileBuffer: Buffer, pathPrefix: string): Promise<string> {
    const timestamp = new Date().toISOString();
    const fileName = `${pathPrefix}/${uuidv4()}.jpg`;
    try {
      const { data, error } = await this.supabase.storage
        .from('user-images')
        .upload(fileName, fileBuffer, { upsert: true, contentType: 'image/jpeg' });
      if (error) {
        console.error(`[${timestamp}] Image upload error for ${fileName}:`, error);
        throw new BadRequestException(`Image upload failed: ${error.message}`);
      }
      const { data: urlData } = this.supabase.storage.from('user-images').getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (error) {
      console.error(`[${timestamp}] Image upload failed for ${fileName}:`, error);
      throw new BadRequestException('Failed to upload image');
    }
  }

  async cleanupTempImages(email: string): Promise<void> {
    const timestamp = new Date().toISOString();
    try {
      const paths = [
        `temp/selfie/${email}`,
        `temp/ghana-card-front/${email}`,
        `temp/ghana-card-back/${email}`,
      ];
      for (const path of paths) {
        const { error } = await this.supabase.storage.from('user-images').remove([`${path}/*.jpg`]);
        if (error) {
          console.error(`[${timestamp}] Error cleaning up image at ${path}:`, error);
        }
      }
    } catch (error) {
      console.error(`[${timestamp}] Error during image cleanup for ${email}:`, error);
    }
  }

  async login(loginDto: LoginDto, res: Response): Promise<void> {
    const timestamp = new Date().toISOString();
    const { email, password, otp } = loginDto as any;
    try {
      const { data: user, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      if (error || !user) {
        throw new BadRequestException('User not found');
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
      if (!user.is_active) {
        throw new UnauthorizedException('Account is not active. Please contact support.');
      }

      // If admin, require OTP verification
      if (user.role === 'admin') {
        if (!otp) {
          // If OTP not provided, generate and send, but do not log in
          const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
          const hashedOtp = await bcrypt.hash(generatedOtp, 10);
          user.hashedOtp = hashedOtp;
          user.otpExpiresAt = Date.now() + 10 * 60 * 1000;
          tempUserDataStore[email] = {
            ...tempUserDataStore[email],
            email,
            hashedOtp,
            expiresAt: user.otpExpiresAt,
            firstName: user.first_name,
            lastName: user.last_name,
            phone: user.phone,
            role: user.role,
            surname: user.surname || null,
            otherNames: user.other_names || null,
            nationality: user.nationality || null,
            dateOfBirth: user.date_of_birth || null,
            ghanaCardNumber: user.ghana_card_number || null,
            selfieImageUrl: user.selfie_image || null,
            ghanaCardFrontImageUrl: user.ghana_card_front_image || null,
            ghanaCardBackImageUrl: user.ghana_card_back_image || null,
            hashedPassword: user.password,
          };
          await this.transporter.sendMail({
            from: this.configService.get('EMAIL_USER'),
            to: user.email,
            subject: 'Admin Login OTP',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Admin Login Verification</h2>
                <p>Hello ${user.first_name} ${user.last_name},</p>
                <p>Your OTP for admin login is:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <span style="background-color: #007bff; color: white; padding: 12px 24px; border-radius: 4px; font-size: 1.5em; letter-spacing: 2px;">${generatedOtp}</span>
                </div>
                <p>This OTP will expire in 10 minutes.</p>
              </div>
            `,
          });
          res.status(200).json({
            statusCode: 200,
            status: 'otp_sent',
            message: 'OTP sent to admin email. Please verify with the OTP to complete login.',
            email: user.email
          });
          return;
        } else {
          // OTP provided, verify
          const tempData = tempUserDataStore[email];
          if (!tempData || !tempData.hashedOtp || !tempData.expiresAt) {
            throw new UnauthorizedException('No OTP found. Please request a new login.');
          }
          if (tempData.expiresAt < Date.now()) {
            delete tempUserDataStore[email];
            throw new UnauthorizedException('OTP expired. Please request a new login.');
          }
          const isOtpValid = await bcrypt.compare(otp, tempData.hashedOtp);
          if (!isOtpValid) {
            throw new UnauthorizedException('Invalid OTP.');
          }
          delete tempUserDataStore[email];
        }
      }

      const payload = { sub: user.id, email: user.email, role: user.role };
      const accessToken = this.jwtService.sign(payload, { secret: this.configService.get('JWT_SECRET'), expiresIn: '1h' });
      const refreshToken = this.jwtService.sign(payload, { secret: this.configService.get('REFRESH_TOKEN_SECRET'), expiresIn: '7d' });
      await this.supabase
        .from('users')
        .update({ last_login_at: new Date(), updated_at: new Date() })
        .eq('id', user.id);
      ResponseHandler.success(res, Messages.LOGIN_SUCCESS, {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          isActive: user.is_active,
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in_access: '1h',
          expires_in_refresh: '7d',
        },
      });
    } catch (error) {
      console.error(`[${timestamp}] Login error for ${email}:`, error);
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Login failed. Please try again.');
    }
  }

  async refreshToken(refreshToken: string, res: Response): Promise<void> {
    const timestamp = new Date().toISOString();
    try {
      if (!refreshToken) {
        throw new UnauthorizedException('Refresh token is required');
      }
      const payload = this.jwtService.verify(refreshToken, { secret: this.configService.get('REFRESH_TOKEN_SECRET') });
      const { data: user, error } = await this.supabase
        .from('users')
        .select('id, email, role, is_active')
        .eq('id', payload.sub)
        .single();
      if (error || !user || !user.is_active) {
        throw new UnauthorizedException('User not found or inactive');
      }
      const newAccessToken = this.jwtService.sign(
        { sub: payload.sub, email: payload.email, role: payload.role },
        { secret: this.configService.get('JWT_SECRET'), expiresIn: '1h' }
      );
      ResponseHandler.success(res, { statusCode: 200, message: 'Token refreshed successfully' }, {
        access_token: newAccessToken,
        refresh_token: refreshToken,
        expires_in_access: '1h',
        expires_in_refresh: '7d',
      });
    } catch (error) {
      console.error(`[${timestamp}] Token refresh error for token ${refreshToken}:`, error);
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      ResponseHandler.error(res, 401, 'Invalid refresh token');
    }
  }

  async forgotPassword(email: string, res: Response): Promise<void> {
    const timestamp = new Date().toISOString();
    try {
      const { data: user, error } = await this.supabase
        .from('users')
        .select('email, first_name')
        .eq('email', email)
        .single();
      if (error || !user) {
        throw new BadRequestException('User not found');
      }
      const resetToken = uuidv4();
      const resetExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const { error: updateError } = await this.supabase
        .from('users')
        .update({ reset_token: resetToken, reset_expires_at: resetExpiresAt, updated_at: new Date() })
        .eq('email', email);
      if (updateError) {
        throw new BadRequestException('Failed to generate reset token');
      }
      await this.transporter.sendMail({
        from: this.configService.get('EMAIL_USER'),
        to: email,
        subject: 'Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>Hello ${user.first_name},</p>
            <p>You requested to reset your password. Click the button below to proceed:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="http://localhost:3000/auth/reset-password?token=${resetToken}" 
                 style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #666;">
              http://localhost:3000/auth/reset-password?token=${resetToken}
            </p>
            <p style="color: #666; font-size: 12px;">
              This reset link will expire in 10 minutes.
            </p>
          </div>
        `,
      });
      ResponseHandler.success(res, Messages.EMAIL_SENT, {
        message: 'Password reset instructions sent to your email.',
        email,
      });
    } catch (error) {
      console.error(`[${timestamp}] Forgot password error for ${email}:`, error);
      throw new BadRequestException('Failed to send password reset email');
    }
  }

  async resetPassword(token: string, newPassword: string, res: Response): Promise<void> {
    const timestamp = new Date().toISOString();
    try {
      if (!token || !newPassword) {
        throw new BadRequestException('Reset token and new password are required');
      }
      const { data: user, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('reset_token', token)
        .single();
      if (error || !user) {
        throw new BadRequestException('Invalid or expired reset token');
      }
      if (new Date(user.reset_expires_at) < new Date()) {
        throw new BadRequestException('Reset token has expired');
      }
      if (newPassword.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters long');
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const { error: updateError } = await this.supabase
        .from('users')
        .update({ password: hashedPassword, reset_token: null, reset_expires_at: null, updated_at: new Date() })
        .eq('reset_token', token);
      if (updateError) {
        throw new BadRequestException('Failed to update password');
      }
      ResponseHandler.success(res, { statusCode: 200, message: 'Password reset successful' }, {
        message: 'Your password has been reset successfully. Please try again.',
      });
    } catch (error) {
      console.error(`[${timestamp}] Reset password error: ${token}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      ResponseHandler.error(res, 400, 'Failed to reset password');
    }
  }

  async logout(refreshToken: string, res: Response): Promise<void> {
    const timestamp = new Date().toISOString();
    try {
      if (!refreshToken) {
        throw new UnauthorizedException('Refresh token is required');
      }
      // In a production environment, implement token blacklisting (e.g., store in Redis)
      console.log(`[${timestamp}] Logging out with refresh token: ${refreshToken}`);
      ResponseHandler.success(res, Messages.LOGOUT_SUCCESS, {
        message: 'You have been logged out successfully.',
      });
    } catch (error) {
      console.error(`[${timestamp}] Logout error for ${refreshToken}:`, error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      ResponseHandler.success(res, Messages.LOGOUT_SUCCESS, {
        message: 'You have been logged out successfully.',
      });
    }
  }

  async resendVerification(email: string, res: Response): Promise<void> {
    const timestamp = new Date().toISOString();
    try {
      const tempData = tempUserDataStore[email];
      if (!tempData) {
        throw new BadRequestException('No pending verification found for this email');
      }

      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await bcrypt.hash(newOtp, 10);

      // Update temp user data
      tempData.hashedOtp = hashedOtp;
      tempData.expiresAt = Date.now() + 10 * 60 * 1000;

      await this.transporter.sendMail({
        from: this.configService.get('EMAIL_USER'),
        to: email,
        subject: 'Email Verification - Resent',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Email Verification</h2>
            <p>Hello ${tempData.firstName} ${tempData.lastName},</p>
            <p>Here's your new OTP code:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="background-color: #007bff; color: white; padding: 12px 24px; border-radius: 4px; font-size: 1.5em; letter-spacing: 2px;">${newOtp}</span>
            </div>
            <p style="color: #666; font-size: 12px;">
              This OTP will expire in 10 minutes.
            </p>
          </div>
        `,
      });
      ResponseHandler.success(res, Messages.VERIFICATION_EMAIL_RESENT, {
        message: 'New verification email sent. Please check your inbox.',
        email,
      });
    } catch (error) {
      console.error(`[${timestamp}] Resend verification error for ${email}:`, error);
      throw new BadRequestException('Failed to resend verification email');
    }
  }
}