import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { MailService } from '../mail/mail.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InvitationStatus, Role } from '@repo/database';
import * as crypto from 'crypto';

export interface SendInviteDto {
  email: string;
  role?: Role;
  note?: string;
}

export interface BulkInviteDto {
  invites: SendInviteDto[];
}

export interface BulkInviteResult {
  successful: Array<{ email: string; invitationId: string }>;
  failed: Array<{ email: string; reason: string }>;
  summary: { total: number; sent: number; failed: number };
}

@Injectable()
export class InvitationsService {
  private readonly EXPIRES_DAYS = 7;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly mailService: MailService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: any,
  ) {}

  // ─── Kirim Satu Undangan ─────────────────────────────────────────────────

  async sendInvitation(
    dto: SendInviteDto,
    invitedById: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const { email, role = Role.USER, note } = dto;

    // 1. Email sudah jadi user aktif?
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException(
        `Email ${email} sudah terdaftar sebagai pengguna aktif.`,
      );
    }

    // 2. Sudah ada undangan PENDING untuk email ini?
    const pendingInvite = await this.prisma.invitation.findFirst({
      where: { email, status: InvitationStatus.PENDING },
    });

    if (pendingInvite) {
      if (new Date() > pendingInvite.expiresAt) {
        await this.prisma.invitation.update({
          where: { id: pendingInvite.id },
          data: { status: InvitationStatus.EXPIRED },
        });
      } else {
        throw new BadRequestException(
          `Undangan aktif untuk ${email} sudah ada. Gunakan endpoint resend atau revoke dulu.`,
        );
      }
    }

    // 3. Ambil data admin yang mengundang
    const inviter = await this.prisma.user.findUnique({
      where: { id: invitedById },
      select: { email: true, username: true, displayName: true },
    });

    // 4. Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.EXPIRES_DAYS);

    // 5. Simpan ke DB
    const invitation = await this.prisma.invitation.create({
      data: {
        email,
        token,
        role,
        note: note || null,
        invitedById,
        expiresAt,
        status: InvitationStatus.PENDING,
      },
      include: {
        invitedBy: {
          select: { id: true, email: true, username: true, displayName: true },
        },
      },
    });

    // 6. Kirim email undangan (non-blocking)
    this.mailService.sendInvitationEmail({
      recipientEmail: email,
      inviterName: inviter?.displayName || inviter?.username || 'Admin',
      inviterEmail: inviter?.email || '',
      role,
      token,
      note,
      expiresAt,
    });

    await this.auditLogService.log({
      userId: invitedById,
      action: 'INVITATION_SENT',
      entity: 'Invitation',
      entityId: invitation.id,
      newValue: { email, role, expiresAt },
      ipAddress,
      userAgent,
      status: 'SUCCESS',
    });

    this.logger.log(
      `Invitation sent to ${email} by ${invitedById}`,
      'InvitationsService',
    );
    return invitation;
  }

  // ─── Bulk Invite ─────────────────────────────────────────────────────────

  async sendBulkInvitations(
    dto: BulkInviteDto,
    invitedById: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<BulkInviteResult> {
    const { invites } = dto;

    // Deduplikasi email dalam satu batch
    const seen = new Set<string>();
    const deduped = invites.filter(({ email }) => {
      const key = email.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const successful: BulkInviteResult['successful'] = [];
    const failed: BulkInviteResult['failed'] = [];

    await Promise.allSettled(
      deduped.map(async (invite) => {
        try {
          const result = await this.sendInvitation(
            invite,
            invitedById,
            ipAddress,
            userAgent,
          );
          successful.push({ email: invite.email, invitationId: result.id });
        } catch (err: any) {
          failed.push({ email: invite.email, reason: err.message });
        }
      }),
    );

    await this.auditLogService.log({
      userId: invitedById,
      action: 'INVITATION_BULK_SENT',
      entity: 'Invitation',
      newValue: {
        total: deduped.length,
        sent: successful.length,
        failed: failed.length,
        emails: successful.map((s) => s.email),
      },
      ipAddress,
      userAgent,
      status: successful.length > 0 ? 'SUCCESS' : 'FAILURE',
    });

    this.logger.log(
      `Bulk invite: ${successful.length} sent, ${failed.length} failed`,
      'InvitationsService',
    );

    return {
      successful,
      failed,
      summary: {
        total: deduped.length,
        sent: successful.length,
        failed: failed.length,
      },
    };
  }

  // ─── Validasi Token ──────────────────────────────────────────────────────

  async validateToken(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        invitedBy: {
          select: { id: true, email: true, username: true, displayName: true },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException(
        'Link undangan tidak valid atau tidak ditemukan.',
      );
    }
    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException('Undangan ini sudah digunakan.');
    }
    if (invitation.status === InvitationStatus.REVOKED) {
      throw new BadRequestException('Undangan ini telah dicabut oleh admin.');
    }
    if (
      invitation.status === InvitationStatus.EXPIRED ||
      new Date() > invitation.expiresAt
    ) {
      if (invitation.status !== InvitationStatus.EXPIRED) {
        await this.prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.EXPIRED },
        });
      }
      throw new BadRequestException(
        `Link undangan sudah kedaluwarsa (berlaku ${this.EXPIRES_DAYS} hari).`,
      );
    }

    return {
      valid: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        note: invitation.note,
        expiresAt: invitation.expiresAt,
        invitedBy: invitation.invitedBy,
      },
    };
  }

  // ─── Accept Invitation ───────────────────────────────────────────────────

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
    });
    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Token undangan tidak valid.');
    }

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedById: userId,
        acceptedAt: new Date(),
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        invitationToken: token,
        role: invitation.role,
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'INVITATION_ACCEPTED',
      entity: 'Invitation',
      entityId: invitation.id,
      status: 'SUCCESS',
    });

    this.logger.log(
      `Invitation accepted: ${invitation.email} (userId: ${userId})`,
      'InvitationsService',
    );
    return invitation;
  }

  // ─── Revoke ──────────────────────────────────────────────────────────────

  async revokeInvitation(
    invitationId: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation) throw new NotFoundException('Undangan tidak ditemukan.');
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Undangan tidak bisa dibatalkan, status saat ini: ${invitation.status}`,
      );
    }

    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REVOKED, revokedAt: new Date() },
    });

    await this.auditLogService.log({
      userId: adminId,
      action: 'INVITATION_REVOKED',
      entity: 'Invitation',
      entityId: invitationId,
      ipAddress,
      userAgent,
      status: 'SUCCESS',
    });

    return {
      message: `Undangan untuk ${invitation.email} berhasil dibatalkan.`,
    };
  }

  // ─── Resend ──────────────────────────────────────────────────────────────

  async resendInvitation(
    invitationId: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        invitedBy: {
          select: { email: true, username: true, displayName: true },
        },
      },
    });
    if (!invitation) throw new NotFoundException('Undangan tidak ditemukan.');
    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException(
        'Undangan ini sudah diterima, tidak bisa dikirim ulang.',
      );
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.EXPIRES_DAYS);

    const updated = await this.prisma.invitation.update({
      where: { id: invitationId },
      data: {
        token: newToken,
        status: InvitationStatus.PENDING,
        expiresAt,
        revokedAt: null,
      },
      include: {
        invitedBy: {
          select: { id: true, email: true, username: true, displayName: true },
        },
      },
    });

    // Kirim ulang email
    const inviter = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { email: true, username: true, displayName: true },
    });

    this.mailService.sendInvitationEmail({
      recipientEmail: updated.email,
      inviterName: inviter?.displayName || inviter?.username || 'Admin',
      inviterEmail: inviter?.email || '',
      role: updated.role,
      token: newToken,
      note: updated.note || undefined,
      expiresAt,
    });

    await this.auditLogService.log({
      userId: adminId,
      action: 'INVITATION_RESENT',
      entity: 'Invitation',
      entityId: invitationId,
      ipAddress,
      userAgent,
      status: 'SUCCESS',
    });

    return updated;
  }

  // ─── List & Stats ────────────────────────────────────────────────────────

  async findAll(
    options: {
      status?: InvitationStatus;
      email?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { status, email, page = 1, limit = 20 } = options;
    const where: any = {};
    if (status) where.status = status;
    if (email) where.email = { contains: email, mode: 'insensitive' };

    const skip = (page - 1) * limit;
    const [invitations, total] = await Promise.all([
      this.prisma.invitation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          invitedBy: {
            select: {
              id: true,
              email: true,
              username: true,
              displayName: true,
            },
          },
        },
      }),
      this.prisma.invitation.count({ where }),
    ]);

    // Auto-expire yang lewat batas
    const now = new Date();
    const toExpire = invitations
      .filter(
        (inv) => inv.status === InvitationStatus.PENDING && now > inv.expiresAt,
      )
      .map((inv) => inv.id);
    if (toExpire.length) {
      await this.prisma.invitation.updateMany({
        where: { id: { in: toExpire } },
        data: { status: InvitationStatus.EXPIRED },
      });
    }

    return {
      invitations: invitations.map((inv) => ({
        ...inv,
        status:
          inv.status === InvitationStatus.PENDING && now > inv.expiresAt
            ? InvitationStatus.EXPIRED
            : inv.status,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats() {
    const [total, pending, accepted, expired, revoked] = await Promise.all([
      this.prisma.invitation.count(),
      this.prisma.invitation.count({
        where: { status: InvitationStatus.PENDING },
      }),
      this.prisma.invitation.count({
        where: { status: InvitationStatus.ACCEPTED },
      }),
      this.prisma.invitation.count({
        where: { status: InvitationStatus.EXPIRED },
      }),
      this.prisma.invitation.count({
        where: { status: InvitationStatus.REVOKED },
      }),
    ]);
    return { total, pending, accepted, expired, revoked };
  }
}
