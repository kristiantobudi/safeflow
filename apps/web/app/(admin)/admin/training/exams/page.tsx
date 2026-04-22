'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle, Eye, Calendar, Clock, BookOpen, User } from 'lucide-react';

import { Card } from '@repo/ui/components/ui/card';
import { Badge } from '@repo/ui/components/ui/badge';
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

import { useExamList } from '@/store/training/query';
import type { ExamListItem } from '@/lib/services/training';

export default function AdminTrainingExamsPage() {
  const router = useRouter();
  const { data, isLoading } = useExamList();

  const memoizedData = useMemo(() => {
    return data || [];
  }, [data]);

  const totalExams = memoizedData.length;

  const columns = useMemo(
    () => [
      createSelectionColumn<ExamListItem>(),
      {
        accessorKey: 'module.title',
        header: createSortableHeader<ExamListItem>('Modul'),
        cell: ({ row }: { row: Row<ExamListItem> }) => {
          const title = row.original.module?.title || 'Unknown Module';
          return (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-none">{title}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mt-1">
                  ID: {row.original.moduleId.slice(-6).toUpperCase()}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'duration',
        header: createSortableHeader<ExamListItem>('Durasi'),
        cell: ({ row }: { row: Row<ExamListItem> }) => {
          return (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{row.original.duration} menit</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'questionCount',
        header: createSortableHeader<ExamListItem>('Jumlah Soal'),
        cell: ({ row }: { row: Row<ExamListItem> }) => {
          const count = row.original._count?.question || 0;
          return (
            <div className="flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <Badge
                variant={count > 0 ? 'secondary' : 'outline'}
                className="font-medium"
              >
                {count} Soal
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: 'creator',
        header: 'Pembuat',
        cell: ({ row }: { row: Row<ExamListItem> }) => {
          const creator = row.original.creator;
          const name = creator
            ? `${creator.firstName} ${creator.lastName}`
            : 'System';
          return (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{name}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: createSortableHeader<ExamListItem>('Tanggal Dibuat'),
        cell: ({ row }: { row: Row<ExamListItem> }) => {
          const date = new Date(row.original.createdAt);
          return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {date.toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          );
        },
      },
      createActionsColumn<ExamListItem>([
        {
          icon: <Eye className="h-4 w-4" />,
          label: 'Lihat Detail Modul',
          onClick: (data) =>
            router.push(`/admin/training/modules/${data.moduleId}`),
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
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium text-muted-foreground">
                Total Ujian
              </p>
              <p className="text-2xl font-bold">{totalExams}</p>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-linear-to-br from-emerald-500/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium text-muted-foreground">
                Rata-rata Durasi
              </p>
              <p className="text-2xl font-bold">
                {totalExams > 0
                  ? Math.round(
                      memoizedData.reduce((acc, ex) => acc + ex.duration, 0) /
                        totalExams,
                    )
                  : 0}{' '}
                min
              </p>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-linear-to-br from-amber-500/5 to-transparent flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <HelpCircle className="h-6 w-6 text-amber-500" />
            </div>
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium text-muted-foreground">
                Total Pertanyaan
              </p>
              <p className="text-2xl font-bold">
                {memoizedData.reduce(
                  (acc, ex) => acc + (ex._count?.question || 0),
                  0,
                )}
              </p>
            </div>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Daftar Ujian
            </h1>
            <p className="text-sm text-muted-foreground italic">
              Monitoring dan kelola seluruh ujian yang ada pada modul training.
            </p>
          </div>
        </div>

        <Card className="border-none shadow-2xl">
          <div className="w-full overflow-hidden p-6">
            <DataTableCustoms
              className="w-full"
              columns={columns}
              data={memoizedData}
              searchKey="module_title" // Note: This might need custom filter function for nested property
              searchPlaceholder="Cari ujian..."
              enableSavedViews
              enableRowSelection
              showColumnToggle
              variant="minimal"
              loading={isLoading}
              totalDataCount={totalExams}
              onRowClick={(row) =>
                router.push(`/admin/training/exams/${row.original.id}`)
              }
            />
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
}
