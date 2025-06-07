import { Controller, Post, Body, Get, Query, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';


@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Res() res: Response): Promise<void> {
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
}