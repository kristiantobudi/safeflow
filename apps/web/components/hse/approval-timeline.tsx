'use client';

import { Badge } from '@repo/ui/components/ui/badge';
import { CheckCircle2, Circle, XCircle, Clock } from 'lucide-react';

interface ApprovalStep {
  id: string;
  stepOrder: number;
  requiredRole: string;
  status: string;
  approver: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface ApprovalTimelineProps {
  steps: ApprovalStep[];
}

const stepLabels: Record<string, string> = {
  VERIFICATOR: 'Verifikator',
  EXAMINER: 'Examiner',
  ADMIN: 'Administrator',
};

const stepOrderMap: Record<string, number> = {
  VERIFICATOR: 1,
  EXAMINER: 2,
  ADMIN: 3,
};

export function ApprovalTimeline({ steps }: ApprovalTimelineProps) {
  // Sort steps by order
  const sortedSteps = [...steps].sort((a, b) => {
    const orderA = stepOrderMap[a.requiredRole] ?? 0;
    const orderB = stepOrderMap[b.requiredRole] ?? 0;
    return orderA - orderB;
  });

  const getStepStatus = (step: ApprovalStep) => {
    switch (step.status) {
      case 'APPROVED':
        return 'approved';
      case 'REJECTED':
        return 'rejected';
      case 'PENDING':
        return 'pending';
      default:
        return 'pending';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="h-6 w-6 text-emerald-500" />;
      case 'REJECTED':
        return <XCircle className="h-6 w-6 text-destructive" />;
      case 'PENDING':
        return <Clock className="h-6 w-6 text-amber-500" />;
      default:
        return <Circle className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'APPROVED':
        return 'default';
      case 'REJECTED':
        return 'destructive';
      case 'PENDING':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
          Approval Timeline
        </Badge>
      </h3>
      <div className="relative">
        {/* Connection Line */}
        <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-muted" />

        {/* Steps */}
        <div className="space-y-6">
          {sortedSteps.map((step, index) => {
            const stepStatus = getStepStatus(step);
            const roleLabel = stepLabels[step.requiredRole] || step.requiredRole;

            return (
              <div key={step.id} className="relative flex items-start gap-4">
                {/* Status Icon */}
                <div className="relative z-10 flex items-center justify-center h-14 w-14 rounded-full bg-card border-2 shadow-sm shrink-0">
                  {getStatusIcon(step.status)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-2">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">
                        {roleLabel}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Level {step.stepOrder} Approval
                      </p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(step.status)}>
                      {step.status}
                    </Badge>
                  </div>

                  {/* Approver Info */}
                  {step.approver && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {step.approver.firstName} {step.approver.lastName}
                      </span>
                      {step.updatedAt && (
                        <span className="ml-2">
                          • {new Date(step.updatedAt).toLocaleDateString('id-ID')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Pending Message */}
                  {step.status === 'PENDING' && !step.approver && (
                    <p className="mt-2 text-sm text-muted-foreground italic">
                      Menunggu approval...
                    </p>
                  )}

                  {/* Rejected Message */}
                  {step.status === 'REJECTED' && (
                    <p className="mt-2 text-sm text-destructive">
                      Pengajuan ditolak
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 pt-4 border-t border-muted">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>Approved</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 text-amber-500" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <XCircle className="h-4 w-4 text-destructive" />
          <span>Rejected</span>
        </div>
      </div>
    </div>
  );
}