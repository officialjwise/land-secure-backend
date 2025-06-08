import { Controller, Get, Put, Post, Delete, Body, Param, Query, Res, UseGuards, SetMetadata, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { Response } from 'express';
import { UsersService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from './roles.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UpdateProfileDto } from './dto/update-profile.dto';

// Custom decorator for roles
const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('buyer', 'seller', 'admin')
  async getMyProfile(@Res() res: Response) {
    const requestUser = res.locals.user;
    const profile = await this.usersService.getMyProfile(requestUser.userId);
    res.status(200).json({ statusCode: 200, data: profile });
  }

  @Put('me')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('buyer', 'seller', 'admin')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'selfieImage', maxCount: 1 },
      { name: 'ghanaCardFrontImage', maxCount: 1 },
      { name: 'ghanaCardBackImage', maxCount: 1 },
    ]),
  )
  async updateMyProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFiles() files: { 
      selfieImage?: Express.Multer.File[]; 
      ghanaCardFrontImage?: Express.Multer.File[]; 
      ghanaCardBackImage?: Express.Multer.File[] 
    } = {}, // Default to empty object to prevent undefined errors
    @Res() res: Response,
  ) {
    try {
      const requestUser = res.locals.user;
      
      // Safely extract file buffers with optional chaining
      const fileBuffers = {
        selfieImage: files?.selfieImage?.[0]?.buffer,
        ghanaCardFrontImage: files?.ghanaCardFrontImage?.[0]?.buffer,
        ghanaCardBackImage: files?.ghanaCardBackImage?.[0]?.buffer,
      };
      
      const updateData = { ...updateProfileDto, ...fileBuffers };
      const result = await this.usersService.updateMyProfile(requestUser.userId, updateData);
      
      res.status(200).json({ 
        statusCode: 200, 
        data: result 
      });
    } catch (error) {
      // Let NestJS exception filters handle the error
      throw error;
    }
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async getAllUsers(@Query() filters: { search?: string; role?: string; status?: string }, @Query('page') page: number, @Query('limit') limit: number, @Res() res: Response) {
    const pagination = { page: +page || 1, limit: +limit || 10 };
    const users = await this.usersService.getAllUsers(filters, pagination);
    res.status(200).json({ statusCode: 200, data: users });
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async getUserById(@Param('id') id: string, @Res() res: Response) {
    const user = await this.usersService.getUserById(id);
    res.status(200).json({ statusCode: 200, data: user });
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async createUser(@Body() userData: any, @Res() res: Response) {
    const requestUser = res.locals.user;
    const user = await this.usersService.createUser(userData, requestUser.userId);
    res.status(201).json({ statusCode: 201, data: user });
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async updateUser(@Param('id') id: string, @Body() userData: any, @Res() res: Response) {
    const requestUser = res.locals.user;
    const user = await this.usersService.updateUser(id, userData, requestUser.userId);
    res.status(200).json({ statusCode: 200, data: user });
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async deleteUser(@Param('id') id: string, @Res() res: Response) {
    const requestUser = res.locals.user;
    const result = await this.usersService.deleteUser(id, requestUser.userId);
    res.status(200).json({ statusCode: 200, data: result });
  }

  @Put('roles/permissions')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async updateRolePermissions(@Body() roleData: { role: string; permissions: string[] }, @Res() res: Response) {
    const requestUser = res.locals.user;
    const result = await this.usersService.updateRolePermissions(roleData, requestUser.userId);
    res.status(200).json({ statusCode: 200, data: result });
  }
}