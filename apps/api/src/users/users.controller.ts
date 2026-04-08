import {
  Controller,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@repo/database';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    const {
      password,
      refreshToken,
      twoFactorSecret,
      twoFactorBackupCodes,
      authProvider,
      googleId,
      googleEmail,
      ...profile
    } = user;
    return { message: 'Profile fetched', data: profile };
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      username?: string;
      email?: string;
      password?: string;
    },
  ) {
    const updated = await this.usersService.updateProfile(userId, body);
    return { message: 'Profile updated', data: updated };
  }

  @Get()
  @Roles(Role.ADMIN)
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const result = await this.usersService.findAll(page, limit);
    return { message: 'Users fetched', data: result };
  }
}
