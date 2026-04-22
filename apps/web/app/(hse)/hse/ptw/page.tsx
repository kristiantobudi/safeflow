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
import { Input } from '@repo/ui/components/ui/input';
import {
  Plus,
  Search,
  LayoutGrid,
  ClipboardList,
  ChevronRight,
  Clock,
  ArrowRight,
  FileText,
  StickyNote,
} from 'lucide-react';
import { DataTableCustoms } from '@repo/ui/components/advanced-data-table/data-table-customs';
import { usePtwList } from '@/store/ptw/query';
import { PtwUpsertModal } from '@/components/hse/ptw-upsert-modal';
import Link from 'next/link';

export default function PtwPage() {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: ptwData, isLoading, error } = usePtwList();

  const ptwList = useMemo(() => {
    return ptwData || [];
  }, [ptwData]);

  const stats = useMemo(() => {
    return {
      total: ptwList.length,
      pending: ptwList.filter((ptw: any) => ptw.approvalStatus === 'PENDING')
        .length,
      submitted: ptwList.filter((ptw: any) => ptw.approvalStatus === 'SUBMITTED')
        .length,
      approved: ptwList.filter((ptw: any) => ptw.approvalStatus === 'APPROVED')
        .length,
      rejected: ptwList.filter((ptw: any) => ptw.approvalStatus === 'REJECTED')
        .length,
    };
  }, [ptwList]);

  const columns = [
    {
      accessorKey: 'noPtw',
      header: 'Nomor PTW',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <StickyNote className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-foreground">
              {row.original.noPtw || '-'}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
              ID: {row.original.id.slice(-6).toUpperCase()}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'judulPekerjaan',
      header: 'Judul Pekerjaan',
      cell: ({ row }: any) => (
        <span className="font-medium text-foreground">
          {row.original.judulPekerjaan || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'lokasiPekerjaan',
      header: 'Lokasi Pekerjaan',
      cell: ({ row }: any) => (
        <span className="font-medium text-muted-foreground">
          {row.original.lokasiPekerjaan || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'tanggalMulai',
      header: 'Tanggal Mulai',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-sm">
            {row.original.tanggalMulai
              ? new Date(row.original.tanggalMulai).toLocaleDateString('id-ID')
              : '-'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'tanggalSelesai',
      header: 'Tanggal Selesai',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-sm">
            {row.original.tanggalSelesai
              ? new Date(row.original.tanggalSelesai).toLocaleDateString('id-ID')
              : '-'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'approvalStatus',
      header: 'Status Approval',
      cell: ({ row }: any) => {
        const status = row.original.approvalStatus;
        const variants: Record<string, string> = {
          PENDING: 'bg-muted text-muted-foreground',
          SUBMITTED: 'bg-amber-500/10 text-amber-600',
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
      accessorKey: 'jsaProject',
      header: 'JSA Terkait',
      cell: ({ row }: any) => {
        const jsa = row.original.jsaProject;
        return (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">
              {jsa?.noJsa || '-'}
            </span>
            <span className="text-xs text-muted-foreground">
              ({jsa?.jenisKegiatan || '-'})
            </span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }: any) => (
        <Link href={`/hse/ptw/${row.original.id}`}>
          <Button variant="ghost" size="sm" className="gap-2 group">
            Detail
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </Link>
      ),
    },
  ];

  const handleRowClick = (row: any) => {
    // Navigate to detail page when row is clicked
    window.location.href = `/hse/ptw/${row.original.id}`;
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header & Stats Section */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground/90 flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-primary" />
              Permit to Work
            </h1>
            <p className="text-muted-foreground">
              Manajemen izin kerja dan pengajuan PTW.
            </p>
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="shadow-lg shadow-primary/20 gap-2 h-11 px-6 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" />
            Buat PTW Baru
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="p-4 border-none shadow-sm bg-linear-to-br from-primary/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <LayoutGrid className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-muted-foreground">
                Total PTW
              </p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-linear-to-br from-muted/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-muted/20 flex items-center justify-center">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-muted-foreground">
                Pending
              </p>
              <p className="text-2xl font-bold text-muted-foreground">
                {stats.pending}
              </p>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-linear-to-br from-amber-500/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <ChevronRight className="h-6 w-6 text-amber-500" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-muted-foreground">
                Submitted
              </p>
              <p className="text-2xl font-bold text-amber-600">
                {stats.submitted}
              </p>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-linear-to-br from-emerald-500/5 to-transparent flex items-center gap-4">
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
          <Card className="p-4 border-none shadow-sm bg-linear-to-br from-destructive/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <Badge className="bg-destructive/10 h-6 w-6 text-destructive border-none shadow-none" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-muted-foreground">
                Rejected
              </p>
              <p className="text-2xl font-bold text-destructive">
                {stats.rejected}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <Badge variant="destructive" className="h-6 w-6 rounded-full flex items-center justify-center">
                !
              </Badge>
              <div>
                <p className="font-semibold">Gagal memuat data PTW</p>
                <p className="text-sm text-muted-foreground">
                  {(error as Error).message || 'Terjadi kesalahan saat mengambil data dari server'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari judul pekerjaan atau lokasi..."
          className="pl-10 h-11 bg-card border-none shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Data Table */}
      <Card className="border-none shadow-2xl">
        <div className="p-6">
          <DataTableCustoms
            columns={columns}
            data={ptwList}
            loading={isLoading}
            variant="minimal"
            onRowClick={handleRowClick}
          />
        </div>
      </Card>

      <PtwUpsertModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}