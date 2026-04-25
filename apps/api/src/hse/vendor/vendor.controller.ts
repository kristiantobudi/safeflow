import {
  Body,
  Controller,
  UseGuards,
  Post,
  Patch,
  Param,
  Get,
  Delete,
  UseInterceptors,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { FastifyFileInterceptor } from '../../common/interceptors/fastify-file.interceptor';
import { UploadedMultipartFile } from '../../common/decorators/uploaded-multipart-file.decorator';
import { UploadedFile as MyFile } from '../../common/interface/file.interface';
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
  @UseInterceptors(new FastifyFileInterceptor('logo'))
  async addVendor(
    @UploadedMultipartFile() file: MyFile,
    @Body() data: CreateVendorDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.vendorService.addVendor(data, userId, file);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseInterceptors(new FastifyFileInterceptor('logo'))
  async updateVendor(
    @UploadedMultipartFile() file: MyFile,
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
    @Query('search') search?: string,
  ) {
    return this.vendorService.findAll(page, limit, search);
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
