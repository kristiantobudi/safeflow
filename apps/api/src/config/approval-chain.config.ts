import { ProjectStatus, Role } from '@repo/database/generated/client';

export const HIRAC_APPROVAL_CHAIN = [
  {
    level: 1,
    fromStatus: ProjectStatus.SUBMITTED,
    toStatus: ProjectStatus.L1_REVIEW,
    requiredRole: Role.VERIFICATOR,
  },
  {
    level: 2,
    fromStatus: ProjectStatus.L1_REVIEW,
    toStatus: ProjectStatus.L2_REVIEW,
    requiredRole: Role.EXAMINER,
  },
  {
    level: 3,
    fromStatus: ProjectStatus.L2_REVIEW,
    toStatus: ProjectStatus.APPROVED,
    requiredRole: Role.ADMIN,
  },
];
