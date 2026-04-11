import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Role, ApprovalStatus } from '@repo/database';

@Injectable()
export class ApprovalStepGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const projectId = request.params.id || request.params.projectId;

    if (!projectId) {
      throw new Error('ApprovalStepGuard requires a projectId parameter');
    }

    if (user.role === Role.ADMIN) return true;

    const latestVersion = await this.prisma.projectVersion.findFirst({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
      include: {
        approvalSteps: {
          where: { status: ApprovalStatus.PENDING },
          orderBy: { stepOrder: 'asc' },
          take: 1,
        },
      },
    });

    const activeStep = latestVersion?.approvalSteps[0];

    if (!activeStep) {
      throw new NotFoundException('No pending approval step found for this project');
    }

    if (activeStep.requiredRole !== user.role) {
      throw new ForbiddenException(
        `This step requires the ${activeStep.requiredRole} role`,
      );
    }

    return true;
  }
}
