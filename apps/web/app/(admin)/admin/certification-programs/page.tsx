'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  useCertificationPrograms,
  useDeleteCertificationProgram,
} from '@/store/vendor-certification/query';
import { Button } from '@repo/ui/components/ui/button';
import { Card } from '@repo/ui/components/ui/card';
import { Badge } from '@repo/ui/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@repo/ui/components/ui/dialog';
import {
  createActionsColumn,
  createSortableHeader,
} from '@repo/ui/components/advanced-data-table/column';
import { DataTableCustoms } from '@repo/ui/components/advanced-data-table/data-table-customs';
import { TooltipProvider } from '@repo/ui/components/ui/tooltip';
import {
  Award,
  BookOpen,
  CalendarClock,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Row } from '@tanstack/react-table';
import { CertificationProgramForm } from '@/components/certification/certification-program-form';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CertificationProgram {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  modules: Array<{
    id: string;
    moduleId: string;
    isRequired: boolean;
    module: { id: string; title: string };
  }>;
  _count?: { vendors: number };
  createdAt: string;
  updatedAt: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CertificationProgramsPage() {
  const router = useRouter();
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [globalSearch, setGlobalSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [programToDelete, setProgramToDelete] =
    useState<CertificationProgram | null>(null);

  const deleteMutation = useDeleteCertificationProgram();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(globalSearch);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [globalSearch]);

  const { data, isLoading } = useCertificationPrograms(
    pagination.pageIndex + 1,
    pagination.pageSize,
    debouncedSearch || undefined,
  );

  const programs: CertificationProgram[] = useMemo(() => {
    if (!data) return [];
    return data?.data?.programs ?? data?.programs ?? [];
  }, [data]);

  const totalCount: number = data?.data?.total ?? data?.total ?? 0;
  const totalPrograms = totalCount;
  const activePrograms = programs.filter((p) => p.isActive).length;

  const handleDeleteConfirm = () => {
    if (!programToDelete) return;
    deleteMutation.mutate(programToDelete.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setProgramToDelete(null);
      },
    });
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Nama Program',
        cell: ({ row }: { row: Row<CertificationProgram> }) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-sm">{row.original.name}</span>
            {row.original.description && (
              <span className="text-xs text-muted-foreground line-clamp-1 italic">
                {row.original.description}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'modules',
        header: 'Jumlah Modul',
        cell: ({ row }: { row: Row<CertificationProgram> }) => {
          const count = row.original.modules?.length ?? 0;
          return (
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="font-medium text-sm">{count} modul</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'validityDays',
        header: 'Masa Berlaku',
        cell: ({ row }: { row: Row<CertificationProgram> }) => {
          const days = (row.original as any).validityDays;
          return (
            <div className="flex items-center gap-2">
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">
                {days ? `${days} hari` : 'Tidak terbatas'}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }: { row: Row<CertificationProgram> }) => {
          const isActive = row.original.isActive;
          return (
            <Badge
              variant={isActive ? 'status-active' : 'status-inactive'}
              className="gap-1.5 px-2.5 py-0.5"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}
              />
              {isActive ? 'Aktif' : 'Nonaktif'}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: createSortableHeader<CertificationProgram>('Dibuat'),
        headerClassName: 'hidden lg:table-cell',
        cellClassName: 'hidden lg:table-cell',
        cell: ({ row }: { row: Row<CertificationProgram> }) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleDateString('id-ID', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        ),
      },
      createActionsColumn<CertificationProgram>([
        {
          icon: <Pencil className="h-4 w-4" />,
          label: 'Edit Program',
          onClick: (data) =>
            router.push(`/admin/certification-programs/${data.id}`),
        },
        {
          icon: <Trash2 className="h-4 w-4 text-destructive" />,
          label: 'Hapus Program',
          onClick: (data) => {
            setProgramToDelete(data);
            setDeleteDialogOpen(true);
          },
        },
      ]),
    ],
    [router],
  );

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 w-full max-w-full mx-auto overflow-hidden">
        {/* STATS HEADER */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-4 border-none shadow-sm bg-gradient-to-br from-primary/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium text-muted-foreground">
                Total Program
              </p>
              <p className="text-2xl font-bold">{totalPrograms}</p>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-gradient-to-br from-emerald-500/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium text-muted-foreground">
                Program Aktif
              </p>
              <p className="text-2xl font-bold">{activePrograms}</p>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-gradient-to-br from-amber-500/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-amber-500" />
            </div>
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium text-muted-foreground">
                Total Modul Terdaftar
              </p>
              <p className="text-2xl font-bold">
                {programs.reduce((acc, p) => acc + (p.modules?.length ?? 0), 0)}
              </p>
            </div>
          </Card>
        </div>

        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Certification Programs
            </h1>
            <p className="text-sm text-muted-foreground italic">
              Kelola program sertifikasi yang menentukan modul wajib bagi vendor
              sebelum mengakses JSA dan PTW.
            </p>
          </div>
          <Button
            className="gap-2 shadow-lg shadow-primary/20"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Tambah Program
          </Button>
        </div>

        {/* TABLE */}
        <Card className="border-none shadow-2xl">
          <div className="w-full overflow-hidden p-6">
            <DataTableCustoms
              className="w-full"
              columns={columns}
              data={programs}
              searchKey="name"
              searchPlaceholder="Cari program sertifikasi..."
              onGlobalFilterChangeExternal={setGlobalSearch}
              enableSavedViews
              enableRowSelection
              showColumnToggle
              variant="minimal"
              loading={isLoading}
              totalDataCount={totalCount}
              pagination={{
                pageIndex: pagination.pageIndex,
                pageSize: pagination.pageSize,
                pageCount: Math.ceil(totalCount / pagination.pageSize),
                onPaginationChange: setPagination,
              }}
            />
          </div>
        </Card>
      </div>

      {/* CREATE DIALOG */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card/95 backdrop-blur-xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Tambah Program Sertifikasi
            </DialogTitle>
            <DialogDescription>
              Buat program sertifikasi baru dengan modul-modul yang wajib
              diselesaikan vendor.
            </DialogDescription>
          </DialogHeader>
          <CertificationProgramForm
            onSuccess={() => setCreateDialogOpen(false)}
            onCancel={() => setCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-destructive">
              Hapus Program Sertifikasi
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus program{' '}
              <span className="font-semibold text-foreground">
                &quot;{programToDelete?.name}&quot;
              </span>
              ? Tindakan ini tidak dapat dibatalkan. Vendor yang sudah di-assign
              ke program ini tidak akan terpengaruh.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menghapus...
                </span>
              ) : (
                'Hapus Program'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
