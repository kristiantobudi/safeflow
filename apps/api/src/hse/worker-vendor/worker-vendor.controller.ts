import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WorkerVendorService } from './worker-vendor.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateWorkerVendorDto } from './dto/create-worker-vendor.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Role } from '@repo/database';
import { UpdateWorkerVendorDto } from './dto/update-worker-vendor.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('worker-vendor')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkerVendorController {
  constructor(private readonly workerVendorService: WorkerVendorService) {}

  @Post()
  @Roles(Role.ADMIN)
  async addWorkerVendor(
    @Body() data: CreateWorkerVendorDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.workerVendorService.addWorkerVendor(data, userId);
  }

  @Post('register-bulk')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadWorkerVendor(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    return this.workerVendorService.bulkRegisterWorkerVendor(file, userId);
  }

  @Get('download-template')
  @Roles(Role.ADMIN)
  async downloadTemplateRegisterWorkerVendor(@Res() res: Response) {
    const buffer = await this.workerVendorService.generateRegisterTemplate();

    res.setHeader(
      'Content-Disposition',
      'attachment; filename=template-worker-vendor.xlsx',
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async updateWorkerVendor(
    @Param('id') id: string,
    @Body() data: UpdateWorkerVendorDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.workerVendorService.updateWorkerVendor(id, data, userId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async removeWorkerVendor(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workerVendorService.remove(id, userId);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  async findOneWorkerVendor(@Param('id') id: string) {
    return this.workerVendorService.findOne(id);
  }

  @Get()
  @Roles(Role.ADMIN)
  async findAllWorkerVendor(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.workerVendorService.findAll(page, limit);
  }
}
