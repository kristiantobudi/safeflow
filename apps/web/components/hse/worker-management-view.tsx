'use client';

import { useState, useMemo } from 'react';
import {
  useWorkersQuery,
  useCreateWorkerMutation,
  useUpdateWorkerMutation,
  useDeleteWorkerMutation,
  useBulkUploadWorkersMutation,
  useDownloadWorkerTemplateMutation,
} from '@/store/worker-management/worker-query';
import { useVendorsQuery } from '@/store/users/users-query';
import { DataTableCustoms } from '@repo/ui/components/advanced-data-table/data-table-customs';
import { Button } from '@repo/ui/components/ui/button';
import {
  Plus,
  FileUp,
  Download,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  HardHat,
  Building2,
  Phone,
  MapPin,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Copy,
  ExternalLink,
  ShieldCheck,
  ToggleLeft,
  Users,
} from 'lucide-react';
import { Input } from '@repo/ui/components/ui/input';
import { Badge } from '@repo/ui/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/components/ui/tooltip';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu';
import { Label } from '@repo/ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select';
import { useDebounce } from '@repo/ui/hooks/use-debounce';
import { Card } from '@repo/ui/components/ui/card';

export function WorkerManagementView() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  // Queries
  const { data: workerData, isLoading } = useWorkersQuery(
    page,
    limit,
    debouncedSearch,
  );
  const { data: vendorData } = useVendorsQuery(1, 100);

  // Mutations
  const createMutation = useCreateWorkerMutation();
  const updateMutation = useUpdateWorkerMutation();
  const deleteMutation = useDeleteWorkerMutation();
  const bulkUploadMutation = useBulkUploadWorkersMutation();
  const downloadTemplateMutation = useDownloadWorkerTemplateMutation();

  // Modal States
  const [isUpsertOpen, setIsUpsertOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const totalWorkers = workerData?.data?.stats?.total || 0;
  const activeWorkers = workerData?.data?.stats?.active || 0;
  const totalVendors = workerData?.data?.stats?.vendorsCount || 0;

  const memoizedData = useMemo(() => {
    if (!workerData) return [];
    return workerData.data?.workerVendors || workerData.workerVendors || [];
  }, [workerData]);

  const safeTotalCount = workerData?.data?.total || 0;
  const [file, setFile] = useState<File | null>(null);

  const workers = memoizedData;

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('ID copied to clipboard');
  };

  const handleToggleStatus = (worker: any) => {
    const newStatus = worker.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    updateMutation.mutate(
      { id: worker.id, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast.success(`Worker status changed to ${newStatus}`);
        },
      },
    );
  };

  const onPaginationChange = (updaterOrValue: any) => {
    const newState =
      typeof updaterOrValue === 'function'
        ? updaterOrValue({ pageIndex: page - 1, pageSize: limit })
        : updaterOrValue;
    setPage(newState.pageIndex + 1);
  };

  const paginationProps = {
    pageIndex: page - 1,
    pageSize: limit,
    pageCount: workerData?.data?.totalPages || 1,
    onPaginationChange,
  };

  const vendors = vendorData?.data?.vendors || [];

  const handleUpsert = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      status: formData.get('status') as string,
      vendorId: formData.get('vendorId') as string,
    };

    if (selectedWorker) {
      updateMutation.mutate(
        { id: selectedWorker.id, data },
        {
          onSuccess: () => {
            setIsUpsertOpen(false);
            setSelectedWorker(null);
          },
        },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => setIsUpsertOpen(false),
      });
    }
  };

  const handleBulkUpload = () => {
    if (file) {
      bulkUploadMutation.mutate(file, {
        onSuccess: () => {
          setIsBulkOpen(false);
          setFile(null);
        },
      });
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        id: 'name',
        header: 'Nama Worker',
        cell: ({ row }: any) => (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <HardHat className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-foreground">
                  {row.original.name}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                  ID: {row.original.id.slice(-6).toUpperCase()}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => handleCopyId(row.original.id)}
                >
                  <Copy className="h-2.5 w-2.5" />
                </Button>
              </div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'vendor.vendorName',
        id: 'vendor',
        header: 'Vendor',
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">
              {row.original.vendor?.vendorName || '-'}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'phone',
        id: 'phone',
        header: 'Kontak',
        cell: ({ row }: any) => (
          <TooltipProvider>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-xs bg-muted/50 px-2 py-0.5 rounded-full border border-muted-foreground/10">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{row.original.phone}</span>
                </div>
                <a
                  href={`https://wa.me/${row.original.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 hover:bg-emerald-500/10 hover:text-emerald-600 rounded-md transition-colors"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </a>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 text-xs cursor-help hover:text-primary transition-colors">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate max-w-[120px]">
                      {row.original.address}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-medium mb-1">Alamat Lengkap:</p>
                  <p className="leading-relaxed italic">
                    {row.original.address}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        ),
      },
      {
        accessorKey: 'status',
        id: 'status',
        header: 'Status',
        cell: ({ row }: any) => (
          <Badge
            className={
              row.original.status === 'ACTIVE'
                ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20'
                : 'bg-muted text-muted-foreground'
            }
          >
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }: any) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => handleToggleStatus(row.original)}
                className="gap-2"
              >
                <ToggleLeft className="h-4 w-4" /> Toggle Status
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedWorker(row.original);
                  setIsUpsertOpen(true);
                }}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" /> Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive gap-2"
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
                    deleteMutation.mutate(row.original.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" /> Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [deleteMutation, updateMutation],
  );

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 w-full">
        {/* STATS HEADER */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-4 border-none shadow-sm bg-gradient-to-br from-primary/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Total Worker
              </p>
              <p className="text-2xl font-bold">{totalWorkers}</p>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-gradient-to-br from-emerald-500/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="flex flex-col text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Worker Aktif
              </p>
              <p className="text-2xl font-bold">{activeWorkers}</p>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-gradient-to-br from-amber-500/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-amber-500" />
            </div>
            <div className="flex flex-col text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Vendor Terkait
              </p>
              <p className="text-2xl font-bold">{vendors.length}</p>
            </div>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Manajemen Tenaga Kerja
            </h1>
            <p className="text-sm text-muted-foreground italic">
              Kelola data pekerja dari seluruh mitra vendor SafeFlow.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              className="gap-2 shadow-sm order-2 sm:order-1"
              onClick={() => downloadTemplateMutation.mutate()}
            >
              <Download className="h-4 w-4" />
              Template
            </Button>
            <Button
              variant="outline"
              className="gap-2 shadow-sm order-3 sm:order-2"
              onClick={() => setIsBulkOpen(true)}
            >
              <FileUp className="h-4 w-4" />
              Bulk Upload
            </Button>
            <Button
              className="gap-2 shadow-lg shadow-primary/20 order-1 sm:order-3"
              onClick={() => {
                setSelectedWorker(null);
                setIsUpsertOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Tambah Worker
            </Button>
          </div>
        </div>

        <div className="relative w-full sm:max-w-md px-2">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama worker atau vendor..."
            className="pl-10 h-10 bg-card border-none shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Card className="border-none shadow-2xl">
          <div className="w-full overflow-hidden p-6">
            <DataTableCustoms
              columns={columns}
              data={workers}
              loading={isLoading}
              pagination={paginationProps}
              totalDataCount={workerData?.data?.total || 0}
              variant="minimal"
            />
          </div>
        </Card>

        {/* UPSERT MODAL */}
        <Dialog
          open={isUpsertOpen}
          onOpenChange={(open) => {
            setIsUpsertOpen(open);
            if (!open) setSelectedWorker(null);
          }}
        >
          <DialogContent className="sm:max-w-[500px] border-none shadow-2xl">
            <form onSubmit={handleUpsert}>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <HardHat className="h-6 w-6 text-primary" />
                  </div>
                  {selectedWorker ? 'Edit Data Worker' : 'Tambah Worker Baru'}
                </DialogTitle>
                <DialogDescription>
                  Isi data tenaga kerja dengan lengkap dan benar.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 py-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-semibold">
                    Nama Lengkap
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={selectedWorker?.name}
                    placeholder="Contoh: Budi Santoso"
                    required
                    className="bg-muted/30 focus:bg-background h-11"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="font-semibold">
                      Nomor Telepon
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      defaultValue={selectedWorker?.phone}
                      placeholder="0812..."
                      required
                      className="bg-muted/30 focus:bg-background h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status" className="font-semibold">
                      Status Keaktifan
                    </Label>
                    <Select
                      name="status"
                      defaultValue={selectedWorker?.status || 'ACTIVE'}
                    >
                      <SelectTrigger className="bg-muted/30 h-11">
                        <SelectValue placeholder="Pilih Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                        <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendorId" className="font-semibold">
                    Vendor / Perusahaan
                  </Label>
                  <Select
                    name="vendorId"
                    defaultValue={selectedWorker?.vendorId}
                    required
                  >
                    <SelectTrigger className="bg-muted/30 h-11">
                      <SelectValue placeholder="Pilih Vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v: any) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.vendorName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="font-semibold">
                    Alamat
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={selectedWorker?.address}
                    placeholder="Masukkan alamat domisili..."
                    required
                    className="bg-muted/30 focus:bg-background h-11"
                  />
                </div>
              </div>

              <DialogFooter className="gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUpsertOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="gap-2 font-bold min-w-[120px]"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Simpan Data
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* BULK UPLOAD MODAL */}
        <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
          <DialogContent className="sm:max-w-[450px] border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <FileUp className="h-6 w-6 text-secondary" />
                </div>
                Bulk Registration
              </DialogTitle>
              <DialogDescription>
                Unggah file Excel untuk mendaftarkan banyak worker sekaligus.
                Gunakan template resmi kami.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-muted rounded-2xl bg-muted/20 gap-4 mt-4">
              <div className="bg-background p-4 rounded-full shadow-sm">
                <Download className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center px-4">
                <p className="text-sm font-medium">
                  Klik tombol di bawah untuk memilih file
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Hanya mendukung format .xlsx
                </p>
              </div>
              <input
                type="file"
                id="bulk-file"
                className="hidden"
                accept=".xlsx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <Button
                variant={file ? 'secondary' : 'outline'}
                onClick={() => document.getElementById('bulk-file')?.click()}
                className="h-10"
              >
                {file ? file.name : 'Pilih File Excel'}
              </Button>
            </div>

            <DialogFooter className="mt-4">
              <Button
                className="w-full h-11 font-bold gap-2"
                disabled={!file || bulkUploadMutation.isPending}
                onClick={handleBulkUpload}
              >
                {bulkUploadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Proses Upload
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
