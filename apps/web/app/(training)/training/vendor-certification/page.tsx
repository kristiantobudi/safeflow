'use client';

import {
  useMyProgram,
  useCheckAndIssueCertification,
} from '@/store/vendor-certification/query';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import { Separator } from '@repo/ui/components/ui/separator';
import {
  Award,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModuleProgress {
  moduleId: string;
  title: string;
  isPassed: boolean;
  isRequired: boolean;
  score?: number | null;
}

interface VendorCertificationStatusData {
  vendorId?: string;
  certified: boolean;
  certification?: {
    id: string;
    certNumber: string;
    status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
    issuedAt: string;
    expiresAt?: string | null;
    revokedAt?: string | null;
    revokeReason?: string | null;
    program?: {
      id: string;
      name: string;
      description?: string | null;
    };
  } | null;
  program?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  modules?: ModuleProgress[];
  completedCount?: number;
  totalRequired?: number;
  allPassed?: boolean;
}

// ─── QR Code Component (text-based fallback since qrcode is not installed) ───

// Deterministic pattern derived from certNumber characters to avoid hydration mismatch
function certPattern(certNumber: string, index: number): boolean {
  const charCode = certNumber.charCodeAt(index % certNumber.length);
  return (charCode + index) % 3 !== 0;
}

function CertQRCode({ certNumber }: { certNumber: string }) {
  // Since qrcode/qrcode.react is not in package.json, display a styled cert number block
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-32 w-32 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center p-3 gap-1">
        <div className="grid grid-cols-5 gap-0.5 opacity-40">
          {Array.from({ length: 25 }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-sm ${certPattern(certNumber, i) ? 'bg-primary' : 'bg-transparent'}`}
            />
          ))}
        </div>
        <p className="text-[9px] font-mono font-bold text-primary/70 text-center leading-tight mt-1">
          {certNumber}
        </p>
      </div>
      <p className="text-[10px] text-muted-foreground italic">Barcode Sertifikat</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VendorCertificationPage() {
  const {
    data: statusData,
    isLoading,
    isError,
  } = useMyProgram();

  const checkAndIssueMutation = useCheckAndIssueCertification();

  // Normalise response shape — API may wrap in data or return directly
  const status: VendorCertificationStatusData | null =
    statusData?.data ?? statusData ?? null;

  const vendorId: string = status?.vendorId ?? '';
  const certification = status?.certification;
  const certStatus = certification?.status;
  const modules: ModuleProgress[] = status?.modules ?? [];
  const allPassed = status?.allPassed ?? (modules.length > 0 && modules.every((m) => !m.isRequired || m.isPassed));
  const completedCount = status?.completedCount ?? modules.filter((m) => m.isPassed).length;
  const totalRequired = status?.totalRequired ?? modules.filter((m) => m.isRequired).length;

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4 p-8">
        <ShieldAlert className="h-14 w-14 text-amber-500" />
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold">Akun Tidak Terhubung ke Vendor</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Akun Anda belum terhubung ke data vendor atau belum memiliki program sertifikasi.
            Hubungi administrator untuk menghubungkan akun Anda.
          </p>
        </div>
      </div>
    );
  }

  // ─── ACTIVE Certification ──────────────────────────────────────────────────

  if (certStatus === 'ACTIVE') {
    const issuedDate = certification?.issuedAt
      ? new Date(certification.issuedAt).toLocaleDateString('id-ID', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '-';
    const expiryDate = certification?.expiresAt
      ? new Date(certification.expiresAt).toLocaleDateString('id-ID', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Tidak terbatas';

    return (
      <div className="flex flex-col gap-6 py-6 max-w-2xl mx-auto">
        {/* Page header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Sertifikasi Saya</h1>
          <p className="text-muted-foreground text-sm">
            Status sertifikasi vendor Anda untuk mengakses JSA dan PTW.
          </p>
        </div>

        {/* Certificate card */}
        <Card className="relative overflow-hidden border-none shadow-2xl bg-linear-to-br from-emerald-500/10 via-card to-primary/5">
          <div className="absolute top-4 right-4">
            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none px-3 py-1 gap-1.5 font-bold tracking-wider uppercase text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              AKTIF
            </Badge>
          </div>

          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-xl font-black">Sertifikat Vendor</CardTitle>
                {certification?.program?.name && (
                  <p className="text-sm text-muted-foreground">{certification.program.name}</p>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-6">
            <Separator />

            {/* Cert details + QR */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="flex flex-col gap-3 flex-1">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Nomor Sertifikat
                  </p>
                  <p className="font-mono text-lg font-bold text-foreground tracking-widest">
                    {certification?.certNumber}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Diterbitkan
                    </p>
                    <p className="text-sm font-medium">{issuedDate}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Berlaku Hingga
                    </p>
                    <p className="text-sm font-medium">{expiryDate}</p>
                  </div>
                </div>
              </div>

              {/* QR Code / Barcode */}
              {certification?.certNumber && (
                <CertQRCode certNumber={certification.certNumber} />
              )}
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                Sertifikasi Anda aktif. Anda dapat mengakses menu JSA dan PTW.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Module completion summary */}
        {modules.length > 0 && (
          <ModuleList modules={modules} completedCount={completedCount} totalRequired={totalRequired} />
        )}
      </div>
    );
  }

  // ─── EXPIRED Certification ─────────────────────────────────────────────────

  if (certStatus === 'EXPIRED') {
    return (
      <div className="flex flex-col gap-6 py-6 max-w-2xl mx-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Sertifikasi Saya</h1>
          <p className="text-muted-foreground text-sm">
            Status sertifikasi vendor Anda untuk mengakses JSA dan PTW.
          </p>
        </div>

        <Card className="border-none shadow-xl bg-linear-to-br from-amber-500/10 via-card to-transparent">
          <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
            <div className="h-20 w-20 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-10 w-10 text-amber-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Sertifikasi Kedaluwarsa</h2>
              <p className="text-muted-foreground max-w-sm text-sm">
                Sertifikasi vendor Anda telah melewati masa berlaku. Akses ke JSA dan PTW
                dinonaktifkan sementara.
              </p>
              {certification?.expiresAt && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Kedaluwarsa pada:{' '}
                  {new Date(certification.expiresAt).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 max-w-sm w-full">
              <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400 text-left">
                Hubungi administrator untuk memperbarui sertifikasi Anda.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── REVOKED Certification ─────────────────────────────────────────────────

  if (certStatus === 'REVOKED') {
    return (
      <div className="flex flex-col gap-6 py-6 max-w-2xl mx-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Sertifikasi Saya</h1>
          <p className="text-muted-foreground text-sm">
            Status sertifikasi vendor Anda untuk mengakses JSA dan PTW.
          </p>
        </div>

        <Card className="border-none shadow-xl bg-linear-to-br from-rose-500/10 via-card to-transparent">
          <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
            <div className="h-20 w-20 rounded-full bg-rose-500/10 flex items-center justify-center">
              <ShieldOff className="h-10 w-10 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Sertifikasi Dicabut</h2>
              <p className="text-muted-foreground max-w-sm text-sm">
                Sertifikasi vendor Anda telah dicabut oleh administrator. Akses ke JSA dan PTW
                tidak tersedia.
              </p>
              {certification?.revokeReason && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 max-w-sm w-full text-left">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                    Alasan Pencabutan
                  </p>
                  <p className="text-sm text-rose-700 dark:text-rose-400">
                    {certification.revokeReason}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 max-w-sm w-full">
              <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0" />
              <p className="text-sm text-rose-700 dark:text-rose-400 text-left">
                Hubungi administrator untuk informasi lebih lanjut mengenai pencabutan sertifikasi.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── No Certification — show module progress ───────────────────────────────

  const noProgramAssigned = !status?.program && modules.length === 0;

  return (
    <div className="flex flex-col gap-6 py-6 max-w-2xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Sertifikasi Saya</h1>
        <p className="text-muted-foreground text-sm">
          Selesaikan semua modul wajib untuk mendapatkan sertifikasi vendor.
        </p>
      </div>

      {/* No program assigned */}
      {noProgramAssigned ? (
        <Card className="border-none shadow-xl">
          <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
            <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center">
              <Award className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Belum Ada Program Sertifikasi</h2>
              <p className="text-muted-foreground max-w-sm text-sm">
                Akun vendor Anda belum di-assign ke program sertifikasi. Hubungi administrator
                untuk mendapatkan akses program.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Progress summary */}
          <Card className="border-none shadow-xl bg-linear-to-br from-primary/5 via-card to-transparent">
            <CardContent className="flex flex-col gap-4 pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-lg font-bold">
                    {status?.program?.name ?? 'Program Sertifikasi'}
                  </h2>
                  {status?.program?.description && (
                    <p className="text-xs text-muted-foreground">{status.program.description}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">Progress Modul</p>
                  <p className="text-sm font-bold text-primary">
                    {completedCount} / {totalRequired} modul selesai
                  </p>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{
                      width: totalRequired > 0 ? `${(completedCount / totalRequired) * 100}%` : '0%',
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {totalRequired > 0
                    ? `${Math.round((completedCount / totalRequired) * 100)}% selesai`
                    : 'Belum ada modul wajib'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Module list */}
          {modules.length > 0 && (
            <ModuleList modules={modules} completedCount={completedCount} totalRequired={totalRequired} />
          )}

          {/* Submit certification button */}
          {allPassed && !certification && (
            <Card className="border-none shadow-xl bg-linear-to-br from-emerald-500/10 via-card to-transparent">
              <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <ShieldCheck className="h-8 w-8 text-emerald-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">Semua Modul Telah Diselesaikan!</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Anda telah lulus semua modul wajib. Ajukan sertifikasi untuk mendapatkan akses JSA dan PTW.
                  </p>
                </div>
                <Button
                  size="lg"
                  className="gap-2 shadow-lg shadow-primary/20 font-bold px-8"
                  onClick={() => checkAndIssueMutation.mutate(vendorId)}
                  disabled={checkAndIssueMutation.isPending}
                >
                  {checkAndIssueMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Award className="h-4 w-4" />
                      Ajukan Sertifikasi
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Not all passed yet */}
          {!allPassed && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Clock className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Selesaikan semua modul wajib untuk dapat mengajukan sertifikasi.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Module List Component ────────────────────────────────────────────────────

function ModuleList({
  modules,
  completedCount,
  totalRequired,
}: {
  modules: ModuleProgress[];
  completedCount: number;
  totalRequired: number;
}) {
  return (
    <Card className="border-none shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            Daftar Modul
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {completedCount}/{totalRequired} lulus
          </Badge>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4 space-y-2">
        {modules.map((mod, index) => (
          <div
            key={mod.moduleId}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
              mod.isPassed
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-muted/30 border-muted/50'
            }`}
          >
            {/* Index */}
            <div
              className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                mod.isPassed
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {index + 1}
            </div>

            {/* Title */}
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-medium text-sm truncate">{mod.title}</span>
              <div className="flex items-center gap-2 mt-0.5">
                {mod.isRequired && (
                  <span className="text-[10px] text-primary font-semibold uppercase tracking-wider">
                    Wajib
                  </span>
                )}
                {mod.score != null && (
                  <span className="text-[10px] text-muted-foreground">
                    Nilai: {mod.score}
                  </span>
                )}
              </div>
            </div>

            {/* Status icon */}
            {mod.isPassed ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : (
              <Clock className="h-5 w-5 text-muted-foreground/50 shrink-0" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
