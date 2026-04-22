'use client';

import { useParams } from 'next/navigation';
import { usePtw, useSubmitPtw } from '@/store/ptw/query';
import { useAuthQuery } from '@/store/auth/auth-query';
import { useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';
import { Skeleton } from '@repo/ui/components/ui/skeleton';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  FileText,
  AlertTriangle,
  Send,
  ClipboardList,
  Link as LinkIcon,
} from 'lucide-react';
import Link from 'next/link';
import { ApprovalTimeline } from '@/components/hse/approval-timeline';
import { toast } from 'sonner';

export default function PtwDetailPage() {
  const { id } = useParams() as { id: string };
  const queryClient = useQueryClient();
  const { data: ptw, isLoading, error } = usePtw(id);
  const { data: authData } = useAuthQuery();

  const submitMutation = useSubmitPtw(id);

  // Get current user ID from auth query cache
  const currentUserId = authData?.data?.id;
  const isOwner = ptw?.createdBy === currentUserId;
  const canSubmit = isOwner && ptw && ['PENDING', 'REJECTED'].includes(ptw.approvalStatus);

  const handleSubmitForApproval = () => {
    submitMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['ptw', id] });
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || 'Gagal mengajukan PTW untuk approval');
      },
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-8 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40 mb-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !ptw) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
              <div>
                <h3 className="font-semibold text-destructive">Gagal memuat data PTW</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {(error as Error)?.message || 'PTW tidak ditemukan'}
                </p>
                <Link href="/hse/ptw" className="mt-4 inline-block">
                  <Button variant="outline" size="sm" className="gap-2 mt-4">
                    <ArrowLeft className="h-4 w-4" />
                    Kembali ke daftar PTW
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get approval steps from the latest version
  const latestVersion = ptw.versions?.[ptw.versions.length - 1];
  const approvalSteps = latestVersion?.approvalSteps || [];

  // Status badge variant
  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'APPROVED':
        return 'default';
      case 'REJECTED':
        return 'destructive';
      case 'SUBMITTED':
        return 'default';
      case 'PENDING':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link href="/hse/ptw" className="w-fit">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke daftar PTW
          </Button>
        </Link>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <ClipboardList className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground/90">
                {ptw.noPtw || `PTW-${ptw.id.slice(-6).toUpperCase()}`}
              </h1>
              <p className="text-lg font-medium text-foreground">
                {ptw.judulPekerjaan}
              </p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Badge variant={getStatusBadgeVariant(ptw.approvalStatus)}>
                  {ptw.approvalStatus}
                </Badge>
              </div>
            </div>
          </div>

          {canSubmit && (
            <Button
              onClick={handleSubmitForApproval}
              disabled={submitMutation.isPending}
              className="shadow-lg shadow-primary/20 gap-2 h-11 px-6 font-semibold"
            >
              {submitMutation.isPending ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit untuk Approval
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* PTW Details Card */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Detail PTW
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Judul Pekerjaan */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Judul Pekerjaan</p>
                  <p className="font-semibold">{ptw.judulPekerjaan}</p>
                </div>

                {/* Tanggal Mulai */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Tanggal Mulai
                  </p>
                  <p className="font-semibold">
                    {ptw.tanggalMulai
                      ? new Date(ptw.tanggalMulai).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '-'}
                  </p>
                </div>

                {/* Lokasi Pekerjaan */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    Lokasi Pekerjaan
                  </p>
                  <p className="font-semibold">{ptw.lokasiPekerjaan || '-'}</p>
                </div>

                {/* Tanggal Selesai */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Tanggal Selesai
                  </p>
                  <p className="font-semibold">
                    {ptw.tanggalSelesai
                      ? new Date(ptw.tanggalSelesai).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '-'}
                  </p>
                </div>

                {/* Keterangan Tambahan */}
                <div className="col-span-full space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Keterangan Tambahan</p>
                  <p className="font-semibold">
                    {ptw.keteranganTambahan || '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* JSA Related Info Card */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-primary" />
                JSA Terkait
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ptw.jsaProject ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Nomor JSA</p>
                      <p className="font-semibold">{ptw.jsaProject.noJsa || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Jenis Kegiatan</p>
                      <p className="font-semibold">{ptw.jsaProject.jenisKegiatan || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Status JSA</p>
                      <Badge variant={getStatusBadgeVariant(ptw.jsaProject.approvalStatus)}>
                        {ptw.jsaProject.approvalStatus}
                      </Badge>
                    </div>
                  </div>
                  <Link href={`/hse/jsa/${ptw.jsaProject.id}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Lihat Detail JSA
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  JSA tidak tersedia
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Creator Info Card */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Informasi Pembuat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nama</p>
                  <p className="font-semibold">
                    {ptw.creator?.firstName} {ptw.creator?.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="font-semibold text-sm">{ptw.creator?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tanggal Dibuat</p>
                  <p className="font-semibold text-sm">
                    {new Date(ptw.createdAt).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Terakhir Diupdate</p>
                  <p className="font-semibold text-sm">
                    {new Date(ptw.updatedAt).toLocaleDateString('id-ID')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approval Timeline Card */}
          <Card className="border-none shadow-lg">
            <CardContent className="pt-6">
              <ApprovalTimeline steps={approvalSteps} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}