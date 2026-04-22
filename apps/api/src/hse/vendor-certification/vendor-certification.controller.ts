import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import * as Yup from 'yup';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Role } from '@repo/database';
import { YupValidationPipe } from 'src/common/pipes/yup-validation.pipe';
import { CertificationProgramService } from './certification-program.service';
import { VendorCertificationService } from './vendor-certification.service';

// ─── Yup Schemas ─────────────────────────────────────────────────────────────

const createProgramSchema = Yup.object({
  name: Yup.string().required('name is required'),
  description: Yup.string().optional(),
  validityDays: Yup.number().integer().min(1).optional(),
  moduleIds: Yup.array().of(Yup.string().required()).optional(),
});

const updateProgramSchema = Yup.object({
  name: Yup.string().optional(),
  description: Yup.string().optional(),
  validityDays: Yup.number().integer().min(1).optional(),
  moduleIds: Yup.array().of(Yup.string().required()).optional(),
  isActive: Yup.boolean().optional(),
});

const assignModulesSchema = Yup.object({
  moduleIds: Yup.array()
    .of(Yup.string().required())
    .required('moduleIds is required')
    .min(1, 'At least one moduleId is required'),
});

const assignVendorProgramSchema = Yup.object({
  certificationProgramId: Yup.string().required(
    'certificationProgramId is required',
  ),
});

const revokeCertificationSchema = Yup.object({
  reason: Yup.string().required('reason is required'),
});

// ─── Controller 1: Certification Programs ────────────────────────────────────

/**
 * Handles all /certification-programs routes.
 * Admin-only CRUD for certification programs and module assignment.
 */
@Controller('certification-programs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CertificationProgramController {
  constructor(
    private readonly certProgramService: CertificationProgramService,
  ) {}

  /**
   * POST /api/v1/certification-programs
   * Create a new certification program.
   */
  @Post()
  @Roles(Role.ADMIN)
  createProgram(
    @Body(new YupValidationPipe(createProgramSchema)) dto: Yup.InferType<typeof createProgramSchema>,
    @CurrentUser('id') adminId: string,
  ) {
    return this.certProgramService.create(dto as any, adminId);
  }

  /**
   * GET /api/v1/certification-programs
   * List all certification programs (paginated).
   */
  @Get()
  @Roles(Role.ADMIN)
  findAllPrograms(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.certProgramService.findAll(page, limit, search);
  }

  /**
   * GET /api/v1/certification-programs/:id
   * Get a single certification program by ID.
   */
  @Get(':id')
  @Roles(Role.ADMIN)
  findOneProgram(@Param('id') programId: string) {
    return this.certProgramService.findOne(programId);
  }

  /**
   * PATCH /api/v1/certification-programs/:id
   * Update a certification program.
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  updateProgram(
    @Param('id') programId: string,
    @Body(new YupValidationPipe(updateProgramSchema)) dto: Yup.InferType<typeof updateProgramSchema>,
    @CurrentUser('id') adminId: string,
  ) {
    return this.certProgramService.update(programId, dto as any, adminId);
  }

  /**
   * DELETE /api/v1/certification-programs/:id
   * Soft-delete a certification program.
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  removeProgram(
    @Param('id') programId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.certProgramService.remove(programId, adminId);
  }

  /**
   * GET /api/v1/certification-programs/available-modules
   * List all available (non-deleted) training modules for selection.
   */
  @Get('available-modules')
  @Roles(Role.ADMIN)
  getAvailableModules() {
    return this.certProgramService.findAvailableModules();
  }

  /**
   * POST /api/v1/certification-programs/:id/modules
   * Assign (replace) modules for a certification program.
   */
  @Post(':id/modules')
  @Roles(Role.ADMIN)
  assignModules(
    @Param('id') programId: string,
    @Body(new YupValidationPipe(assignModulesSchema)) dto: Yup.InferType<typeof assignModulesSchema>,
    @CurrentUser('id') adminId: string,
  ) {
    return this.certProgramService.assignModulesToProgram(
      programId,
      dto.moduleIds as string[],
      adminId,
    );
  }
}

// ─── Controller 2: Vendor Certifications ─────────────────────────────────────

/**
 * Handles all /vendors/:vendorId/certification-program and
 * /vendors/:vendorId/certifications routes.
 */
@Controller('vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorCertificationController {
  constructor(
    private readonly certProgramService: CertificationProgramService,
    private readonly vendorCertService: VendorCertificationService,
  ) {}

  /**
   * POST /api/v1/vendors/:vendorId/certification-program
   * Assign a certification program to a vendor (admin only).
   */
  @Post(':vendorId/certification-program')
  @Roles(Role.ADMIN)
  assignVendorToProgram(
    @Param('vendorId') vendorId: string,
    @Body(new YupValidationPipe(assignVendorProgramSchema))
    dto: Yup.InferType<typeof assignVendorProgramSchema>,
    @CurrentUser('id') adminId: string,
  ) {
    return this.certProgramService.assignVendorToProgram(
      vendorId,
      dto.certificationProgramId,
      adminId,
    );
  }

  /**
   * POST /api/v1/vendors/:vendorId/certifications/revoke
   * Revoke a vendor's active certification (admin only).
   */
  @Post(':vendorId/certifications/revoke')
  @Roles(Role.ADMIN)
  revokeCertification(
    @Param('vendorId') vendorId: string,
    @Body(new YupValidationPipe(revokeCertificationSchema))
    dto: Yup.InferType<typeof revokeCertificationSchema>,
    @CurrentUser('id') adminId: string,
  ) {
    return this.vendorCertService.revokeCertificationByVendor(
      vendorId,
      adminId,
      dto.reason,
    );
  }

  /**
   * POST /api/v1/vendors/:vendorId/certifications/renew
   * Renew a vendor's certification (admin only).
   */
  @Post(':vendorId/certifications/renew')
  @Roles(Role.ADMIN)
  renewCertification(
    @Param('vendorId') vendorId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.vendorCertService.renewCertification(vendorId, adminId);
  }

  /**
   * GET /api/v1/vendors/my-program
   * Get the certification program progress for the currently logged-in vendor user.
   */
  @Get('my-program')
  @Roles(Role.USER)
  getMyProgram(@CurrentUser('id') userId: string) {
    return this.vendorCertService.getMyProgram(userId);
  }

  /**
   * GET /api/v1/vendors/:vendorId/certifications
   * Get certification status for a vendor.
   * Accessible by ADMIN or the vendor user themselves.
   */
  @Get(':vendorId/certifications')
  getVendorCertifications(@Param('vendorId') vendorId: string) {
    return this.vendorCertService.getVendorCertifications(vendorId);
  }

  /**
   * POST /api/v1/vendors/:vendorId/certifications/check
   * Trigger checkAndIssueCertification for a vendor.
   * Accessible by the vendor user or admin.
   */
  @Post(':vendorId/certifications/check')
  checkAndIssueCertification(
    @Param('vendorId') vendorId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.vendorCertService.checkAndIssueCertification(userId, vendorId);
  }
}
