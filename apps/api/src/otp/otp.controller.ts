import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { OtpService } from './otp.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('otp')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  /**
   * GET /otp/status
   * Check if 2FA is enabled for the current user
   */
  @Get('status')
  async getStatus(@CurrentUser('id') userId: string) {
    const enabled = await this.otpService.is2FAEnabled(userId);
    return {
      message: '2FA status fetched',
      data: { twoFactorEnabled: enabled },
    };
  }

  /**
   * POST /otp/setup
   * Step 1: Generate secret + QR code. Scan with Google Authenticator / Authy.
   */
  @Post('setup')
  async setup(@CurrentUser('id') userId: string) {
    const result = await this.otpService.generate2FASecret(userId);
    return { message: result.message, data: result };
  }

  /**
   * POST /otp/enable
   * Step 2: Confirm with OTP token to ACTIVATE 2FA.
   * Body: { token: "123456" }
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('enable')
  @HttpCode(HttpStatus.OK)
  async enable(
    @CurrentUser('id') userId: string,
    @Body('token') token: string,
    @Request() req: any,
  ) {
    const result = await this.otpService.enable2FA(
      userId,
      token,
      req.ip,
      req.headers['user-agent'],
    );
    return {
      message: result.message,
      data: { backupCodes: result.backupCodes, warning: result.warning },
    };
  }

  /**
   * DELETE /otp/disable
   * Disable 2FA. Requires current valid OTP token.
   * Body: { token: "123456" }
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Delete('disable')
  @HttpCode(HttpStatus.OK)
  async disable(
    @CurrentUser('id') userId: string,
    @Body('token') token: string,
    @Request() req: any,
  ) {
    const result = await this.otpService.disable2FA(
      userId,
      token,
      req.ip,
      req.headers['user-agent'],
    );
    return { message: result.message, data: null };
  }

  /**
   * POST /otp/backup-codes/regenerate
   * Regenerate backup codes. Requires valid OTP.
   * Body: { token: "123456" }
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('backup-codes/regenerate')
  @HttpCode(HttpStatus.OK)
  async regenerateBackupCodes(
    @CurrentUser('id') userId: string,
    @Body('token') token: string,
  ) {
    const result = await this.otpService.regenerateBackupCodes(userId, token);
    return { message: 'Backup codes regenerated', data: result };
  }
}
