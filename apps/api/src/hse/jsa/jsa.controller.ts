import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JsaService } from './jsa.service';
import { CreateJsaDto } from './dto/create-jsa.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { VendorCertifiedGuard } from '../vendor-certification/vendor-certified.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@repo/database';

@Controller('jsa')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JsaController {
  constructor(private readonly jsaService: JsaService) {}

  /**
   * POST /api/v1/jsa
   * Buat JSA baru. Vendor harus memiliki sertifikasi aktif.
   */
  @Post()
  @Roles(Role.USER, Role.ADMIN)
  @UseGuards(JwtAuthGuard, VendorCertifiedGuard)
  create(
    @Body() createJsaDto: CreateJsaDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.jsaService.create(createJsaDto, userId);
  }

  /**
   * GET /api/v1/jsa
   * List semua JSA yang dapat diakses user.
   */
  @Get()
  @Roles(Role.USER, Role.ADMIN, Role.VERIFICATOR, Role.EXAMINER)
  findAll(@CurrentUser() user: any) {
    return this.jsaService.findAll(user.id, user.role);
  }

  /**
   * GET /api/v1/jsa/:id
   * Detail JSA.
   */
  @Get(':id')
  @Roles(Role.USER, Role.ADMIN, Role.VERIFICATOR, Role.EXAMINER)
  findOne(@Param('id') id: string) {
    return this.jsaService.findOne(id);
  }

  /**
   * PATCH /api/v1/jsa/:id/submit
   * Submit JSA untuk approval. Vendor harus memiliki sertifikasi aktif.
   */
  @Patch(':id/submit')
  @Roles(Role.USER, Role.ADMIN)
  @UseGuards(JwtAuthGuard, VendorCertifiedGuard)
  submit(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.jsaService.submit(id, userId);
  }
}
