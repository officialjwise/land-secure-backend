import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { Messages } from '../common/messages';
import { ResponseHandler } from '../common/response.handler';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;
  private transporter: nodemailer.Transporter;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.supabase = createClient(
      this.configService.get('SUPABASE_URL') || '',
      this.configService.get('SUPABASE_ANON_KEY') || '',
    );
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get('EMAIL_USER') || '',
        pass: this.configService.get('EMAIL_PASS') || '',
      },
    });
  }

  async register(registerDto: RegisterDto, res: Response): Promise<void> {
    const { email, password, firstName, lastName, phone, role, surname, otherNames, nationality, dateOfBirth, ghanaCardNumber, selfieImage, ghanaCardFrontImage, ghanaCardBackImage } = registerDto;
    const verificationToken = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle image uploads for sellers
    const uploadedImages: {
      selfieImage?: string;
      ghanaCardFrontImage?: string;
      ghanaCardBackImage?: string;
    } = {};
    if (role === 'seller' && (selfieImage || ghanaCardFrontImage || ghanaCardBackImage)) {
      const uploadImage = async (file: string, pathPrefix: string): Promise<string> => {
        if (!file) return '';
        const fileName = `${pathPrefix}/${uuidv4()}.jpg`;
        const { data, error } = await this.supabase.storage
          .from('user-images')
          .upload(fileName, file, { upsert: true });
        if (error) throw new BadRequestException(`Image upload failed: ${error.message}`);
        return this.supabase.storage.from('user-images').getPublicUrl(fileName).data.publicUrl;
      };
      uploadedImages.selfieImage = await uploadImage(selfieImage ?? '', 'selfie');
      uploadedImages.ghanaCardFrontImage = await uploadImage(ghanaCardFrontImage ?? '', 'ghana-card-front');
      uploadedImages.ghanaCardBackImage = await uploadImage(ghanaCardBackImage ?? '', 'ghana-card-back');
      
    }

    const { error } = await this.supabase.from('users').insert({
      email,
      password: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      phone,
      role,
      surname: role === 'seller' ? surname : null,
      other_names: role === 'seller' ? otherNames : null,
      nationality: role === 'seller' ? nationality : null,
      date_of_birth: role === 'seller' ? dateOfBirth : null,
      ghana_card_number: role === 'seller' ? ghanaCardNumber : null,
      selfie_image: uploadedImages.selfieImage,
      ghana_card_front_image: uploadedImages.ghanaCardFrontImage,
      ghana_card_back_image: uploadedImages.ghanaCardBackImage,
      is_active: role === 'seller' ? false : true,
      verification_token: verificationToken,
      pending_verification: role === 'seller' ? true : false,
    });

    if (error) throw new BadRequestException(error.message);

    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'Verify Your Email',
      html: `<p>Thank you for registering. Please verify your email by clicking the link below:</p><a href="http://localhost:3000/auth/verify-email?token=${verificationToken}">Verify Email</a>`,
    });

    ResponseHandler.success(res, Messages.USER_CREATED);
  }

  async verifyEmail(token: string, res: Response): Promise<void> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('verification_token', token)
      .single();

    if (error || !data) throw new BadRequestException('Invalid or expired verification token');

    await this.supabase
      .from('users')
      .update({ is_active: data.pending_verification ? false : true, verification_token: null })
      .eq('id', data.id);

    if (data.pending_verification) {
      ResponseHandler.success(res, Messages.ADMIN_APPROVAL_PENDING, {
        message: 'Email verified. Awaiting admin approval for sellers.',
      });
      return;
    }

    const payload = { sub: data.id, email: data.email, role: data.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    ResponseHandler.success(res, Messages.EMAIL_VERIFIED, {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in_access: '1h',
      expires_in_refresh: '7d',
    });
  }

  async login(loginDto: LoginDto, res: Response): Promise<void> {
    const { email, password } = loginDto;
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !data) throw new UnauthorizedException('User not found or not activated');

    const isMatch = await bcrypt.compare(password, data.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: data.id, email: data.email, role: data.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    ResponseHandler.success(res, Messages.LOGIN_SUCCESS, {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in_access: '1h',
      expires_in_refresh: '7d',
    });
  }

  async refreshToken(refreshToken: string, res: Response): Promise<void> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.REFRESH_TOKEN_SECRET,
      });
      const newAccessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
      ResponseHandler.success(res, Messages.LOGIN_SUCCESS, {
        access_token: newAccessToken,
        refresh_token: refreshToken,
        expires_in_access: '1h',
        expires_in_refresh: '7d',
      });
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async forgotPassword(email: string, res: Response): Promise<void> {
    const { data } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (!data) throw new BadRequestException('User not found or not activated');

    const resetToken = uuidv4();
    await this.supabase
      .from('users')
      .update({ reset_token: resetToken })
      .eq('id', data.id);

    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'Password Reset Request',
      html: `<p>Click the link below to reset your password:</p><a href="http://localhost:3000/auth/reset-password?token=${resetToken}">Reset Password</a>`,
    });

    ResponseHandler.success(res, Messages.EMAIL_SENT);
  }

  async resetPassword(token: string, newPassword: string, res: Response): Promise<void> {
    const { data } = await this.supabase
      .from('users')
      .select('*')
      .eq('reset_token', token)
      .single();

    if (!data) throw new BadRequestException('Invalid or expired reset token');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.supabase
      .from('users')
      .update({ password: hashedPassword, reset_token: null })
      .eq('id', data.id);

    ResponseHandler.success(res, Messages.LOGIN_SUCCESS);
  }
}