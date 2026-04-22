'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@repo/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select';
import { Textarea } from '@repo/ui/components/ui/textarea';
import { Label } from '@repo/ui/components/ui/label';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Pencil,
  Loader2,
  XCircle,
  ExternalLink,
  Info,
  Award,
  ShieldCheck,
  ShieldOff,
  Clock,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import { useVendorDetailQuery } from '@/store/users/users-query';
import {
  useVendorCertificationStatus,
  useCertificationPrograms,
  useAssignVendorToProgram,
  useRevokeCertification,
  useRenewCertification,
} from '@/store/vendor-certification/query';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/ui/components/ui/avatar';
import { Badge } from '@repo/ui/components/ui/badge';
import { Separator } from '@repo/ui/components/ui/separator';
import { formatDate } from '@/helper/format-date-helper';

// ─── Types ────────────────────────────────────────────────────────────────────

type CertStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

interface CertificationData {
  id: string;
  certNumber: string;
  status: CertStatus;
  issuedAt: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
  revokeReason?: string | null;
  program?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
}

interface VendorCertStatusData {
  certified: boolean;
  certification?: CertificationData | null;
  program?: { id: string; name: string } | null;
}

function certStatusBadge(status: CertStatus) {
  switch (status) {
    case 'ACTIVE':
      return (
        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none gap-1.5 font-bold uppercase tracking-wider text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          AKTIF
        </Badge>
      );
    case 'EXPIRED':
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none font-bold uppercase tracking-wider text-xs">
          KEDALUWARSA
        </Badge>
      );
    case 'REVOKED':
      return (
        <Badge className="bg-rose-500 hover:bg-rose-600 text-white border-none font-bold uppercase tracking-wider text-xs">
          DICABUT
        </Badge>
      );
  }
}

// ─── Certification Section ────────────────────────────────────────────────────

