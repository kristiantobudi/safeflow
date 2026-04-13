import {
  Body,
  Controller,
  Req,
  UseGuards,
  Post,
  Patch,
  Param,
  Get,
  Delete,
  UseInterceptors,
  UploadedFile,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { VendorService } from './vendor.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@repo/database';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Controller('vendor')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('logo'))
  async addVendor(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: CreateVendorDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.vendorService.addVendor(data, userId, file);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('logo'))
  async updateVendor(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: UpdateVendorDto,
    @CurrentUser('id') userId: string,
    @Param('id') vendorId: string,
  ) {
    return this.vendorService.updateVendor(data, userId, vendorId, file);
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.vendorService.findAll(page, limit);
  }

  @Get(':id')
  async findOne(
    @Param('id') vendorId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.vendorService.findOne(vendorId, userId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(
    @Param('id') vendorId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.vendorService.remove(vendorId, userId);
  }
}
