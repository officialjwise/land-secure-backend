import { Controller, Get, Post, Put, Delete, Body, Param, Query, Res, UseGuards, SetMetadata, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { Response } from 'express';
import { PropertyService } from './property.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../user/roles.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertyVerificationRequest } from './dto/property-verification-request.dto';
import { TransferRequestDto } from './dto/transfer-request.dto';
import { TransferVerificationRequest } from './dto/transfer-verification-request.dto';


// Custom decorator for roles
const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Controller('properties')
export class PropertyController {
  constructor(private propertyService: PropertyService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('seller')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'governmentId', maxCount: 1 },
      { name: 'surveyDocuments', maxCount: 1 },
    ]),
  )
  async createProperty(
    @Body() createPropertyDto: CreatePropertyDto,
    @UploadedFiles() files: { governmentId?: Express.Multer.File[]; surveyDocuments?: Express.Multer.File[] },
    @Res() res: Response,
  ) {
    const requestUser = res.locals.user;
    const fileBuffers = {
      governmentId: files.governmentId?.[0]?.buffer,
      surveyDocuments: files.surveyDocuments?.[0]?.buffer,
    };
    const property = await this.propertyService.createProperty({ ...createPropertyDto, ...fileBuffers }, requestUser.userId);
    res.status(201).json({ statusCode: 201, data: property });
  }

  @Get(':propertyId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('seller', 'admin', 'buyer')
  async getPropertyById(@Param('propertyId') propertyId: string, @Res() res: Response) {
    const property = await this.propertyService.getPropertyById(propertyId);
    res.status(200).json({ statusCode: 200, data: property });
  }

  @Put(':propertyId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('seller')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'governmentId', maxCount: 1 },
      { name: 'surveyDocuments', maxCount: 1 },
    ]),
  )
  async updateProperty(
    @Param('propertyId') propertyId: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
    @UploadedFiles() files: { governmentId?: Express.Multer.File[]; surveyDocuments?: Express.Multer.File[] },
    @Res() res: Response,
  ) {
    const requestUser = res.locals.user;
    const fileBuffers = {
      governmentId: files.governmentId?.[0]?.buffer,
      surveyDocuments: files.surveyDocuments?.[0]?.buffer,
    };
    const property = await this.propertyService.updateProperty(propertyId, { ...updatePropertyDto, ...fileBuffers }, requestUser.userId);
    res.status(200).json({ statusCode: 200, data: property });
  }

  @Delete(':propertyId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('seller')
  async deleteProperty(@Param('propertyId') propertyId: string, @Res() res: Response) {
    const requestUser = res.locals.user;
    const result = await this.propertyService.deleteProperty(propertyId, requestUser.userId);
    res.status(200).json({ statusCode: 200, data: result });
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('seller', 'admin', 'buyer')
  async getProperties(@Query() query: { search?: string; type?: string; status?: string; page?: number; limit?: number }, @Res() res: Response) {
    const properties = await this.propertyService.getProperties(query);
    res.status(200).json({ statusCode: 200, data: properties });
  }

  @Get('verification')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async getVerificationProperties(@Query() query: { status: string; search?: string; type?: string; page?: number; limit?: number }, @Res() res: Response) {
    const properties = await this.propertyService.getVerificationProperties(query);
    res.status(200).json({ statusCode: 200, data: properties });
  }

  @Put(':propertyId/approve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async approveProperty(@Param('propertyId') propertyId: string, @Body() verificationRequest: PropertyVerificationRequest, @Res() res: Response) {
    const requestUser = res.locals.user;
    const property = await this.propertyService.verifyProperty(propertyId, verificationRequest, requestUser.userId);
    res.status(200).json({ statusCode: 200, data: property });
  }

  @Put(':propertyId/reject')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async rejectProperty(@Param('propertyId') propertyId: string, @Body() verificationRequest: PropertyVerificationRequest, @Res() res: Response) {
    const requestUser = res.locals.user;
    const property = await this.propertyService.verifyProperty(propertyId, verificationRequest, requestUser.userId);
    res.status(200).json({ statusCode: 200, data: property });
  }

  @Put(':propertyId/quick-approve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async quickApproveProperty(@Param('propertyId') propertyId: string, @Res() res: Response) {
    const requestUser = res.locals.user;
    const property = await this.propertyService.quickApproveProperty(propertyId, requestUser.userId);
    res.status(200).json({ statusCode: 200, data: property });
  }

  @Put(':propertyId/quick-reject')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async quickRejectProperty(@Param('propertyId') propertyId: string, @Res() res: Response) {
    const requestUser = res.locals.user;
    const property = await this.propertyService.quickRejectProperty(propertyId, requestUser.userId);
    res.status(200).json({ statusCode: 200, data: property });
  }

  @Get(':propertyId/documents')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'seller')
  async getPropertyDocuments(@Param('propertyId') propertyId: string, @Res() res: Response) {
    const documents = await this.propertyService.getPropertyDocuments(propertyId);
    res.status(200).json({ statusCode: 200, data: documents });
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async getPropertyStats(@Res() res: Response) {
    const stats = await this.propertyService.getPropertyStats();
    res.status(200).json({ statusCode: 200, data: stats });
  }

  @Post(':propertyId/transfer')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('seller')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'transferDocuments', maxCount: 1 }]))
  async requestPropertyTransfer(
    @Param('propertyId') propertyId: string,
    @Body() transferRequest: TransferRequestDto,
    @UploadedFiles() files: { transferDocuments?: Express.Multer.File[] },
    @Res() res: Response,
  ) {
    const requestUser = res.locals.user;
    const fileBuffers = { transferDocuments: files.transferDocuments?.[0]?.buffer };
    const property = await this.propertyService.requestPropertyTransfer(propertyId, { ...transferRequest, ...fileBuffers }, requestUser.userId);
    res.status(200).json({ statusCode: 200, data: property });
  }

  @Put(':propertyId/transfer/approve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async approvePropertyTransfer(@Param('propertyId') propertyId: string, @Body() verificationRequest: TransferVerificationRequest, @Res() res: Response) {
    const requestUser = res.locals.user;
    const property = await this.propertyService.verifyPropertyTransfer(propertyId, verificationRequest, requestUser.userId);
    res.status(200).json({ statusCode: 200, data: property });
  }

  @Put(':propertyId/transfer/reject')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async rejectPropertyTransfer(@Param('propertyId') propertyId: string, @Body() verificationRequest: TransferVerificationRequest, @Res() res: Response) {
    const requestUser = res.locals.user;
    const property = await this.propertyService.verifyPropertyTransfer(propertyId, verificationRequest, requestUser.userId);
    res.status(200).json({ statusCode: 200, data: property });
  }
}