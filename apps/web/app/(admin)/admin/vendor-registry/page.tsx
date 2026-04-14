'use client';

import { useMemo, useState, useEffect } from 'react';
import { useVendorsQuery } from '@/store/users/users-query';
import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/ui/dialog';
import {
  Pencil,
  Trash2,
  Building2,
  Mail,
  Phone,
  MessageSquare,
  Copy,
  ShieldCheck,
  Users,
  Plus,
} from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/ui/components/ui/avatar';
import { Badge } from '@repo/ui/components/ui/badge';
import {
  createSelectionColumn,
  createActionsColumn,
  createSortableHeader,
} from '@repo/ui/components/advanced-data-table/column';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/components/ui/tooltip';
import { DataTableCustoms } from '@repo/ui/components/advanced-data-table/data-table-customs';
import { Row } from '@tanstack/react-table';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card } from '@repo/ui/components/ui/card';
import { toast } from 'sonner';

interface VendorProps {
  id: string;
  vendorName: string;
  vendorEmail: string;
  vendorPhone: string;
  vendorAddress: string;
  vendorLogo: string | null;
  vendorStatus: string;
  createdAt: string;
}

export default function VendorRegistryPage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [globalSearch, setGlobalSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const router = useRouter();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(globalSearch);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 500);

    return () => clearTimeout(timer);
  }, [globalSearch]);

  const { data, isLoading } = useVendorsQuery(
    pagination.pageIndex + 1,
    pagination.pageSize,
    debouncedSearch,
  );

  const totalVendors = data?.data?.stats?.total || 0;
  const activeVendors = data?.data?.stats?.active || 0;

  const memoizedData = useMemo(() => {
    if (!data) return [];
    return data.data?.vendors || data.vendors || [];
  }, [data]);

  const safeTotalPersonel = data?.data?.total || data?.vendors?.length || 0;

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('Vendor ID copied to clipboard');
  };

  const safeTotalCount = data?.data?.total || 0;

  const columns = useMemo(
    () => [
      createSelectionColumn<VendorProps>(),
      {
        accessorKey: 'vendorName',
        header: 'Vendor Name',
        cell: ({ row }: { row: Row<VendorProps> }) => {
          const logoUrl = row.original.vendorLogo;
          const name = row.getValue('vendorName') as string;

          return (
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Avatar className="h-9 w-9 border border-border cursor-pointer hover:opacity-80 transition-opacity">
                      <AvatarImage
                        src={logoUrl}
                        alt={name}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{name} Logo</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg">
                      <Image
                        src={logoUrl}
                        width={400}
                        height={400}
                        alt={name}
                        unoptimized
                        className="rounded-md object-contain max-h-[400px]"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-none">{name}</span>
                <div className="flex items-center gap-1 mt-1">
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
          );
        },
      },
      {
        accessorKey: 'vendorEmail',
        header: 'Contact Info',
        cell: ({ row }: { row: Row<VendorProps> }) => {
          return (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-[10px] bg-muted/50 px-2 py-0.5 rounded-full border border-muted-foreground/10 text-muted-foreground font-medium">
                  <Mail className="h-2.5 w-2.5" />
                  <span>{row.original.vendorEmail}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-[10px] bg-muted/50 px-2 py-0.5 rounded-full border border-muted-foreground/10 text-muted-foreground font-medium">
                  <Phone className="h-2.5 w-2.5" />
                  <span>{row.original.vendorPhone}</span>
                </div>
                <a
                  href={`https://wa.me/${row.original.vendorPhone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 hover:bg-emerald-500/10 hover:text-emerald-600 rounded-md transition-colors"
                >
                  <MessageSquare className="h-3 w-3" />
                </a>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'vendorAddress',
        header: 'Address',
        headerClassName: 'hidden md:table-cell',
        cellClassName: 'hidden md:table-cell',
        cell: ({ row }: { row: Row<VendorProps> }) => {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-start gap-2 max-w-[200px] cursor-help">
                  <span className="text-xs line-clamp-2 italic text-muted-foreground">
                    {row.getValue('vendorAddress') || 'No address provided'}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                {row.getValue('vendorAddress')}
              </TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: 'vendorStatus',
        header: 'Status',
        cell: ({ row }: { row: Row<VendorProps> }) => {
          const status = row.getValue('vendorStatus') as string;
          const isActive = status === 'ACTIVE';
          return (
            <Badge
              variant={isActive ? 'status-active' : 'status-inactive'}
              className="gap-1.5 px-2.5 py-0.5"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}
              />
              {status}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: createSortableHeader<VendorProps>('Registration Date'),
        headerClassName: 'hidden lg:table-cell',
        cellClassName: 'hidden lg:table-cell',
        cell: ({ row }: { row: Row<VendorProps> }) => {
          const date = new Date(row.original.createdAt);
          return (
            <span className="text-xs font-medium text-muted-foreground">
              {date.toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          );
        },
      },
      createActionsColumn<VendorProps>([
        {
          icon: <Building2 className="h-4 w-4" />,
          label: 'View Details',
          onClick: (data) => router.push(`/admin/vendor-registry/${data.id}`),
        },
        {
          icon: <Pencil className="h-4 w-4" />,
          label: 'Edit Vendor',
          onClick: (data) =>
            router.push(`/admin/vendor-registry/${data.id}/edit`),
        },
        {
          icon: <Trash2 className="h-4 w-4 text-destructive" />,
          label: 'Delete Vendor',
          onClick: (data) => console.log('Delete', data.id),
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
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium text-muted-foreground">
                Total Vendor
              </p>
              <p className="text-2xl font-bold">{totalVendors}</p>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-gradient-to-br from-emerald-500/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-muted-foreground">
                Vendor Aktif
              </p>
              <p className="text-2xl font-bold">{activeVendors}</p>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-gradient-to-br from-amber-500/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-amber-500" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-muted-foreground">
                Total Personel
              </p>
              <p className="text-2xl font-bold">{safeTotalPersonel}</p>
            </div>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Vendor Registry
            </h1>
            <p className="text-sm text-muted-foreground italic">
              Kelola data mitra kerja, vendor, dan profil perusahaan yang
              terhubung dengan platform Safeflow.
            </p>
          </div>
          <Button
            className="gap-2 shadow-lg shadow-primary/20 order-1 sm:order-3"
            onClick={() => router.push('/admin/vendor-registry/create')}
          >
            <Plus className="h-4 w-4" />
            Tambah Vendor
          </Button>
        </div>

        <Card className="border-none shadow-2xl">
          <div className="w-full overflow-hidden p-6">
            <DataTableCustoms
              className="w-full"
              columns={columns}
              data={memoizedData}
              searchKey="vendorName"
              searchPlaceholder="Cari vendor, email, atau alamat..."
              onGlobalFilterChangeExternal={setGlobalSearch}
              enableSavedViews
              enableRowSelection
              enableEditing
              showColumnToggle
              variant="minimal"
              loading={isLoading}
              totalDataCount={safeTotalCount}
              pagination={{
                pageIndex: pagination.pageIndex,
                pageSize: pagination.pageSize,
                pageCount: Math.ceil(
                  (safeTotalCount || 0) / pagination.pageSize,
                ),
                onPaginationChange: setPagination,
              }}
            />
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
}
