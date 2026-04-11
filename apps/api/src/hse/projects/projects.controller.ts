import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { HiracService } from '../hirac/hirac.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateHiracDto } from '../hirac/dto/create-hirac.dto';
import { ReviewProjectDto } from './dto/review-project.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApprovalStepGuard } from '../../common/guards/approval.guard';
import { Role } from '@repo/database';
import { SubmitProjectDto } from './dto/submit-project.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly hiracService: HiracService,
  ) {}

  // ─── Project CRUD ─────────────────────────────────────────────────────────

  @Post()
  @Roles(Role.ADMIN, Role.USER, Role.VERIFICATOR, Role.EXAMINER)
  create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.create(createProjectDto, userId);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.projectsService.findAll(user.id, user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  // ─── Submit (dengan optional changeNote untuk menjelaskan revisi) ──────────

  @Patch(':id/submit')
  @Roles(Role.USER, Role.ADMIN)
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitProjectDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.submitProject(id, userId, dto.changeNote);
  }

  // ─── Approval flow ────────────────────────────────────────────────────────

  @Post(':id/approve')
  @UseGuards(ApprovalStepGuard)
  approve(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() reviewProjectDto: ReviewProjectDto,
  ) {
    return this.projectsService.approveProject(
      id,
      user.id,
      user.role,
      reviewProjectDto,
    );
  }

  @Post(':id/reject')
  @UseGuards(ApprovalStepGuard)
  reject(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() reviewProjectDto: ReviewProjectDto,
  ) {
    return this.projectsService.rejectProject(
      id,
      user.id,
      user.role,
      reviewProjectDto,
    );
  }

  // ─── Version control endpoints ────────────────────────────────────────────

  /**
   * GET /projects/:id/versions
   * List semua versi dokumen beserta status dan metadata-nya.
   * Bisa diakses oleh creator maupun reviewer.
   */
  @Get(':id/versions')
  @Roles(Role.USER, Role.ADMIN, Role.VERIFICATOR, Role.EXAMINER)
  getVersions(@Param('id') id: string) {
    return this.projectsService.getVersions(id);
  }

  /**
   * GET /projects/:id/versions/compare?vA=1&vB=2
   * Tampilkan diff antara dua versi HIRAC.
   * Contoh: compare versi sebelum reject (v1) vs setelah revisi (v2).
   */
  @Get(':id/versions/compare')
  @Roles(Role.USER, Role.ADMIN, Role.VERIFICATOR, Role.EXAMINER)
  compareVersions(
    @Param('id') id: string,
    @Query('vA', new ParseIntPipe({ optional: true })) vA?: number,
    @Query('vB', new ParseIntPipe({ optional: true })) vB?: number,
  ) {
    return this.projectsService.compareVersions(id, vA, vB);
  }

  // ─── HIRAC endpoints ──────────────────────────────────────────────────────

  @Post(':id/hirac')
  @Roles(Role.USER, Role.ADMIN)
  addHirac(
    @Param('id') projectId: string,
    @Body() createHiracDto: CreateHiracDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.hiracService.addHiracToProject(
      projectId,
      createHiracDto,
      userId,
    );
  }

  @Patch(':projectId/hirac/:id')
  @Roles(Role.USER, Role.ADMIN)
  updateHirac(
    @Param('id') id: string,
    @Body() updateHiracDto: Partial<CreateHiracDto>,
    @CurrentUser('id') userId: string,
  ) {
    return this.hiracService.updateHirac(id, updateHiracDto, userId);
  }

  @Delete(':projectId/hirac/:id')
  @Roles(Role.USER, Role.ADMIN)
  removeHirac(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.hiracService.deleteHirac(id, userId);
  }

  /**
   * PATCH /projects/:projectId/hirac/:id/restore
   * Undo soft-delete HIRAC selama project masih DRAFT/REVISION.
   */
  @Patch(':projectId/hirac/:id/restore')
  @Roles(Role.USER, Role.ADMIN)
  restoreHirac(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.hiracService.restoreHirac(id, userId);
  }
}
