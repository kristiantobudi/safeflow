'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  BookOpen,
  FileText,
  HelpCircle,
  Plus,
  Trash2,
  Eye,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@repo/ui/components/ui/button';
import { Card } from '@repo/ui/components/ui/card';
import { Input } from '@repo/ui/components/ui/input';
import { Textarea } from '@repo/ui/components/ui/textarea';
import { Label } from '@repo/ui/components/ui/label';
import { Badge } from '@repo/ui/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@repo/ui/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@repo/ui/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/components/ui/tooltip';
import {
  createSelectionColumn,
  createActionsColumn,
  createSortableHeader,
} from '@repo/ui/components/advanced-data-table/column';
import { DataTableCustoms } from '@repo/ui/components/advanced-data-table/data-table-customs';
import { Row } from '@tanstack/react-table';

import {
  useModuleList,
  useCreateModule,
  useDeleteModule,
} from '@/store/training/query';
import { createModuleSchema, type CreateModuleInput } from '@repo/validation';

interface ModuleListItem {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    files: number;
    exam: number;
    question: number;
  };
}

export default function AdminTrainingModulesPage() {
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteModuleId, setDeleteModuleId] = useState<string | null>(null);
  const [deleteModuleTitle, setDeleteModuleTitle] = useState<string>('');
  const [titleError, setTitleError] = useState<string | null>(null);

  const { data, isLoading } = useModuleList();
  const createModuleMutation = useCreateModule();
  const deleteModuleMutation = useDeleteModule();

  const form = useForm({
    resolver: yupResolver(createModuleSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  const memoizedData = useMemo(() => {
    if (!data) return [];
    return data || [];
  }, [data]);

  const totalModules = memoizedData.length;

  const handleCreateModule = (values: CreateModuleInput) => {
    setTitleError(null);
    createModuleMutation.mutate(values, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        form.reset();
        setTitleError(null);
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { message?: string } } };
        const errorMessage = err.response?.data?.message || '';
        if (
          errorMessage.toLowerCase().includes('title') ||
          errorMessage.toLowerCase().includes('duplicate') ||
          errorMessage.includes('sudah digunakan')
        ) {
          setTitleError('Judul modul sudah digunakan');
        }
      },
    });
  };

  const handleDeleteModule = () => {
    if (deleteModuleId) {
      deleteModuleMutation.mutate(deleteModuleId, {
        onSuccess: () => {
          setDeleteModuleId(null);
          setDeleteModuleTitle('');
        },
      });
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('Module ID copied to clipboard');
  };

  const columns = useMemo(
    () => [
      createSelectionColumn<ModuleListItem>(),
      {
        accessorKey: 'title',
        header: createSortableHeader<ModuleListItem>('Judul Modul'),
        cell: ({ row }: { row: Row<ModuleListItem> }) => {
          const title = row.getValue('title') as string;
          return (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-none">{title}</span>
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
        accessorKey: 'description',
        header: 'Deskripsi',
        cell: ({ row }: { row: Row<ModuleListItem> }) => {
          const description = row.getValue('description') as string | null;
          if (!description) {
            return <span className="text-muted-foreground text-sm">-</span>;
          }
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="max-w-[200px] cursor-help">
                  <span className="text-sm line-clamp-2 text-muted-foreground">
                    {description}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                {description}
              </TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: 'fileCount',
        header: createSortableHeader<ModuleListItem>('Jumlah File'),
        cell: ({ row }: { row: Row<ModuleListItem> }) => {
          const fileCount = row.original._count.files;
          return (
            <div className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="font-medium">
                {fileCount}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: 'questionCount',
        header: createSortableHeader<ModuleListItem>('Jumlah Soal'),
        cell: ({ row }: { row: Row<ModuleListItem> }) => {
          const questionCount = row.original._count.question;
          return (
            <div className="flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="font-medium">
                {questionCount}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: createSortableHeader<ModuleListItem>('Tanggal Dibuat'),
        cell: ({ row }: { row: Row<ModuleListItem> }) => {
          const date = new Date(row.original.createdAt);
          return (
            <span className="text-sm font-medium text-muted-foreground">
              {date.toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          );
        },
      },
      createActionsColumn<ModuleListItem>([
        {
          icon: <Eye className="h-4 w-4" />,
          label: 'Lihat Detail',
          onClick: (data) => router.push(`/admin/training/modules/${data.id}`),
        },
        {
          icon: <Trash2 className="h-4 w-4 text-destructive" />,
          label: 'Hapus Modul',
          onClick: (data) => {
            setDeleteModuleId(data.id);
            setDeleteModuleTitle(data.title);
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
          <Card className="p-4 border-none shadow-sm bg-linear-to-br from-primary/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium text-muted-foreground">
                Total Modul
              </p>
              <p className="text-2xl font-bold">{totalModules}</p>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-linear-to-br from-emerald-500/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium text-muted-foreground">
                Total File
              </p>
              <p className="text-2xl font-bold">
                {memoizedData.reduce(
                  (acc: number, mod: ModuleListItem) => acc + mod._count.files,
                  0,
                )}
              </p>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-linear-to-br from-amber-500/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <HelpCircle className="h-6 w-6 text-amber-500" />
            </div>
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium text-muted-foreground">
                Total Soal
              </p>
              <p className="text-2xl font-bold">
                {memoizedData.reduce(
                  (acc: number, mod: ModuleListItem) =>
                    acc + mod._count.question,
                  0,
                )}
              </p>
            </div>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Modul Training
            </h1>
            <p className="text-sm text-muted-foreground italic">
              Kelola modul training, materi, dan soal ujian untuk sertifikasi
              vendor.
            </p>
          </div>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) {
                setTitleError(null);
                form.reset();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/20 order-1 sm:order-3">
                <Plus className="h-4 w-4" />
                <span className="font-medium">Tambah Modul</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Modul Training Baru</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleCreateModule)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Judul Modul</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Masukkan judul modul"
                            {...field}
                          />
                        </FormControl>
                        {titleError && (
                          <p className="text-sm font-medium text-destructive">
                            {titleError}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deskripsi</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Masukkan deskripsi modul (opsional)"
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={createModuleMutation.isPending}
                    >
                      {createModuleMutation.isPending
                        ? 'Membuat...'
                        : 'Buat Modul'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-none shadow-2xl">
          <div className="w-full overflow-hidden p-6">
            <DataTableCustoms
              className="w-full"
              columns={columns}
              data={memoizedData}
              searchKey="title"
              searchPlaceholder="Cari modul..."
              enableSavedViews
              enableRowSelection
              enableEditing
              showColumnToggle
              variant="minimal"
              loading={isLoading}
              totalDataCount={totalModules}
              onRowClick={(row) =>
                router.push(`/admin/training/modules/${row.original.id}`)
              }
            />
          </div>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deleteModuleId}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteModuleId(null);
              setDeleteModuleTitle('');
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Modul Training</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus modul &quot;
                {deleteModuleTitle}
                &quot;? Tindakan ini akan melakukan soft-delete dan modul tidak
                akan dapat diakses oleh vendor.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteModule}
                disabled={deleteModuleMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteModuleMutation.isPending ? 'Menghapus...' : 'Hapus'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
