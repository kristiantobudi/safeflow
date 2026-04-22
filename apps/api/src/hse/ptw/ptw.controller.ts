import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { PtwService } from './ptw.service';
import { CreatePtwDto } from './dto/create-ptw.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { VendorCertifiedGuard } from '../vendor-certification/vendor-certified.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@repo/database';

@Controller('ptw')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PtwController {
  constructor(private readonly ptwService: PtwService) {}

  /**
   * POST /api/v1/ptw
   * Buat PTW baru. Vendor harus memiliki sertifikasi aktif.
   */
  @Post()
  @Roles(Role.USER, Role.ADMIN)
  @UseGuards(JwtAuthGuard, VendorCertifiedGuard)
  create(
    @Body() createPtwDto: CreatePtwDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.ptwService.create(createPtwDto, userId);
  }

  /**
   * GET /api/v1/ptw
   * List semua PTW yang dapat diakses user.
   */
  @Get()
  @Roles(Role.USER, Role.ADMIN, Role.VERIFICATOR, Role.EXAMINER)
  findAll(@CurrentUser() user: any) {
    return this.ptwService.findAll(user.id, user.role);
  }

  /**
   * GET /api/v1/ptw/:id
   * Detail PTW.
   */
  @Get(':id')
  @Roles(Role.USER, Role.ADMIN, Role.VERIFICATOR, Role.EXAMINER)
  findOne(@Param('id') id: string) {
    return this.ptwService.findOne(id);
  }

  /**
   * PATCH /api/v1/ptw/:id/submit
   * Submit PTW untuk approval. Vendor harus memiliki sertifikasi aktif.
   */
  @Patch(':id/submit')
  @Roles(Role.USER, Role.ADMIN)
  @UseGuards(JwtAuthGuard, VendorCertifiedGuard)
  submit(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ptwService.submit(id, userId);
  }
}
