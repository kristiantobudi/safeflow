import {
  Controller,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  UseInterceptors,
  Param,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@repo/database';
import { MinioService } from '../common/minio/minio.service';
import { FastifyFileInterceptor } from '../common/interceptors/fastify-file.interceptor';
import { UploadedMultipartFile } from '../common/decorators/uploaded-multipart-file.decorator';
import { UploadedFile as MyFile } from '../common/interface/file.interface';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly minioService: MinioService,
  ) {}

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
      invittationToken,
      initedByEmail,
      ...profile
    } = user;

    if (profile.avatarUrl) {
      profile.avatarUrl = await this.minioService.getFileUrl(profile.avatarUrl);
    }

    return { message: 'Profile fetched', data: profile };
  }

  @Patch('me')
  @UseInterceptors(new FastifyFileInterceptor('avatar'))
  async updateProfile(
    @UploadedMultipartFile() file: MyFile,
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
    const updated = await this.usersService.updateProfile(userId, body, file);
    return { message: 'Profile updated', data: updated };
  }

  @Get()
  @Roles(Role.ADMIN)
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    const result = await this.usersService.findAll(page, limit, search);
    return { message: 'Users fetched', data: result };
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return { message: 'User fetched', data: user };
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseInterceptors(new FastifyFileInterceptor('avatar'))
  async updateUser(
    @Param('id') id: string,
    @UploadedMultipartFile() file: MyFile,
    @Body() body: any,
  ) {
    const updated = await this.usersService.updateUser(id, body, file);
    return { message: 'User updated', data: updated };
  }
}
