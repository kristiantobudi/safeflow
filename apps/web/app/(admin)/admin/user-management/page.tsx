'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  useDeactivatedUserByAdminMutation,
  useUsersQuery,
  useVerifyUserByAdminMutation,
} from '@/store/users/users-query';
import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/ui/dialog';
import {
  BadgeX,
  Pencil,
  ShieldCheck,
  ShieldMinus,
  Trash2,
  User,
  UserPlus,
  Copy,
  ToggleLeft,
  UserCheck,
  Users,
  ShieldQuestion,
  Search,
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

interface UserProps {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  username: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
}

export default function UserManagement() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [globalSearch, setGlobalSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const verifyUserByAdminMutation = useVerifyUserByAdminMutation();
  const deactivateUserByAdminMutation = useDeactivatedUserByAdminMutation();
  const router = useRouter();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(globalSearch);
      // Reset to page 1 when searching
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 500);

    return () => clearTimeout(timer);
  }, [globalSearch]);

  const { data, isLoading } = useUsersQuery(
    pagination.pageIndex + 1,
    pagination.pageSize,
    debouncedSearch,
  );

  const memoizedData = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.data?.users || data.users || [];
  }, [data]);

  const totalUsers = data?.data?.stats?.total || 0;
  const verifiedUsers = data?.data?.stats?.verified || 0;
  const unverifiedUsers = data?.data?.stats?.unverified || 0;
  const activeUsers = data?.data?.stats?.active || 0;

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('User ID copied to clipboard');
  };

  const sortedUsers = useMemo(() => {
    return [...memoizedData].sort((a: any, b: any) => {
      return Number(a.isVerified) - Number(b.isVerified);
    });
  }, [memoizedData]);

  const safeHeader = totalUsers;

  const columns = useMemo(
    () => [
      createSelectionColumn<UserProps>(),
      {
        accessorFn: (row: UserProps) =>
          `${row.firstName} ${row.lastName || ''}`.trim(),
        id: 'name',
        header: 'Nama Lengkap',
        cell: ({ row }: { row: Row<UserProps> }) => {
          const avatarUrl = (row.original as any).avatarUrl;
          const url = avatarUrl ? `${avatarUrl.replace(/^\/+/, '')}` : '';
          const name = row.getValue('name') as string;

          return (
            <div className="flex items-center gap-3">
              {url ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Avatar className="h-9 w-9 border border-border cursor-pointer hover:opacity-80 transition-opacity">
                      <AvatarImage src={url} alt="" className="object-cover" />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>User Profile</DialogTitle>
                    </DialogHeader>
                    <Image
                      src={url}
                      width={500}
                      height={500}
                      alt="Foto"
                      unoptimized
                      className="rounded-md"
                    />
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-help">
                      {row.original.email}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="flex items-center gap-2">
                    <span>{row.original.email}</span>
                    <Button
                      onClick={() => handleCopyId(row.original.email)}
                      size="icon"
                      variant="ghost"
                      className="h-4 w-4 hover:bg-transparent hover:text-background transition-colors"
                    >
                      <Copy className="h-2.5 w-2.5" />
                    </Button>
                  </TooltipContent>
                </Tooltip>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
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
        meta: {
          label: 'Nama Lengkap',
        },
      },
      {
        accessorKey: 'vendorName',
        header: 'Vendor',
        headerClassName: 'hidden md:table-cell',
        cellClassName: 'hidden md:table-cell',
        cell: ({ row }: { row: Row<UserProps> }) => {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="role-regular"
                  className="gap-1.5 px-2.5 py-0.5 cursor-help"
                >
                  {row.getValue('vendorName') || 'N/A'}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Informasi Vendor</TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }: { row: Row<UserProps> }) => {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={
                    row.getValue('role') === 'ADMIN'
                      ? 'role-admin'
                      : 'role-regular'
                  }
                  className="gap-1.5 px-2.5 py-0.5 cursor-help"
                >
                  {row.getValue('role')}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Tingkat Akses</TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }: { row: Row<UserProps> }) => {
          const isActive = row.getValue('isActive') === true;
          return (
            <Badge
              variant={isActive ? 'status-active' : 'status-inactive'}
              className="gap-1.5 px-2.5 py-0.5"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}
              />
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'isVerified',
        header: 'Status Verifikasi',
        headerClassName: 'hidden md:table-cell',
        cellClassName: 'hidden md:table-cell',
        cell: ({ row }: { row: Row<UserProps> }) => {
          const isVerified = row.getValue('isVerified') === true;
          return (
            <Badge
              variant={isVerified ? 'verify-true' : 'verify-false'}
              className="gap-1.5 px-2.5 py-0.5"
            >
              {isVerified ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : (
                <BadgeX className="h-3.5 w-3.5" />
              )}
              {isVerified ? 'Terverifikasi' : 'Belum Terverifikasi'}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: createSortableHeader<UserProps>('Tanggal Registrasi'),
        headerClassName: 'hidden lg:table-cell',
        cellClassName: 'hidden lg:table-cell',
        meta: {
          label: 'Tanggal Registrasi',
        },
        cell: ({ row }: { row: Row<UserProps> }) => {
          const date = new Date(row.original.createdAt);
          const formattedDate = date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
          return <span className="text-sm font-semibold">{formattedDate}</span>;
        },
      },
      createActionsColumn<UserProps>([
        {
          icon: <User className="h-4 w-4" />,
          label: 'Verify User',
          onClick: (data) => verifyUserByAdminMutation.mutate(data.id),
        },
        {
          icon: <Pencil className="h-4 w-4" />,
          label: 'Edit User',
          onClick: (data) =>
            router.push(`/admin/user-management/${data.id}/edit`),
        },
        {
          icon: <ShieldMinus className="h-4 w-4" />,
          label: 'Deactivate User',
          onClick: (data) => deactivateUserByAdminMutation.mutate(data.id),
        },
        {
          icon: <Trash2 className="h-4 w-4" />,
          label: 'Delete User',
          onClick: (data) => console.log(data),
        },
      ]),
    ],
    [],
  );

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 w-full max-w-full mx-auto overflow-hidden">
        {/* STATS HEADER */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-none shadow-sm bg-gradient-to-br from-primary/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium text-muted-foreground">
                Total User
              </p>
              <p className="text-2xl font-bold">{totalUsers}</p>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-gradient-to-br from-emerald-500/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium text-muted-foreground">
                Terverifikasi
              </p>
              <p className="text-2xl font-bold">{verifiedUsers}</p>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-gradient-to-br from-amber-500/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <ShieldQuestion className="h-6 w-6 text-amber-500" />
            </div>
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium text-muted-foreground">
                Belum Verifikasi
              </p>
              <p className="text-2xl font-bold">{unverifiedUsers}</p>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-gradient-to-br from-blue-500/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium text-muted-foreground">
                User Aktif
              </p>
              <p className="text-2xl font-bold">{activeUsers}</p>
            </div>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Manajemen User
            </h1>
            <p className="text-sm text-muted-foreground italic">
              Kelola user, role, dan akses permission di organisasi Anda.
            </p>
          </div>
          <Button
            className="gap-2 shadow-lg shadow-primary/20 order-1 sm:order-3"
            onClick={() => router.push('/admin/user-management/create')}
          >
            <Plus className="h-4 w-4" />
            <span className="font-medium">Tambah User</span>
          </Button>
        </div>

        <Card className="border-none shadow-2xl">
          <div className="w-full overflow-hidden p-6">
            <DataTableCustoms
              className="w-full"
              columns={columns}
              data={sortedUsers}
              searchKey="name"
              searchPlaceholder="Cari berdasarkan nama..."
              onGlobalFilterChangeExternal={setGlobalSearch}
              enableSavedViews
              enableRowSelection
              enableEditing
              showColumnToggle
              variant="minimal"
              loading={isLoading}
              totalDataCount={safeHeader}
              pagination={{
                pageIndex: pagination.pageIndex,
                pageSize: pagination.pageSize,
                pageCount: Math.ceil((safeHeader || 0) / pagination.pageSize),
                onPaginationChange: setPagination,
              }}
            />
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
}
