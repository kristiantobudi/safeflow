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
  UploadedFile,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { Roles } from '../common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfigExcel } from '../config/multer.config';
import { UsersService } from '../users/users.service';
import { GoogleAuthGuard } from '../common/guards/google-auth.guard';
import * as XLSX from 'xlsx';
import 'multer';

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
  @UseInterceptors(FileInterceptor('file', multerConfigExcel))
  async uploadExcelToRegister(
    @UploadedFile() file: Express.Multer.File,
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
    const template = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        username: 'johndoe',
        password: 'Password123!',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Disposition',
      'attachment; filename=template-soal.xlsx',
    );
    res.send(buffer);
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
