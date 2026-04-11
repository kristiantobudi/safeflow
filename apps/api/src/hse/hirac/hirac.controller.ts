import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { HiracService } from './hirac.service';
import { CreateHiracDto } from './dto/create-hirac.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@repo/database';

@Controller('projects/:projectId/hirac')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HiracController {
  constructor(private readonly hiracService: HiracService) {}

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

  @Patch('hirac/:id')
  @Roles(Role.USER, Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateHiracDto: Partial<CreateHiracDto>,
    @CurrentUser('id') userId: string,
  ) {
    return this.hiracService.updateHirac(id, updateHiracDto, userId);
  }

  @Delete('hirac/:id')
  @Roles(Role.USER, Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.hiracService.deleteHirac(id, userId);
  }
}
