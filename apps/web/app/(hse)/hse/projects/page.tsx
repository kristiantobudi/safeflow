'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';
import {
  Briefcase,
  Plus,
  Search,
  LayoutGrid,
  ClipboardList,
  ChevronRight,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Input } from '@repo/ui/components/ui/input';
import { DataTableCustoms } from '@repo/ui/components/advanced-data-table/data-table-customs';
import { useProjectsQuery } from '@/store/project-hirac/query';
import { ProjectUpsertModal } from '@/components/hse/project-upsert-modal';
import Link from 'next/link';

export default function SafetyProjectsPage() {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: projectsData, isLoading } = useProjectsQuery();

  const projects = useMemo(() => {
    return projectsData?.data || [];
  }, [projectsData]);

  const stats = useMemo(() => {
    return {
      total: projects.length,
      draft: projects.filter((p: any) => p.status === 'DRAFT').length,
      pending: projects.filter((p: any) => p.status === 'PENDING').length,
      approved: projects.filter((p: any) => p.status === 'APPROVED').length,
    };
  }, [projects]);

  const columns = [
    {
      accessorKey: 'unitKerja',
      header: 'Unit Kerja',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-foreground">
              {row.original.unitKerja}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
              ID: {row.original.id.slice(-6).toUpperCase()}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'lokasiKerja',
      header: 'Lokasi',
      cell: ({ row }: any) => (
        <span className="font-medium text-muted-foreground">
          {row.original.lokasiKerja || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const status = row.original.status;
        const variants: Record<string, string> = {
          DRAFT: 'bg-muted text-muted-foreground',
          PENDING: 'bg-amber-500/10 text-amber-600',
          APPROVED: 'bg-emerald-500/10 text-emerald-600',
          REJECTED: 'bg-destructive/10 text-destructive',
        };
        return (
          <Badge
            className={`${variants[status]} border-none shadow-none font-semibold px-2.5 py-0.5`}
          >
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'tanggal',
      header: 'Tanggal',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-sm">{row.original.tanggal || '-'}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }: any) => (
        <Link href={`/hse/projects/${row.original.id}`}>
          <Button variant="ghost" size="sm" className="gap-2 group">
            Detail
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Header & Stats Section */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground/90 flex items-center gap-3">
              <LayoutGrid className="h-8 w-8 text-primary" />
              Safety Projects
            </h1>
            <p className="text-muted-foreground">
              Manajemen proyek K3 dan evaluasi risiko HIRAC.
            </p>
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="shadow-lg shadow-primary/20 gap-2 h-11 px-6 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" />
            Project Baru
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-4 border-none shadow-sm bg-gradient-to-br from-primary/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-muted-foreground">
                Total Project
              </p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-gradient-to-br from-amber-500/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-muted-foreground">
                Pending Approval
              </p>
              <p className="text-2xl font-bold text-amber-600">
                {stats.pending}
              </p>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-gradient-to-br from-emerald-500/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <Badge className="bg-emerald-500/10 h-6 w-6 text-emerald-500 border-none shadow-none" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-muted-foreground">
                Approved
              </p>
              <p className="text-2xl font-bold text-emerald-600">
                {stats.approved}
              </p>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-gradient-to-br from-muted/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-muted/20 flex items-center justify-center">
              <ChevronRight className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-muted-foreground">Draft</p>
              <p className="text-2xl font-bold text-muted-foreground">
                {stats.draft}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari unit atau lokasi..."
          className="pl-10 h-11 bg-card border-none shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="border-none shadow-2xl">
        <div className="p-6">
          <DataTableCustoms
            columns={columns}
            data={projects}
            loading={isLoading}
            variant="minimal"
          />
        </div>
      </Card>

      <ProjectUpsertModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