function VendorCertificationSection({ vendorId }: { vendorId: string }) {
  const { data: certData, isLoading: certLoading } =
    useVendorCertificationStatus(vendorId);

  // Assign Program dialog state
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState('');

  // Revoke dialog state
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');

  // Renew dialog state
  const [renewOpen, setRenewOpen] = useState(false);

  const { data: programsData, isLoading: programsLoading } =
    useCertificationPrograms(1, 100);

  const assignMutation = useAssignVendorToProgram();
  const revokeMutation = useRevokeCertification();
  const renewMutation = useRenewCertification();

  // Normalise response shape based on TransformInterceptor and pagination
  const certStatus: VendorCertStatusData | null =
    certData?.data ?? certData ?? null;
  const certification = certStatus?.certification;
  const programsRaw =
    programsData?.data?.programs ??
    programsData?.programs ??
    (Array.isArray(programsData?.data) ? programsData.data : []);
  const programs: { id: string; name: string }[] = Array.isArray(programsRaw)
    ? programsRaw
    : [];

  function handleAssign() {
    if (!selectedProgramId) return;
    assignMutation.mutate(
      { vendorId, data: { certificationProgramId: selectedProgramId } },
      {
        onSuccess: () => {
          setAssignOpen(false);
          setSelectedProgramId('');
        },
      },
    );
  }

  function handleRevoke() {
    if (!revokeReason.trim()) return;
    revokeMutation.mutate(
      { vendorId, data: { reason: revokeReason.trim() } },
      {
        onSuccess: () => {
          setRevokeOpen(false);
          setRevokeReason('');
        },
      },
    );
  }

  function handleRenew() {
    renewMutation.mutate(vendorId, {
      onSuccess: () => setRenewOpen(false),
    });
  }

  return (
    <Card className="p-8 border-none shadow-xl flex flex-col gap-6">
      {/* Section header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Award className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">
              Sertifikasi Vendor
            </h2>
          </div>
          {/* Assign Program button — always visible */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 font-semibold"
            onClick={() => setAssignOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            Assign Program
          </Button>
        </div>
        <Separator />
      </div>

      {/* Loading state */}
      {certLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* No certification */}
      {!certLoading && !certification && (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
            <Award className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              Belum Ada Sertifikasi Aktif
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              {certStatus?.program
                ? `Vendor terdaftar di program "${certStatus.program.name}" namun belum memiliki sertifikat.`
                : 'Vendor belum di-assign ke program sertifikasi.'}
            </p>
          </div>
        </div>
      )}

      {/* Active certification details */}
      {!certLoading && certification && (
        <div className="flex flex-col gap-6">
          {/* Status badge + cert number */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-muted/20 border border-muted">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Nomor Sertifikat
              </p>
              <p className="font-mono text-lg font-black tracking-widest text-foreground">
                {certification.certNumber}
              </p>
              {certification.program?.name && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {certification.program.name}
                </p>
              )}
            </div>
            {certStatusBadge(certification.status)}
          </div>

          {/* Date grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/20 border border-muted space-y-1">
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Tanggal Terbit
              </p>
              <p className="text-sm font-semibold">
                {formatDate(certification.issuedAt)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-muted/20 border border-muted space-y-1">
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Tanggal Kedaluwarsa
              </p>
              <p className="text-sm font-semibold">
                {formatDate(certification.expiresAt) || 'Tidak terbatas'}
              </p>
            </div>
          </div>

          {/* Revoke reason (if revoked) */}
          {certification.status === 'REVOKED' && certification.revokeReason && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1">
              <p className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 tracking-wider">
                Alasan Pencabutan
              </p>
              <p className="text-sm text-rose-700 dark:text-rose-400">
                {certification.revokeReason}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            {(certification.status === 'ACTIVE' ||
              certification.status === 'EXPIRED') && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 font-semibold border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950"
                onClick={() => setRevokeOpen(true)}
              >
                <ShieldOff className="h-4 w-4" />
                Cabut Sertifikasi
              </Button>
            )}
            {(certification.status === 'EXPIRED' ||
              certification.status === 'REVOKED') && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 font-semibold border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
                onClick={() => setRenewOpen(true)}
              >
                <RefreshCw className="h-4 w-4" />
                Perbarui Sertifikasi
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Assign Program Dialog ─────────────────────────────────────────── */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Assign Program Sertifikasi
            </DialogTitle>
            <DialogDescription>
              Pilih program sertifikasi yang akan di-assign ke vendor ini.
              Program yang sudah ada akan digantikan.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="program-select">Program Sertifikasi</Label>
              <Select
                value={selectedProgramId}
                onValueChange={setSelectedProgramId}
                disabled={programsLoading}
              >
                <SelectTrigger id="program-select" className="w-full">
                  <SelectValue
                    placeholder={
                      programsLoading ? 'Memuat program...' : 'Pilih program...'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(programs) &&
                    programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignOpen(false);
                setSelectedProgramId('');
              }}
              disabled={assignMutation.isPending}
            >
              Batal
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedProgramId || assignMutation.isPending}
            >
              {assignMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Menyimpan...
                </>
              ) : (
                'Assign Program'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Revoke Certification Dialog ───────────────────────────────────── */}
      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <ShieldOff className="h-5 w-5" />
              Cabut Sertifikasi
            </DialogTitle>
            <DialogDescription>
              Tindakan ini akan mencabut sertifikasi aktif vendor. Vendor tidak
              akan dapat mengakses JSA dan PTW setelah sertifikasi dicabut.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="revoke-reason">
                Alasan Pencabutan <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="revoke-reason"
                placeholder="Masukkan alasan pencabutan sertifikasi..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRevokeOpen(false);
                setRevokeReason('');
              }}
              disabled={revokeMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={!revokeReason.trim() || revokeMutation.isPending}
            >
              {revokeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Memproses...
                </>
              ) : (
                'Cabut Sertifikasi'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Renew Certification Dialog ────────────────────────────────────── */}
      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <RefreshCw className="h-5 w-5" />
              Perbarui Sertifikasi
            </DialogTitle>
            <DialogDescription>
              Tindakan ini akan memperbarui masa berlaku sertifikasi vendor.
              Sertifikasi baru akan diterbitkan berdasarkan program yang
              terdaftar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Sertifikasi baru akan diterbitkan dan masa berlaku akan
              diperpanjang sesuai program.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenewOpen(false)}
              disabled={renewMutation.isPending}
            >
              Batal
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleRenew}
              disabled={renewMutation.isPending}
            >
              {renewMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Memproses...
                </>
              ) : (
                'Perbarui Sertifikasi'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VendorDetailsPage() {
  const params = useParams();
  const vendorId = params.id as string;
  const router = useRouter();

  const {
    data: vendorData,
    isLoading,
    isError,
  } = useVendorDetailQuery(vendorId);

  const vendor = vendorData?.data || vendorData;

  if (isLoading) {
    return (
      <div className="flex h-150 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !vendor) {
    return (
      <div className="flex flex-col h-150 w-full items-center justify-center gap-4">
        <XCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium text-muted-foreground">
          Vendor tidak ditemukan atau terjadi kesalahan saat memuat data.
        </p>
        <Button onClick={() => router.push('/admin/vendor-registry')}>
          Kembali ke Daftar
        </Button>
      </div>
    );
  }

  const registrationDate = new Date(vendor.createdAt).toLocaleDateString(
    'id-ID',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  );

  return (
    <div className="flex flex-col gap-8 p-4 md:p-6 lg:p-8 w-full max-w-6xl mx-auto">
      {/* HEADER ACTIONS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button
          variant="ghost"
          className="group hover:bg-primary/10 -ml-2 transition-all duration-300"
          onClick={() => router.push('/admin/vendor-registry')}
        >
          <ArrowLeft className="mr-2 h-4 s-4 group-hover:-translate-x-1 transition-transform" />
          Daftar Vendor
        </Button>
        <Button
          className="gap-2 shadow-lg shadow-primary/20 font-bold px-6"
          onClick={() => router.push(`/admin/vendor-registry/${vendorId}/edit`)}
        >
          <Pencil className="h-4 w-4" />
          Edit Vendor
        </Button>
      </div>

      {/* HERO SECTION */}
      <Card className="relative overflow-hidden border-none shadow-2xl bg-linear-to-br from-card to-muted/20">
        <div className="absolute top-0 right-0 p-6">
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none px-4 py-1 text-xs font-bold tracking-widest uppercase">
            ACTIVE
          </Badge>
        </div>
        <div className="p-8 md:p-12 flex flex-col md:flex-row items-center md:items-start gap-10">
          <Avatar className="h-40 w-40 border-8 border-background shadow-2xl rounded-[2.5rem] bg-background shrink-0">
            <AvatarImage
              src={vendor.vendorLogo || ''}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary/5 text-primary">
              <Building2 className="h-16 w-16 opacity-10" />
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col gap-4 text-center md:text-left flex-1">
            <div className="space-y-1">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground">
                {vendor.vendorName}
              </h1>
              <p className="text-lg text-muted-foreground font-medium flex items-center justify-center md:justify-start gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Terdaftar sejak {registrationDate}
              </p>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
              <Badge
                variant="secondary"
                className="px-3 py-1 gap-1.5 font-medium"
              >
                <Info className="h-3 w-3" />
                UID: {vendorId.toUpperCase()}
              </Badge>
              {vendor.vendorWebsite && (
                <a
                  href={vendor.vendorWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Badge
                    variant="outline"
                    className="px-3 py-1 gap-1.5 font-medium hover:bg-primary hover:text-white transition-colors cursor-pointer"
                  >
                    <Globe className="h-3 w-3" />
                    Visit Website
                    <ExternalLink className="h-3 w-3" />
                  </Badge>
                </a>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* CORE INFO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Essential Contact */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          <Card className="p-6 border-none shadow-xl flex flex-col gap-6">
            <h3 className="font-bold text-sm uppercase tracking-[0.2em] text-primary/70">
              Contact Channels
            </h3>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                    Official Email
                  </p>
                  <p className="font-semibold text-foreground break-all">
                    {vendor.vendorEmail}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                    Phone Number
                  </p>
                  <p className="font-semibold text-foreground">
                    {vendor.vendorPhone}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-none shadow-xl flex flex-col gap-6">
            <h3 className="font-bold text-sm uppercase tracking-[0.2em] text-primary/70">
              Location details
            </h3>
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                  Headquarters Address
                </p>
                <p className="text-sm font-medium leading-relaxed text-muted-foreground italic">
                  {vendor.vendorAddress}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Profile, Description & Certification */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <Card className="p-8 border-none shadow-xl flex flex-col gap-8 flex-1">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold tracking-tight">
                  Profil Perusahaan
                </h2>
              </div>
              <Separator />
            </div>

            <div className="space-y-6">
              <div className="prose prose-sm max-w-none text-muted-foreground leading-loose">
                {vendor.vendorDescription ? (
                  <p className="whitespace-pre-wrap">
                    {vendor.vendorDescription}
                  </p>
                ) : (
                  <div className="flex flex-col items-center justify-center p-10 bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
                    <Info className="h-10 w-10 text-muted/40 mb-3" />
                    <p className="italic text-muted-foreground/60">
                      Belum ada deskripsi profil untuk vendor ini.
                    </p>
                    <Button
                      variant="link"
                      className="mt-2 text-primary"
                      onClick={() =>
                        router.push(`/admin/vendor-registry/${vendorId}/edit`)
                      }
                    >
                      Tambahkan Deskripsi
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto pt-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-muted/30 border border-muted flex flex-col gap-1 items-center justify-center">
                  <span className="text-2xl font-black text-foreground">0</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Workers
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 border border-muted flex flex-col gap-1 items-center justify-center">
                  <span className="text-2xl font-black text-foreground">0</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Projects
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 border border-muted flex flex-col gap-1 items-center justify-center">
                  <span className="text-2xl font-black text-foreground">
                    --
                  </span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Rating
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 border border-muted flex flex-col gap-1 items-center justify-center">
                  <span className="text-2xl font-black text-foreground">
                    --
                  </span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Certifications
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Vendor Certification Section */}
          <VendorCertificationSection vendorId={vendorId} />
        </div>
      </div>
    </div>
  );
}
