import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { SingleInviteDto, BulkInviteDto } from './dto/invite.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Role, InvitationStatus } from '@repo/database';

@Controller('invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  // ─── Admin Endpoints ────────────────────────────────────────────────────

  /**
   * POST /invitations
   * Kirim satu undangan
   * Body: { email, role?, note? }
   */
  @Post()
  // @Roles(Role.ADMIN, Role.MODERATOR)
  @Roles(Role.ADMIN)
  async sendOne(
    @Body() dto: SingleInviteDto,
    @CurrentUser('id') adminId: string,
    @Request() req: any,
  ) {
    const invitation = await this.invitationsService.sendInvitation(
      dto,
      adminId,
      req.ip,
      req.headers['user-agent'],
    );
    return {
      message: `Undangan berhasil dikirim ke ${dto.email}`,
      data: invitation,
    };
  }

  /**
   * POST /invitations/bulk
   * Kirim banyak undangan sekaligus (maks 50)
   * Body: { invites: [{ email, role?, note? }, ...] }
   */
  @Post('bulk')
  // @Roles(Role.ADMIN, Role.MODERATOR)
  @Roles(Role.ADMIN)
  async sendBulk(
    @Body() dto: BulkInviteDto,
    @CurrentUser('id') adminId: string,
    @Request() req: any,
  ) {
    const result = await this.invitationsService.sendBulkInvitations(
      dto,
      adminId,
      req.ip,
      req.headers['user-agent'],
    );
    return {
      message: `${result.summary.sent} undangan berhasil, ${result.summary.failed} gagal`,
      data: result,
    };
  }

  /**
   * GET /invitations
   * List semua undangan dengan filter & paginasi
   * Query: ?status=PENDING&email=foo&page=1&limit=20
   */
  @Get()
  // @Roles(Role.ADMIN, Role.MODERATOR)
  @Roles(Role.ADMIN)
  async findAll(
    @Query('status') status?: InvitationStatus,
    @Query('email') email?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    const result = await this.invitationsService.findAll({
      status,
      email,
      page,
      limit,
    });
    return { message: 'Daftar undangan berhasil diambil', data: result };
  }

  /**
   * GET /invitations/stats
   * Statistik ringkas undangan
   */
  @Get('stats')
  @Roles(Role.ADMIN)
  async getStats() {
    const stats = await this.invitationsService.getStats();
    return { message: 'Statistik undangan', data: stats };
  }

  /**
   * DELETE /invitations/:id/revoke
   * Batalkan undangan yang masih PENDING
   */
  @Delete(':id/revoke')
  @HttpCode(HttpStatus.OK)
  // @Roles(Role.ADMIN, Role.MODERATOR)
  @Roles(Role.ADMIN)
  async revoke(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Request() req: any,
  ) {
    const result = await this.invitationsService.revokeInvitation(
      id,
      adminId,
      req.ip,
      req.headers['user-agent'],
    );
    return { message: result.message, data: null };
  }

  /**
   * PATCH /invitations/:id/resend
   * Kirim ulang undangan (generate token baru + perpanjang expiry)
   */
  @Patch(':id/resend')
  @HttpCode(HttpStatus.OK)
  // @Roles(Role.ADMIN, Role.MODERATOR)
  @Roles(Role.ADMIN)
  async resend(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Request() req: any,
  ) {
    const invitation = await this.invitationsService.resendInvitation(
      id,
      adminId,
      req.ip,
      req.headers['user-agent'],
    );
    return {
      message: `Undangan dikirim ulang ke ${invitation.email}`,
      data: invitation,
    };
  }

  // ─── Public Endpoints (untuk user yang menerima undangan) ───────────────

  /**
   * GET /invitations/verify/:token
   * Validasi token dari link undangan — PUBLIC
   * Frontend memanggil ini saat user buka link invite
   * Response berisi: email, role, invitedBy, expiresAt
   */
  @Public()
  @Get('verify/:token')
  async verifyToken(@Param('token') token: string) {
    const result = await this.invitationsService.validateToken(token);
    return {
      message: 'Token undangan valid',
      data: result,
    };
  }
}
