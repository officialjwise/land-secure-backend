import { Controller, Post, Body, Get, Query, Res, UseInterceptors, UploadedFiles, Delete } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'selfieImage', maxCount: 1 },
      { name: 'ghanaCardFrontImage', maxCount: 1 },
      { name: 'ghanaCardBackImage', maxCount: 1 },
    ]),
  )
  async register(
    @Body() registerDto: RegisterDto,
    @UploadedFiles() files: { selfieImage?: Express.Multer.File[]; ghanaCardFrontImage?: Express.Multer.File[]; ghanaCardBackImage?: Express.Multer.File[] },
    @Res() res: Response,
  ): Promise<void> {
    if (!files) {
      files = {};
    }
    if (files.selfieImage && files.selfieImage[0]) registerDto.selfieImage = files.selfieImage[0].buffer;
    if (files.ghanaCardFrontImage && files.ghanaCardFrontImage[0]) registerDto.ghanaCardFrontImage = files.ghanaCardFrontImage[0].buffer;
    if (files.ghanaCardBackImage && files.ghanaCardBackImage[0]) registerDto.ghanaCardBackImage = files.ghanaCardBackImage[0].buffer;
    await this.authService.register(registerDto, res);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: Response): Promise<void> {
    await this.authService.verifyEmail(token, res);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res() res: Response): Promise<void> {
    await this.authService.login(loginDto, res);
  }

  @Post('refresh-token')
  async refreshToken(@Body('refresh_token') refreshToken: string, @Res() res: Response): Promise<void> {
    await this.authService.refreshToken(refreshToken, res);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string, @Res() res: Response): Promise<void> {
    await this.authService.forgotPassword(email, res);
  }

  @Post('reset-password')
  
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.authService.resetPassword(token, newPassword, res);
  }

  @Post('resend-verification')
  async resendVerification(@Body('email') email: string, @Res() res: Response): Promise<void> {
    return this.authService.resendVerification(email, res);
  }

  @Post('logout')
  async logout(@Body('refresh_token') refreshToken: string, @Res() res: Response): Promise<void> {
    await this.authService.logout(refreshToken, res);
  }
}