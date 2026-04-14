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
import * as ExcelJS from 'exceljs';

@Controller('worker-vendor')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkerVendorController {
  constructor(private readonly workerVendorService: WorkerVendorService) {}

  @Post()
  @Roles(Role.ADMIN, Role.VERIFICATOR, Role.EXAMINER)
  async addWorkerVendor(
    @Body() data: CreateWorkerVendorDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.workerVendorService.addWorkerVendor(data, userId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.VERIFICATOR, Role.EXAMINER)
  async findAllWorkerVendor(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.workerVendorService.findAll(page, limit, search);
  }

  @Post('register-bulk')
  @Roles(Role.ADMIN, Role.VERIFICATOR, Role.EXAMINER)
  @UseInterceptors(FileInterceptor('file'))
  async uploadWorkerVendor(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    return this.workerVendorService.bulkRegisterWorkerVendor(file, userId);
  }

  @Get('download-template')
  @Roles(Role.ADMIN, Role.VERIFICATOR, Role.EXAMINER)
  async downloadTemplateRegisterWorkerVendor(@Res() res: Response) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template');

    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = '📋 Template REGISTER WORKER VENDOR';
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:E2');
    const descriptionCell = worksheet.getCell('A2');
    descriptionCell.value =
      'Isi data mulai baris ke-5 ▸ Kolom merah (*) = wajib diisi ▸ Jangan ubah baris header';
    descriptionCell.font = { italic: true, color: { argb: 'FF0000' } };
    descriptionCell.alignment = { horizontal: 'center' };

    const headerRow = worksheet.getRow(4);
    const headers = [
      'No',
      'Nama Lengkap *',
      'No. Telepon',
      'Alamat',
      'Vendor *',
    ];
    headerRow.values = headers;
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: (headers[colNumber - 1] || '').toString().includes('*')
            ? 'FF0000'
            : '444444',
        },
      };
      cell.alignment = { horizontal: 'center' };
    });

    worksheet.getColumn(2).width = 30;
    worksheet.getColumn(3).width = 30;
    worksheet.getColumn(4).width = 50;
    worksheet.getColumn(5).width = 50;

    worksheet.addRow([
      1,
      'Budi Santoso',
      '08123456789',
      'Jl. Sudirman No. 123, Jakarta Selatan',
      'PT. ABC',
    ]);

    const vendors = await this.workerVendorService.findVendors();
    const vendorNames = vendors.map((v) => v.vendorName);

    for (let i = 5; i < 105; i++) {
      if (vendorNames.length > 0) {
        worksheet.getCell(`E${i}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`"${vendorNames.join(',')}"`],
        };
      }
    }

    res.setHeader(
      'Content-Disposition',
      'attachment; filename=template-worker-vendor.xlsx',
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    await workbook.xlsx.write(res);
    res.end();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.VERIFICATOR, Role.EXAMINER)
  async findOneWorkerVendor(@Param('id') id: string) {
    return this.workerVendorService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.VERIFICATOR, Role.EXAMINER)
  async updateWorkerVendor(
    @Param('id') id: string,
    @Body() data: UpdateWorkerVendorDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.workerVendorService.updateWorkerVendor(id, data, userId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.VERIFICATOR, Role.EXAMINER)
  async removeWorkerVendor(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workerVendorService.remove(id, userId);
  }
}
