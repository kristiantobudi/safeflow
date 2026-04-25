import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Get,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { HiracService } from './hirac.service';
import { CreateHiracDto } from './dto/create-hirac.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@repo/database';
import type { FastifyReply as Response } from 'fastify';
import { FastifyFileInterceptor } from '../../common/interceptors/fastify-file.interceptor';
import { UploadedMultipartFile } from '../../common/decorators/uploaded-multipart-file.decorator';
import { UploadedFile as MyFile } from '../../common/interface/file.interface';

@Controller('projects/:projectId/hirac')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HiracController {
  constructor(private readonly hiracService: HiracService) {}

  @Get('template')
  @Roles(Role.USER, Role.ADMIN)
  async downloadTemplate(
    @Param('projectId') projectId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.hiracService.generateRegisterTemplate(projectId);
    res.headers({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Template_HIRAC.xlsx"',
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Post('upload')
  @Roles(Role.USER, Role.ADMIN)
  @UseInterceptors(new FastifyFileInterceptor('file'))
  async uploadHirac(
    @Param('projectId') projectId: string,
    @UploadedMultipartFile() file: MyFile,
    @CurrentUser('id') userId: string,
  ) {
    return this.hiracService.bulkRegisterHirac(projectId, file, userId);
  }

  @Post()
  @Roles(Role.USER, Role.ADMIN)
  create(
    @Param('projectId') projectId: string,
    @Body() createHiracDto: CreateHiracDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.hiracService.addHiracToProject(
      projectId,
      createHiracDto,
      userId,
    );
  }

  @Patch(':id')
  @Roles(Role.USER, Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateHiracDto: Partial<CreateHiracDto>,
    @CurrentUser('id') userId: string,
  ) {
    return this.hiracService.updateHirac(id, updateHiracDto, userId);
  }

  @Delete(':id')
  @Roles(Role.USER, Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.hiracService.deleteHirac(id, userId);
  }

  @Patch(':id/restore')
  @Roles(Role.USER, Role.ADMIN)
  restoreHirac(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.hiracService.restoreHirac(id, userId);
  }
}
