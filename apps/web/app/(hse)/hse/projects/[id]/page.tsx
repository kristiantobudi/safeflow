'use client';

import { useParams } from 'next/navigation';
import {
  useProjectDetailsQuery,
  useDeleteHiracMutation,
} from '@/store/project-hirac/query';
import { Card } from '@repo/ui/components/ui/card';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';
import {
  Briefcase,
  Calendar,
  MapPin,
  ShieldCheck,
  FileDown,
  FilePlus2,
  Trash2,
  ChevronLeft,
  AlertTriangle,
  Info,
  Eye,
  CheckCircle,
  XCircle,
  RotateCcw,
  Send,
  MessageSquare,
  Edit3,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { DataTableCustoms } from '@repo/ui/components/advanced-data-table/data-table-customs';
import { HiracBulkUploadModal } from '@/components/hse/hirac-bulk-upload-modal';
import { HiracPreviewModal } from '@/components/hse/hirac-preview-modal';
import { useQuery } from '@tanstack/react-query';
import { AuthState } from '@/types/auth-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { Textarea } from '@repo/ui/components/ui/textarea';
import {
  useSubmitProjectMutation,
  useApproveProjectMutation,
  useRejectProjectMutation,
  useRequestRevisionMutation,
} from '@/store/project-hirac/query';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/components/ui/tooltip';
import { HiracEditModal } from '@/components/hse/hirac-edit-modal';

export default function ProjectDetailPage() {
  const { id } = useParams() as { id: string };
  const { data: projectResponse, isLoading } = useProjectDetailsQuery(id);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // States for Modals
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [note, setNote] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingHirac, setEditingHirac] = useState<any>(null);

  const { data: auth } = useQuery<AuthState | null>({
    queryKey: ['auth'],
    queryFn: () => null,
    staleTime: Infinity,
  });
  const userId = auth?.id;
  const userRole = auth?.role;

  const deleteMutation = useDeleteHiracMutation(id);
  const submitMutation = useSubmitProjectMutation(id);
  const approveMutation = useApproveProjectMutation(id);
  const rejectMutation = useRejectProjectMutation(id);
  const requestRevisionMutation = useRequestRevisionMutation(id);

  const project = projectResponse?.data;
  const hiracs = useMemo(() => project?.hiracs || [], [project]);

  // Grouping logic: Flat record to Activity -> Items
  const groupedHiracs = useMemo(() => {
    if (!hiracs.length) return [];

    const groups: Record<string, any[]> = {};
    hiracs.forEach((h: any) => {
      const key = h.kegiatan || 'Uncategorized';
      if (!groups[key]) groups[key] = [];
      groups[key].push(h);
    });

    return Object.entries(groups).map(([kegiatan, items]) => ({
      kegiatan,
      items,
      count: items.length,
      kategori: items[0]?.kategori,
    }));
  }, [hiracs]);

  const stats = useMemo(() => {
    return {
      total: hiracs.length,
      highRisk: hiracs.filter(
        (h: any) =>
          h.penilaianAwalTingkatRisiko === 'H' ||
          h.penilaianAwalTingkatRisiko === 'E' ||
          h.penilaianAwalTingkatRisiko === 'HIGH' ||
          h.penilaianAwalTingkatRisiko === 'EXTREME',
      ).length,
      routine: hiracs.filter((h: any) => h.kategori === 'R').length,
      closed: hiracs.filter((h: any) => h.status === 'CLOSED').length,
    };
  }, [hiracs]);

  const columns = [
    {
      accessorKey: 'kegiatan',
      header: 'Kegiatan',
      cell: ({ row }: any) => (
        <div className="flex flex-col gap-1 max-w-[250px]">
          <span className="font-bold text-foreground line-clamp-2">
            {row.original.kegiatan}
          </span>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] font-medium py-0 h-4"
            >
              {row.original.kategori}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              No. {row.original.no}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'identifikasiBahaya',
      header: 'Bahaya & Risiko',
      cell: ({ row }: any) => (
        <div className="flex flex-col gap-1 max-w-[300px]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span className="text-sm font-medium">
              {row.original.identifikasiBahaya}
            </span>
          </div>
          <p className="text-xs text-muted-foreground italic pl-5">
            {row.original.akibatRisiko}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'penilaianAwalTingkatRisiko',
      header: 'Initial Risk',
      cell: ({ row }: any) => {
        const level = row.original.penilaianAwalTingkatRisiko;
        const colors: Record<string, string> = {
          L: 'bg-blue-500/10 text-blue-600',
          M: 'bg-emerald-500/10 text-emerald-600',
          H: 'bg-amber-500/10 text-amber-600',
          E: 'bg-destructive/10 text-destructive',
          LOW: 'bg-blue-500/10 text-blue-600',
          MEDIUM: 'bg-emerald-500/10 text-emerald-600',
          HIGH: 'bg-amber-500/10 text-amber-600',
          EXTREME: 'bg-destructive/10 text-destructive',
        };
        return (
          <Badge
            className={`${colors[level] || 'bg-slate-100'} border-none shadow-none font-bold uppercase text-[10px]`}
          >
            {level}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'pengendalian',
      header: 'Pengendalian',
      cell: ({ row }: any) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-xs text-muted-foreground line-clamp-2 cursor-help max-w-[200px]">
                {row.original.pengendalian}
              </p>
            </TooltipTrigger>
            <TooltipContent
              side="left"
              className="max-w-[300px] p-3 border-none bg-slate-900 text-white shadow-2xl"
            >
              <p className="text-xs leading-relaxed">
                {row.original.pengendalian}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => (
        <Badge
          variant={row.original.status === 'CLOSED' ? 'default' : 'secondary'}
          className="text-[10px] px-2 py-0"
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-primary h-8 w-8 rounded-lg"
            onClick={() => {
              setEditingHirac(row.original);
              setIsEditModalOpen(true);
            }}
          >
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive h-8 w-8 rounded-lg"
            onClick={() => {
              if (confirm('Apakah Anda yakin ingin menghapus item ini?')) {
                deleteMutation.mutate(row.original.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Header section with refined meta */}
      <div className="flex flex-col gap-6">
        <Link href="/hse/projects" className="w-fit">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground -ml-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Kembali ke Proyek
          </Button>
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <ShieldCheck className="h-7 w-7 text-white" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground/90">
                  {project?.unitKerja}
                </h1>
                <div className="flex items-center gap-4 text-muted-foreground text-sm font-medium">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-primary/60" />
                    {project?.lokasiKerja}
                  </div>
                  <div className="flex items-center gap-1.5 border-l pl-4 border-muted-foreground/20">
                    <Calendar className="h-4 w-4 text-primary/60" />
                    {project?.tanggal}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="gap-2 h-11 px-5 border-none shadow-sm bg-card hover:bg-card/80 transition-all font-semibold"
              onClick={() => setIsPreviewOpen(true)}
            >
              <Eye className="h-5 w-5 text-primary" />
              Preview IBPRP
            </Button>

            {/* ACTION BUTTONS BASED ON ROLE & STATUS */}
            {/* 1. Creator Actions: Submit / Request Revision */}
            {project?.createdBy === userId && (
              <>
                {(project?.status === 'DRAFT' ||
                  project?.status === 'REVISION') && (
                  <>
                    <Button
                      variant="outline"
                      className="gap-2 h-11 px-5 border-none shadow-sm bg-card"
                      onClick={() => setIsUploadOpen(true)}
                    >
                      <FilePlus2 className="h-5 w-5 text-primary" />
                      Upload HIRAC
                    </Button>
                    <Button
                      className="shadow-xl shadow-primary/20 h-11 px-8 font-bold gap-2"
                      onClick={() => setIsSubmitDialogOpen(true)}
                    >
                      <Send className="h-4 w-4" />
                      Submit Reviu
                    </Button>
                  </>
                )}

                {(project?.status === 'L1_REVIEW' ||
                  project?.status === 'L2_REVIEW' ||
                  project?.status === 'APPROVED') && (
                  <Button
                    variant="secondary"
                    className="gap-2 h-11 px-5 font-semibold"
                    onClick={() => requestRevisionMutation.mutate()}
                    disabled={requestRevisionMutation.isPending}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Tarik untuk Revisi
                  </Button>
                )}
              </>
            )}

            {/* 2. Reviewer Actions: Approve / Reject */}
            {((project?.status === 'L1_REVIEW' &&
              (userRole === 'VERIFICATOR' || userRole === 'ADMIN')) ||
              (project?.status === 'L2_REVIEW' &&
                (userRole === 'EXAMINER' || userRole === 'ADMIN'))) && (
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  className="gap-2 h-11 px-5 font-bold"
                  onClick={() => setIsRejectDialogOpen(true)}
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
                <Button
                  className="gap-2 h-11 px-8 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                  onClick={() => approveMutation.mutate('Setuju')}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Status Badge & Version Meta */}
        <div className="flex items-center gap-3">
          <Badge
            className={`px-4 py-1.5 rounded-xl border-none text-sm font-bold shadow-sm ${
              project?.status === 'APPROVED'
                ? 'bg-emerald-500/10 text-emerald-600'
                : project?.status === 'REVISION'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-primary/10 text-primary'
            }`}
          >
            Status: {project?.status?.replace('_', ' ')}
          </Badge>
          <Badge
            variant="outline"
            className="bg-muted/50 border-none px-4 py-1.5 rounded-xl text-sm"
          >
            Ver: {project?.currentVersionId || '1 (Initial)'}
          </Badge>
        </div>

        {/* Dynamic Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card p-4 rounded-3xl border-none shadow-sm flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              Total Item
            </span>
            <span className="text-2xl font-black">{stats.total}</span>
          </div>
          <div className="bg-card p-4 rounded-3xl border-none shadow-sm flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              High/Extreme Risk
            </span>
            <span
              className={`text-2xl font-black ${stats.highRisk > 0 ? 'text-destructive' : 'text-emerald-500'}`}
            >
              {stats.highRisk}
            </span>
          </div>
          <div className="bg-card p-4 rounded-3xl border-none shadow-sm flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              Status Open
            </span>
            <span className="text-2xl font-black text-amber-500">
              {stats.total - stats.closed}
            </span>
          </div>
          <div className="bg-card p-4 rounded-3xl border-none shadow-sm flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              Routine Task
            </span>
            <span className="text-2xl font-black">{stats.routine}</span>
          </div>
        </div>
      </div>

      {/* Main Content: HIRAC Table Sectioned by Kegiatan */}
      <div className="space-y-12">
        {groupedHiracs.length === 0 ? (
          <Card className="p-12 border-none shadow-2xl rounded-[2rem] text-center space-y-4">
            <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto opacity-50">
              <ShieldCheck className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Belum Ada Data HIRAC</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Silahkan upload file excel HIRAC untuk memulai penilaian risiko
                project ini.
              </p>
            </div>
          </Card>
        ) : (
          groupedHiracs.map((group, idx) => (
            <Card
              key={idx}
              className="border-none shadow-2xl overflow-hidden rounded-[2.5rem] bg-card/60 backdrop-blur-xl"
            >
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-10 py-7 border-b border-muted/50 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center font-black text-primary text-xl border border-primary/10">
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-foreground tracking-tight">
                      {group.kegiatan}
                    </h3>
                    <div className="flex items-center gap-4 mt-1">
                      <Badge
                        className={`${
                          group.items.some((i: any) =>
                            ['HIGH', 'EXTREME', 'H', 'E'].includes(
                              i.penilaianAwalTingkatRisiko,
                            ),
                          )
                            ? 'bg-rose-500/10 text-rose-600'
                            : 'bg-emerald-500/10 text-emerald-600'
                        } border-none text-[9px] font-black uppercase tracking-widest px-2 h-5`}
                      >
                        {group.kategori}
                      </Badge>
                      <span className="text-xs text-muted-foreground/60 font-bold flex items-center gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        {group.count} Penilaian Risiko
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {(project?.status === 'DRAFT' ||
                    project?.status === 'REVISION') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 rounded-xl font-bold bg-white/50 border-slate-200 gap-2"
                      onClick={() => {
                        setEditingHirac(null); // Mode Add
                        setIsEditModalOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Tambah Item
                    </Button>
                  )}
                  {project?.status === 'DRAFT' ||
                  project?.status === 'REVISION' ? (
                    <Badge className="bg-primary/5 text-primary border-none font-bold">
                      Editable
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="opacity-50">
                      Read Only
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-8 pt-4">
                <DataTableCustoms
                  columns={columns.filter(
                    (col) => col.accessorKey !== 'kegiatan',
                  )}
                  data={group.items}
                  loading={isLoading}
                  variant="minimal"
                />
              </div>
            </Card>
          ))
        )}
      </div>

      {/* MODALS for Actions */}
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

      <HiracBulkUploadModal
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        projectId={id}
      />

      <HiracPreviewModal
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        data={hiracs}
        projectInfo={{
          unitKerja: project?.unitKerja,
          lokasiKerja: project?.lokasiKerja,
          tanggal: project?.tanggal,
        }}
      />
      <HiracEditModal
        projectId={id}
        hirac={editingHirac}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
      />
    </div>
  );
}
