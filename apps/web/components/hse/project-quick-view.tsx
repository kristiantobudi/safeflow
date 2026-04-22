'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@repo/ui/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@repo/ui/components/ui/dialog';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';
import { ScrollArea } from '@repo/ui/components/ui/scroll-area';
import { Textarea } from '@repo/ui/components/ui/textarea';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Circle,
  MapPin,
  AlertTriangle,
  Calendar,
  Hash,
  Eye,
  RefreshCcw,
  Send,
  MessageSquare,
  GitCompare,
} from 'lucide-react';
import {
  useProjectDetailsQuery,
  useApproveProjectMutation,
  useRejectProjectMutation,
  useRequestRevisionMutation,
  useSubmitProjectMutation,
} from '@/store/project-hirac/query';
import { useQuery } from '@tanstack/react-query';
import { AuthState } from '@/types/auth-state';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/ui/components/ui/popover';
import { useMemo, useState } from 'react';
import { ProjectComparisonModal } from './project-comparison-modal';
import { Card } from '@repo/ui/components/ui/card';
import { Separator } from '@repo/ui/components/ui/separator';

interface ProjectQuickViewProps {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectQuickView({
  projectId,
  open,
  onOpenChange,
}: ProjectQuickViewProps) {
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [note, setNote] = useState('');

  const { data: projectResponse } = useProjectDetailsQuery(projectId as string);
  const { data: auth } = useQuery<AuthState | null>({
    queryKey: ['auth'],
    queryFn: () => null,
    staleTime: Infinity,
  });

  const project = projectResponse?.data;
  const userRole = auth?.role;
  const userId = auth?.id;

  const approveMutation = useApproveProjectMutation(projectId as string);
  const rejectMutation = useRejectProjectMutation(projectId as string);
  const requestRevisionMutation = useRequestRevisionMutation(
    projectId as string,
  );
  const submitMutation = useSubmitProjectMutation(projectId as string);

  const latestVersion = project?.versions?.[0];
  const approvalSteps = latestVersion?.approvalSteps || [];

  // Determine Max Risk Level
  const maxRisk = useMemo(() => {
    const hiracs = project?.hiracs;
    if (!hiracs || hiracs.length === 0) return 'L';
    const riskOrder: Record<any, any> = {
      L: 1,
      M: 2,
      H: 3,
      E: 4,
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      EXTREME: 4,
    };
    let highest = 'L';
    hiracs.forEach((h: any) => {
      const level = h.penilaianAwalTingkatRisiko;
      if (level && riskOrder[level] > riskOrder[highest]) {
        highest = level;
      }
    });
    return highest;
  }, [project?.hiracs]);

  const riskLabel: Record<string, string> = {
    L: 'Low',
    M: 'Medium',
    H: 'High',
    E: 'Extreme',
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    EXTREME: 'Extreme',
  };

  const riskColor: Record<string, string> = {
    L: 'text-blue-600',
    M: 'text-emerald-600',
    H: 'text-amber-600',
    E: 'text-destructive',
    LOW: 'text-blue-600',
    MEDIUM: 'text-emerald-600',
    HIGH: 'text-amber-600',
    EXTREME: 'text-destructive',
  };

  if (!projectId) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[450px] p-0 flex flex-col gap-0 border-l border-muted/30 shadow-2xl">
        <SheetHeader className="p-6 pb-4 border-b border-muted/20 text-left">
          <div className="space-y-1">
            <SheetTitle className="text-xl font-black text-foreground/90 flex items-center gap-2">
              Quick View
            </SheetTitle>
            <SheetDescription className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">
              Selected Document Preview
            </SheetDescription>
          </div>
        </SheetHeader>

        <Separator className="shadow-2xs" />

        <ScrollArea className="flex-1 px-6">
          <div className="py-6 space-y-8">
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black text-primary uppercase tracking-wider">
                  Approval Workflow
                </h3>
              </div>

              <div className="relative pl-0">
                <div className="space-y-4">
                  {/* Draft Submitted Step */}
                  <div className="relative flex items-start gap-5">
                    {/* The Line segment below the marker */}
                    <div className="absolute left-[18px] top-9 bottom-[-16px] w-[2px] bg-emerald-500" />

                    <div className="relative z-10 flex items-center justify-center h-10 w-10 rounded-2xl bg-emerald-500 shadow-xl shadow-emerald-500/20">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>

                    <div className="flex-1 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/50">
                      <p className="text-xs font-black text-emerald-900 leading-tight uppercase tracking-wide">
                        Draft Submitted
                      </p>
                      <p className="text-[11px] text-emerald-600/70 font-bold mt-1">
                        By {project?.creator?.firstName || 'User'} •{' '}
                        {project?.createdAt
                          ? format(
                              new Date(project.createdAt),
                              'MMM dd, HH:mm',
                              { locale: localeId },
                            )
                          : '-'}
                      </p>
                    </div>
                  </div>

                  {approvalSteps.map((step: any, index: number) => {
                    const isApproved = step.status === 'APPROVED';
                    const isRejected = step.status === 'REJECTED';
                    const isPending = step.status === 'PENDING';
                    const isLast = index === approvalSteps.length - 1;

                    // Logic for the line connecting to the next step
                    const lineActive = isApproved;

                    return (
                      <div
                        key={step.id}
                        className="relative flex items-start gap-5"
                      >
                        {/* Vertical Connector Line */}
                        {!isLast && (
                          <div
                            className={`absolute left-[18px] top-10 bottom-[-16px] w-[2px] transition-colors duration-500 ${
                              lineActive ? 'bg-emerald-500' : 'bg-slate-100'
                            }`}
                          />
                        )}

                        <div
                          className={`relative z-10 flex items-center justify-center h-10 w-10 rounded-2xl border-2 transition-all duration-500 shadow-sm ${
                            isApproved
                              ? 'bg-emerald-500 border-emerald-400'
                              : isRejected
                                ? 'bg-rose-500 border-rose-400'
                                : isPending
                                  ? 'bg-amber-50 border-amber-200 animate-pulse'
                                  : 'bg-white border-slate-100'
                          }`}
                        >
                          {isApproved && (
                            <CheckCircle2 className="h-5 w-5 text-white" />
                          )}
                          {isRejected && (
                            <XCircle className="h-5 w-5 text-white" />
                          )}
                          {isPending && (
                            <Clock className="h-5 w-5 text-amber-500" />
                          )}
                          {!isApproved && !isRejected && !isPending && (
                            <Circle className="h-4 w-4 text-slate-300" />
                          )}
                        </div>

                        <Card
                          className={`flex-1 p-4 transition-all duration-300 ${
                            isApproved
                              ? 'border-none shadow-sm'
                              : isPending
                                ? 'bg-amber-50/30 border-amber-100 shadow-sm ring-1 ring-amber-100/50'
                                : 'bg-destructive/10 border-destructive/10 shadow-sm ring-1 ring-destructive/10'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p
                              className={`text-xs font-black uppercase tracking-wider ${
                                isApproved
                                  ? 'text-foreground'
                                  : isPending
                                    ? 'text-amber-700'
                                    : 'text-destructive'
                              }`}
                            >
                              {step.requiredRole === 'VERIFICATOR'
                                ? 'Verificator Review'
                                : step.requiredRole === 'EXAMINER'
                                  ? 'Examiner Approval'
                                  : 'Final Issuance'}
                            </p>

                            {isApproved && (
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold border-none uppercase h-5">
                                Passed
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <p
                              className={`text-[11px] font-bold ${
                                isApproved
                                  ? 'text-emerald-600'
                                  : isRejected
                                    ? 'text-destructive'
                                    : 'text-amber-600'
                              }`}
                            >
                              {isApproved
                                ? `Approved by ${step.approver?.firstName}`
                                : isRejected
                                  ? `Rejected by ${step.approver?.firstName}`
                                  : 'Waiting for action'}
                            </p>

                            {step.note && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    className={`h-7 w-7 rounded-lg bg-primary/5 text-primary hover:bg-primary hover:text-white flex items-center justify-center transition-all border-none ${isApproved ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/10 text-destructive hover:bg-destructive hover:text-white'}`}
                                  >
                                    <MessageSquare className="h-3.5 w-3.5" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  side="left"
                                  className="p-4 text-xs shadow-2xl border-none max-w-[280px] bg-slate-900 text-white"
                                >
                                  <div className="flex items-center gap-2 mb-2 opacity-50 uppercase tracking-widest font-black text-[9px]">
                                    <MessageSquare className="h-3 w-3" />
                                    <p>
                                      Catatan{' '}
                                      {step.requiredRole === 'VERIFICATOR'
                                        ? 'Verificator'
                                        : step.requiredRole === 'EXAMINER'
                                          ? 'Examiner'
                                          : 'Final'}
                                    </p>
                                  </div>
                                  <p className="font-medium leading-relaxed">
                                    {step.note}
                                  </p>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <Card className="p-6 border space-y-5 border-none shadow-lg bg-card">
                <h3 className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest pl-1">
                  Metadata Summary
                </h3>

                <div className="grid grid-cols-2 gap-x-8 gap-y-6 text-left">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">
                      Site Location
                    </p>
                    <p className="text-sm font-black text-foreground/80 flex items-center gap-1.5 line-clamp-1">
                      <MapPin className="h-3 w-3 text-primary/60" />
                      {project?.lokasiKerja || '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">
                      Risk Level
                    </p>
                    <p
                      className={`text-sm font-black flex items-center gap-1.5 ${riskColor[maxRisk]}`}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {riskLabel[maxRisk]} (Residual)
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">
                      Expiry Date
                    </p>
                    <p className="text-sm font-black text-foreground/80 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-primary/60" />
                      {project?.updatedAt
                        ? format(
                            new Date(
                              new Date(project.updatedAt).getTime() +
                                30 * 24 * 60 * 60 * 1000,
                            ),
                            'MMM dd, yyyy',
                          )
                        : '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">
                      Tag ID
                    </p>
                    <p className="text-sm font-black text-foreground/80 flex items-center gap-1.5">
                      <Hash className="h-3 w-3 text-primary/60" />#
                      {project?.id?.slice(-8).toUpperCase()}-CON
                    </p>
                  </div>
                </div>
              </Card>
            </section>
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-muted/20 flex flex-col gap-3 sm:flex-row sm:justify-between items-center ">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 font-bold gap-2 text-primary border-primary/10 flex-1 sm:flex-initial"
              asChild
            >
              <a href={`/hse/projects/${projectId}`}>
                <Eye className="h-4 w-4" />
                Detail
              </a>
            </Button>
            {project?.versions && project.versions.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 font-bold gap-2 text-primary border-primary/10 flex-1 sm:flex-initial"
                onClick={() => setIsCompareOpen(true)}
              >
                <GitCompare className="h-4 w-4" />
                Compare
              </Button>
            )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {project?.status === 'L1_REVIEW' &&
              (userRole === 'VERIFICATOR' || userRole === 'ADMIN') && (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-9 px-4 rounded-xl font-bold gap-2 shadow-lg shadow-destructive/20 flex-1 sm:flex-initial"
                    onClick={() => setIsRejectDialogOpen(true)}
                    disabled={rejectMutation.isPending}
                  >
                    <XCircle className="h-4 w-4" />
                    {rejectMutation.isPending ? 'Wait...' : 'Reject'}
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 px-6 rounded-xl font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 flex-1 sm:flex-initial"
                    onClick={() => approveMutation.mutate('Setuju')}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {approveMutation.isPending ? 'Wait...' : 'Approve'}
                  </Button>
                </>
              )}
            {project?.status === 'L2_REVIEW' &&
              (userRole === 'EXAMINER' || userRole === 'ADMIN') && (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-9 px-4 font-bold gap-2 shadow-lg shadow-destructive/20 flex-1 sm:flex-initial"
                    onClick={() => setIsRejectDialogOpen(true)}
                    disabled={rejectMutation.isPending}
                  >
                    <XCircle className="h-4 w-4" />
                    {rejectMutation.isPending ? 'Wait...' : 'Reject'}
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 px-6 font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 flex-1 sm:flex-initial"
                    onClick={() => approveMutation.mutate('Setuju')}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {approveMutation.isPending ? 'Wait...' : 'Approve'}
                  </Button>
                </>
              )}
            {project?.createdBy === userId &&
              (project?.status === 'DRAFT' ||
                project?.status === 'REVISION') && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-9 px-4 font-bold gap-2 flex-1 sm:flex-initial"
                  onClick={() => setIsSubmitDialogOpen(true)}
                  disabled={submitMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                  {submitMutation.isPending ? 'Wait...' : 'Submit Reviu'}
                </Button>
              )}
            {(project?.status === 'L1_REVIEW' ||
              project?.status === 'L2_REVIEW' ||
              project?.status === 'APPROVED') &&
              project?.createdBy === userId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 font-bold gap-2 text-primary border-primary/10 flex-1 sm:flex-initial"
                  onClick={() => requestRevisionMutation.mutate()}
                  disabled={requestRevisionMutation.isPending}
                >
                  <RefreshCcw className="h-4 w-4" />
                  {requestRevisionMutation.isPending
                    ? 'Wait...'
                    : 'Tarik Revisi'}
                </Button>
              )}
          </div>
        </div>
      </SheetContent>

      <ProjectComparisonModal
        projectId={projectId as string}
        open={isCompareOpen}
        onOpenChange={setIsCompareOpen}
      />

      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Ajukan Reviu Project
            </DialogTitle>
            <DialogDescription>
              Pastikan seluruh data HIRAC sudah sesuai. Tambahkan catatan jika
              diperlukan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Tambahkan catatan untuk reviewer (opsional)..."
              className="min-h-[120px] rounded-2xl bg-muted/50 border-none focus-visible:ring-primary/20"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsSubmitDialogOpen(false)}
              className="rounded-xl"
            >
              Batal
            </Button>
            <Button
              className="rounded-xl font-bold px-8 shadow-lg shadow-primary/20"
              onClick={() => {
                submitMutation.mutate(note);
                setIsSubmitDialogOpen(false);
                setNote('');
              }}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? 'Mengirim...' : 'Kirim Pengajuan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-destructive">
              <MessageSquare className="h-5 w-5" />
              Tolak & Minta Revisi
            </DialogTitle>
            <DialogDescription>
              Jelaskan alasan penolakan agar pembuat project dapat melakukan
              perbaikan yang diperlukan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Berikan alasan spesifik alasan penolakan atau bagian yang butuh revisi..."
              className="min-h-[120px] rounded-2xl bg-muted/50 border-none focus-visible:ring-destructive/20"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsRejectDialogOpen(false)}
              className="rounded-xl"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl font-bold px-8 shadow-xl shadow-destructive/20"
              onClick={() => {
                rejectMutation.mutate(note);
                setIsRejectDialogOpen(false);
                setNote('');
              }}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Proses...' : 'Reject & Minta Revisi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
