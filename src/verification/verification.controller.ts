import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { VerificationService } from './verification.service';
import { CreateVerificationRequestDto, QuickVerificationDto, VerificationSearchDto } from './dto/verification-request.dto';

@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('request')
  @UseGuards(AuthGuard('jwt'))
  async createVerificationRequest(
    @Body() createDto: CreateVerificationRequestDto,
    @Res() res: Response
  ) {
    try {
      const verification = await this.verificationService.createVerificationRequest(createDto);
      res.status(201).json({
        status_code: 201,
        total: 1,
        page: null,
        limit: null,
        data: verification
      });
    } catch (error) {
      res.status(400).json({
        status_code: 400,
        total: null,
        page: null,
        limit: null,
        data: {
          message: error.message,
          error: 'Bad Request'
        }
      });
    }
  }

  @Post('quick-check')
  async quickVerification(
    @Body() quickDto: QuickVerificationDto,
    @Res() res: Response
  ) {
    try {
      const result = await this.verificationService.quickVerification(quickDto);
      res.status(200).json({
        status_code: 200,
        total: 1,
        page: null,
        limit: null,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        status_code: 400,
        total: null,
        page: null,
        limit: null,
        data: {
          message: error.message,
          error: 'Bad Request'
        }
      });
    }
  }

  @Get('search')
  @UseGuards(AuthGuard('jwt'))
  async searchVerifications(
    @Query() searchDto: VerificationSearchDto,
    @Res() res: Response
  ) {
    try {
      const verifications = await this.verificationService.searchVerifications(searchDto);
      res.status(200).json({
        status_code: 200,
        total: verifications.length,
        page: 1,
        limit: 50,
        data: verifications
      });
    } catch (error) {
      res.status(400).json({
        status_code: 400,
        total: null,
        page: null,
        limit: null,
        data: {
          message: error.message,
          error: 'Bad Request'
        }
      });
    }
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async getVerificationById(
    @Param('id') id: string,
    @Res() res: Response
  ) {
    try {
      const verification = await this.verificationService.getVerificationById(id);
      res.status(200).json({
        status_code: 200,
        total: 1,
        page: null,
        limit: null,
        data: verification
      });
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        status_code: statusCode,
        total: null,
        page: null,
        limit: null,
        data: {
          message: error.message,
          error: statusCode === 404 ? 'Not Found' : 'Bad Request'
        }
      });
    }
  }

  @Get('property/:propertyId')
  @UseGuards(AuthGuard('jwt'))
  async getVerificationsByProperty(
    @Param('propertyId') propertyId: string,
    @Res() res: Response
  ) {
    try {
      const searchDto: VerificationSearchDto = { property_id: propertyId };
      const verifications = await this.verificationService.searchVerifications(searchDto);
      res.status(200).json({
        status_code: 200,
        total: verifications.length,
        page: 1,
        limit: 50,
        data: verifications
      });
    } catch (error) {
      res.status(400).json({
        status_code: 400,
        total: null,
        page: null,
        limit: null,
        data: {
          message: error.message,
          error: 'Bad Request'
        }
      });
    }
  }

  @Get('user/:email')
  @UseGuards(AuthGuard('jwt'))
  async getVerificationsByUser(
    @Param('email') email: string,
    @Res() res: Response
  ) {
    try {
      const searchDto: VerificationSearchDto = { requester_email: email };
      const verifications = await this.verificationService.searchVerifications(searchDto);
      res.status(200).json({
        status_code: 200,
        total: verifications.length,
        page: 1,
        limit: 50,
        data: verifications
      });
    } catch (error) {
      res.status(400).json({
        status_code: 400,
        total: null,
        page: null,
        limit: null,
        data: {
          message: error.message,
          error: 'Bad Request'
        }
      });
    }
  }
}
