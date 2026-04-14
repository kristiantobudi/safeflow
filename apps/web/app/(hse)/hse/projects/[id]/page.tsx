'use client';

import { useParams } from 'next/navigation';
import {
  useProjectDetailsQuery,
  useDeleteHiracMutation,
} from '@/store/project-hirac/query';
import {
  Card,
} from '@repo/ui/components/ui/card';
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
} from 'lucide-react';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { DataTableCustoms } from '@repo/ui/components/advanced-data-table/data-table-customs';
import { HiracBulkUploadModal } from '@/components/hse/hirac-bulk-upload-modal';
import { HiracPreviewModal } from '@/components/hse/hirac-preview-modal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/components/ui/tooltip';

export default function ProjectDetailPage() {
  const { id } = useParams() as { id: string };
  const { data: projectResponse, isLoading } = useProjectDetailsQuery(id);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const deleteMutation = useDeleteHiracMutation(id);

  const project = projectResponse?.data;
  const hiracs = useMemo(() => project?.hiracs || [], [project]);

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
            <TooltipContent side="left" className="max-w-[300px] p-3 border-none bg-slate-900 text-white shadow-2xl">
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
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive h-8 w-8"
          onClick={() => deleteMutation.mutate(row.original.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
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
            <Button
              variant="outline"
              className="gap-2 h-11 px-5 border-none shadow-sm bg-card"
              onClick={() => setIsUploadOpen(true)}
            >
              <FilePlus2 className="h-5 w-5 text-primary" />
              Upload HIRAC
            </Button>
            <Button className="shadow-xl shadow-primary/20 h-11 px-8 font-bold">
              Submit Reviu
            </Button>
          </div>
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

      {/* Main Content: HIRAC Table */}
      <Card className="border-none shadow-2xl overflow-hidden rounded-[2rem]">
        <div className="bg-card/50 px-8 py-6 border-b border-muted">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Hazard Identification & Risk Assessment
            </h3>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-emerald-500/5 text-emerald-600 border-none"
              >
                Active Ver: {project?.currentVersionId || 'Initial'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="p-8 pt-4">
          <DataTableCustoms
            columns={columns}
            data={hiracs}
            loading={isLoading}
            variant="minimal"
          />
        </div>
      </Card>

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
    </div>
  );
}
