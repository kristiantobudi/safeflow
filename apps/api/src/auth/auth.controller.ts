import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Res,
  HttpCode,
  HttpStatus,
  Patch,
  Param,
  Get,
  UseInterceptors,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { FastifyReply as Response } from 'fastify';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from '../users/users.service';
import { GoogleAuthGuard } from '../common/guards/google-auth.guard';
import * as ExcelJS from 'exceljs';
import { FastifyFileInterceptor } from '../common/interceptors/fastify-file.interceptor';
import { UploadedMultipartFile } from '../common/decorators/uploaded-multipart-file.decorator';
import { UploadedFile as MyFile } from '../common/interface/file.interface';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Request() req: any) {
    const result = await this.authService.register(
      registerDto,
      req.ip,
      req.headers['user-agent'],
    );
    return { message: 'Registration successful', data: result };
  }

  @Post('register/upload-register')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'EXAMINER')
  @UseInterceptors(new FastifyFileInterceptor('file'))
  async uploadExcelToRegister(
    @UploadedMultipartFile() file: MyFile,
    @CurrentUser('id') createdBy: string,
    @Request() req: any,
  ) {
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    return this.authService.uploadExcelToRegister(
      file,
      createdBy,
      ipAddress,
      userAgent,
    );
  }

  @Get('register/download-template')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'EXAMINER')
  async getTemplateRegister(@Res() res: Response) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template');

    // Title and Instructions
    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = '📋 TEMPLATE BULK REGISTRASI USER';
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:H2');
    const instructionCell = worksheet.getCell('A2');
    instructionCell.value =
      'Isi data mulai baris ke-5 ▸ Kolom merah (*) = wajib diisi ▸ Jangan ubah baris header';
    instructionCell.font = { italic: true, color: { argb: 'FF0000' } };
    instructionCell.alignment = { horizontal: 'center' };

    // Header at Row 4
    const headerRow = worksheet.getRow(4);
    const headers = [
      'No',
      'First Name *',
      'Last Name',
      'Email *',
      'Password *',
      'Role *',
      'No. HP',
      'Vendor',
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

    // Formatting columns
    worksheet.getColumn(2).width = 20; // First Name
    worksheet.getColumn(3).width = 20; // Last Name
    worksheet.getColumn(4).width = 30; // Email
    worksheet.getColumn(5).width = 20; // Password
    worksheet.getColumn(6).width = 15; // Role
    worksheet.getColumn(7).width = 20; // No HP
    worksheet.getColumn(8).width = 25; // Vendor

    // Sample Data at Row 5
    worksheet.addRow([
      1,
      'John',
      'Doe',
      'john.doe@example.com',
      'Password123!',
      'USER',
      '08123456789',
      'PT Sample',
    ]);

    // Fetch Vendors for Dropdown
    const vendors = await this.usersService.findVendors();
    const vendorNames = vendors.map((v) => v.vendorName);

    // Add dropdowns for 100 rows starting from row 5
    for (let i = 5; i <= 105; i++) {
      // Role Dropdown
      worksheet.getCell(`F${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"USER,ADMIN,EXAMINER,VERIFICATOR"'],
      };

      // Vendor Dropdown
      if (vendorNames.length > 0) {
        worksheet.getCell(`H${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${vendorNames.join(',')}"`],
        };
      }
    }

    res.header(
      'Content-Disposition',
      'attachment; filename=template-register-user.xlsx',
    );
    res.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    await workbook.xlsx.write(res.raw);
    return;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local'))
  async login(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(req.user, req);

    if ('requires2FA' in result && result.requires2FA) {
      const pendingResult = result as {
        pendingToken: string;
        message: string;
        requires2FA: boolean;
      };
      return {
        message: pendingResult.message,
        data: { requires2FA: true, pendingToken: pendingResult.pendingToken },
      };
    }

    const loginResult = result as {
      accessToken: string;
      refreshToken: string;
      user: any;
    };

    this.setAuthCookies(res, loginResult.accessToken, loginResult.refreshToken);
    return { message: 'Login successful', data: loginResult };
  }

  /**
   * POST /auth/login/2fa
   * Complete login after 2FA verification
   * Body: { pendingToken, otpCode }
   */
  @Public()
  @Post('login/2fa')
  @HttpCode(HttpStatus.OK)
  async loginWith2FA(
    @Body('pendingToken') pendingToken: string,
    @Body('otpCode') otpCode: string,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginWith2FA(
      pendingToken,
      otpCode,
      req,
    );
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { message: 'Login successful', data: result };
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Request() req: any) {
    // initiates the Google OAuth2 login flow
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.handleSSOLogin(req.user, req);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    // Redirect to frontend or return tokens
    // For now, return tokens as JSON
    return { message: 'Google login successful', data: result };
  }

  @Get('verify-user')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'EXAMINER')
  async verifyUser(
    @CurrentUser() adminRequester: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    const user = await this.usersService.findUserByStatusVerification(
      adminRequester,
      false,
      false,
      page,
      limit,
    );
    return user;
  }

  @Patch('verify/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyUserByAdmin(
    @Param('id') userIdToVerify: string,
    @CurrentUser() adminRequester: any,
  ) {
    const user = await this.authService.verifyUserByAdmin(
      userIdToVerify,
      adminRequester,
    );
    return { message: 'User verified successfully', data: user };
  }

  @Patch('deactivate/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deactivateUserByAdmin(
    @Param('id') userIdToDeactivate: string,
    @CurrentUser() adminRequester: any,
  ) {
    const user = await this.authService.deactivateUserByAdmin(
      userIdToDeactivate,
      adminRequester,
    );
    return { message: 'User deactivated successfully', data: user };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser('id') userId: string, @Request() req: any) {
    return this.authService.logout(userId, req);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken =
      req.cookies?.['refresh_token'] || req.body?.refreshToken;
    const userId = req.body?.userId;

    const tokens = await this.authService.refreshTokens(userId, refreshToken);

    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { message: 'Token refreshed', data: tokens };
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProd = this.configService.get('NODE_ENV') === 'production';
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth/refresh',
    });
  }
}
