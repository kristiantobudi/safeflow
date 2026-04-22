'use client';

import { useParams } from 'next/navigation';
import { useJsa, useSubmitJsa } from '@/store/jsa/query';
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
  Shield,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  ClipboardList,
} from 'lucide-react';
import Link from 'next/link';
import { ApprovalTimeline } from '@/components/hse/approval-timeline';
import { toast } from 'sonner';

export default function JsaDetailPage() {
  const { id } = useParams() as { id: string };
  const queryClient = useQueryClient();
  const { data: jsa, isLoading, error } = useJsa(id);
  const { data: authData } = useAuthQuery();

  const submitMutation = useSubmitJsa(id);

  // Get current user ID from auth query cache
  const currentUserId = authData?.data?.id;
  const isOwner = jsa?.createdBy === currentUserId;
  const canSubmit = isOwner && jsa && ['PENDING', 'REJECTED'].includes(jsa.approvalStatus);

  const handleSubmitForApproval = () => {
    submitMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['jsa', id] });
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { message?: string } } };
        const message = err.response?.data?.message;

        // Check for HIRAC connection error
        if (message && message.toLowerCase().includes('hirac')) {
          toast.error(
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">JSA harus terhubung ke HIRAC</p>
                <p className="text-sm mt-1">{message}</p>
              </div>
            </div>
          );
        } else {
          toast.error(message || 'Gagal mengajukan JSA untuk approval');
        }
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
  if (error || !jsa) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
              <div>
                <h3 className="font-semibold text-destructive">Gagal memuat data JSA</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {(error as Error)?.message || 'JSA tidak ditemukan'}
                </p>
                <Link href="/hse/jsa" className="mt-4 inline-block">
                  <Button variant="outline" size="sm" className="gap-2 mt-4">
                    <ArrowLeft className="h-4 w-4" />
                    Kembali ke daftar JSA
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
  const latestVersion = jsa.versions?.[jsa.versions.length - 1];
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

  // APD checklist items
  const apdItems = [
    { key: 'safetyHelmet', label: 'Safety Helmet' },
    { key: 'safetyShoes', label: 'Safety Shoes' },
    { key: 'gloves', label: 'Safety Gloves' },
    { key: 'safetyGlasses', label: 'Safety Glasses' },
    { key: 'safetyVest', label: 'Safety Vest' },
    { key: 'safetyBodyHarness', label: 'Body Harness' },
  ];

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link href="/hse/jsa" className="w-fit">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke daftar JSA
          </Button>
        </Link>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <ClipboardList className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground/90">
                {jsa.noJsa || `JSA-${jsa.id.slice(-6).toUpperCase()}`}
              </h1>
              <p className="text-lg font-medium text-foreground">
                {jsa.jenisKegiatan}
              </p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Badge variant={getStatusBadgeVariant(jsa.approvalStatus)}>
                  {jsa.approvalStatus}
                </Badge>
                <span>•</span>
                <span>Revisi ke-{jsa.revisiKe}</span>
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
          {/* JSA Details Card */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Detail JSA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Jenis Kegiatan */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Jenis Kegiatan</p>
                  <p className="font-semibold">{jsa.jenisKegiatan}</p>
                </div>

                {/* Tanggal Dibuat */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Tanggal Dibuat
                  </p>
                  <p className="font-semibold">
                    {jsa.tanggalDibuat
                      ? new Date(jsa.tanggalDibuat).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '-'}
                  </p>
                </div>

                {/* Lokasi Kegiatan */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    Lokasi Kegiatan
                  </p>
                  <p className="font-semibold">{jsa.lokasiKegiatan || '-'}</p>
                </div>

                {/* Pelaksana Utama */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    Pelaksana Utama
                  </p>
                  <p className="font-semibold">{jsa.pelaksanaUtama || '-'}</p>
                </div>

                {/* HSE In Charge */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Shield className="h-4 w-4" />
                    HSE In Charge
                  </p>
                  <p className="font-semibold">{jsa.hseInCharge || '-'}</p>
                </div>

                {/* Referensi HIRAC */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Referensi HIRAC</p>
                  <p className="font-semibold">{jsa.referensiHirarc || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* APD Checklist Card */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Checklist APD
              </CardTitle>
            </CardHeader>
            <CardContent>
              {jsa.apd ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {apdItems.map((item) => {
                    const isChecked = jsa.apd?.[item.key as keyof typeof jsa.apd];
                    return (
                      <div
                        key={item.key}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          isChecked
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-muted/30 border-transparent'
                        }`}
                      >
                        {isChecked ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                        )}
                        <span
                          className={`text-sm font-medium ${
                            isChecked ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                  {jsa.apd?.others && (
                    <div className="col-span-full p-3 rounded-lg bg-muted/30 border border-transparent">
                      <p className="text-sm font-medium text-muted-foreground">APD Lainnya:</p>
                      <p className="font-semibold">{jsa.apd.others}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Checklist APD tidak tersedia
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
                    {jsa.creator?.firstName} {jsa.creator?.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="font-semibold text-sm">{jsa.creator?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tanggal Dibuat</p>
                  <p className="font-semibold text-sm">
                    {new Date(jsa.createdAt).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Terakhir Diupdate</p>
                  <p className="font-semibold text-sm">
                    {new Date(jsa.updatedAt).toLocaleDateString('id-ID')}
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