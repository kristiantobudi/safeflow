'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useCertificationProgramById,
  useAssignModulesToProgram,
  useUpdateCertificationProgram,
  useAvailableModules,
} from '@/store/vendor-certification/query';
import { Button } from '@repo/ui/components/ui/button';
import { Card } from '@repo/ui/components/ui/card';
import { Badge } from '@repo/ui/components/ui/badge';
import { Separator } from '@repo/ui/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@repo/ui/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/components/ui/tooltip';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@repo/ui/components/ui/command';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Building2,
  CalendarClock,
  Check,
  Info,
  Loader2,
  Pencil,
  Settings2,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';
import { CertificationProgramForm } from '@/components/certification/certification-program-form';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgramModule {
  id: string;
  moduleId: string;
  isRequired: boolean;
  order: number;
  module: { id: string; title: string; description?: string | null };
}

interface Vendor {
  id: string;
  vendorName: string;
  vendorStatus: string;
}

interface CertificationProgramDetail {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  validityDays?: number | null;
  modules: ProgramModule[];
  vendors: Vendor[];
  creator?: { id: string; displayName: string };
  updater?: { id: string; displayName: string };
  createdAt: string;
  updatedAt: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CertificationProgramDetailPage() {
  const params = useParams();
  const programId = params.id as string;
  const router = useRouter();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignModulesOpen, setAssignModulesOpen] = useState(false);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);

  const {
    data: programData,
    isLoading,
    isError,
  } = useCertificationProgramById(programId);

  const { data: modulesData, isLoading: modulesLoading } = useAvailableModules();
  const assignModulesMutation = useAssignModulesToProgram();
  const updateMutation = useUpdateCertificationProgram();

  const program: CertificationProgramDetail | null =
    programData?.data ?? programData ?? null;

  const availableModules: Array<{
    id: string;
    title: string;
    description?: string | null;
  }> = Array.isArray(modulesData) ? modulesData : (modulesData?.data ?? []);

  // Initialise selected modules when dialog opens
  const openAssignModules = () => {
    setSelectedModuleIds(program?.modules?.map((m) => m.moduleId) ?? []);
    setAssignModulesOpen(true);
  };

  const toggleModule = (moduleId: string) => {
    setSelectedModuleIds((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId],
    );
  };

  const handleSaveModules = () => {
    assignModulesMutation.mutate(
      { id: programId, moduleIds: selectedModuleIds },
      { onSuccess: () => setAssignModulesOpen(false) },
    );
  };

  const handleToggleActive = () => {
    if (!program) return;
    updateMutation.mutate({
      id: programId,
      data: { isActive: !program.isActive },
    });
  };

  // ─── Loading / Error states ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-[600px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !program) {
    return (
      <div className="flex flex-col h-[600px] w-full items-center justify-center gap-4">
        <XCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium text-muted-foreground">
          Program tidak ditemukan atau terjadi kesalahan saat memuat data.
        </p>
        <Button
          onClick={() => router.push('/admin/certification-programs')}
        >
          Kembali ke Daftar
        </Button>
      </div>
    );
  }

  const createdDate = new Date(program.createdAt).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-8 p-4 md:p-6 lg:p-8 w-full max-w-6xl mx-auto">
        {/* HEADER ACTIONS */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Button
            variant="outline"
            className="gap-2 shadow-sm hover:shadow-md transition-all shrink-0 h-10 px-6 font-semibold"
            onClick={() => router.push('/admin/certification-programs')}
          >
            <ArrowLeft className="h-4 w-4" />
            Daftar Program
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleToggleActive}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Settings2 className="h-4 w-4" />
              )}
              {program.isActive ? 'Nonaktifkan' : 'Aktifkan'}
            </Button>
            <Button
              className="gap-2 shadow-lg shadow-primary/20 font-bold px-6"
              onClick={() => setEditDialogOpen(true)}
            >
              <Pencil className="h-4 w-4" />
              Edit Program
            </Button>
          </div>
        </div>

        {/* HERO SECTION */}
        <Card className="relative overflow-hidden border-none shadow-2xl bg-gradient-to-br from-card to-muted/20">
          <div className="absolute top-0 right-0 p-6">
            <Badge
              className={cn(
                'px-4 py-1 text-xs font-bold tracking-widest uppercase border-none',
                program.isActive
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-rose-500 hover:bg-rose-600 text-white',
              )}
            >
              {program.isActive ? 'AKTIF' : 'NONAKTIF'}
            </Badge>
          </div>
          <div className="p-8 md:p-12 flex flex-col md:flex-row items-center md:items-start gap-10">
            <div className="h-28 w-28 rounded-[2rem] bg-primary/10 flex items-center justify-center shrink-0 shadow-xl">
              <Award className="h-14 w-14 text-primary opacity-80" />
            </div>
            <div className="flex flex-col gap-4 text-center md:text-left flex-1">
              <div className="space-y-1">
                <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground">
                  {program.name}
                </h1>
                {program.description && (
                  <p className="text-base text-muted-foreground font-medium">
                    {program.description}
                  </p>
                )}
                <p className="text-sm text-muted-foreground flex items-center justify-center md:justify-start gap-2 mt-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  Dibuat pada {createdDate}
                  {program.creator && (
                    <span>oleh {program.creator.displayName}</span>
                  )}
                </p>
              </div>

              {/* Quick stats */}
              <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
                <Badge variant="secondary" className="px-3 py-1 gap-1.5">
                  <BookOpen className="h-3 w-3" />
                  {program.modules.length} Modul
                </Badge>
                <Badge variant="secondary" className="px-3 py-1 gap-1.5">
                  <Users className="h-3 w-3" />
                  {program.vendors.length} Vendor
                </Badge>
                <Badge variant="secondary" className="px-3 py-1 gap-1.5">
                  <CalendarClock className="h-3 w-3" />
                  {program.validityDays
                    ? `${program.validityDays} hari`
                    : 'Tidak terbatas'}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* MODULES SECTION */}
          <Card className="p-6 border-none shadow-xl flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold tracking-tight">
                  Modul Wajib
                </h2>
                <Badge variant="secondary" className="text-xs">
                  {program.modules.length}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={openAssignModules}
              >
                <Settings2 className="h-3.5 w-3.5" />
                Kelola Modul
              </Button>
            </div>
            <Separator />

            {program.modules.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
                <BookOpen className="h-10 w-10 text-muted/40 mb-3" />
                <p className="text-sm italic text-muted-foreground/60 text-center">
                  Belum ada modul yang ditambahkan ke program ini.
                </p>
                <Button
                  variant="link"
                  className="mt-2 text-primary text-sm"
                  onClick={openAssignModules}
                >
                  Tambahkan Modul
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {program.modules
                  .sort((a, b) => a.order - b.order)
                  .map((pm, index) => (
                    <div
                      key={pm.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-muted/50"
                    >
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                        {index + 1}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium text-sm truncate">
                          {pm.module.title}
                        </span>
                        {pm.isRequired && (
                          <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">
                            Wajib
                          </span>
                        )}
                      </div>
                      <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                    </div>
                  ))}
              </div>
            )}
          </Card>

          {/* VENDORS SECTION */}
          <Card className="p-6 border-none shadow-xl flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold tracking-tight">
                Vendor Terdaftar
              </h2>
              <Badge variant="secondary" className="text-xs">
                {program.vendors.length}
              </Badge>
            </div>
            <Separator />

            {program.vendors.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
                <Building2 className="h-10 w-10 text-muted/40 mb-3" />
                <p className="text-sm italic text-muted-foreground/60 text-center">
                  Belum ada vendor yang menggunakan program ini.
                </p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="link"
                      className="mt-2 text-primary text-sm gap-1"
                      onClick={() =>
                        router.push('/admin/vendor-registry')
                      }
                    >
                      <Info className="h-3.5 w-3.5" />
                      Assign dari Vendor Registry
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Buka halaman Vendor Registry dan assign program ini ke
                    vendor yang diinginkan.
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <div className="space-y-2">
                {program.vendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-muted/50 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() =>
                      router.push(`/admin/vendor-registry/${vendor.id}`)
                    }
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium text-sm truncate">
                        {vendor.vendorName}
                      </span>
                    </div>
                    <Badge
                      variant={
                        vendor.vendorStatus === 'ACTIVE'
                          ? 'status-active'
                          : 'status-inactive'
                      }
                      className="text-[10px] px-2 py-0.5 gap-1"
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${vendor.vendorStatus === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      />
                      {vendor.vendorStatus}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card/95 backdrop-blur-xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Edit Program Sertifikasi
            </DialogTitle>
            <DialogDescription>
              Perbarui informasi program sertifikasi.
            </DialogDescription>
          </DialogHeader>
          <CertificationProgramForm
            programId={programId}
            defaultValues={{
              name: program.name,
              description: program.description ?? undefined,
              validityDays: program.validityDays ?? undefined,
              moduleIds: program.modules.map((m) => m.moduleId),
            }}
            onSuccess={() => setEditDialogOpen(false)}
            onCancel={() => setEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ASSIGN MODULES DIALOG */}
      <Dialog open={assignModulesOpen} onOpenChange={setAssignModulesOpen}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Kelola Modul Program
            </DialogTitle>
            <DialogDescription>
              Pilih modul yang wajib diselesaikan vendor untuk mendapatkan
              sertifikasi ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {modulesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <Command className="rounded-lg border border-muted">
                <CommandInput placeholder="Cari modul..." />
                <CommandList className="max-h-64">
                  <CommandEmpty>Tidak ada modul ditemukan.</CommandEmpty>
                  <CommandGroup>
                    {availableModules.map((mod) => (
                      <CommandItem
                        key={mod.id}
                        value={mod.title}
                        onSelect={() => toggleModule(mod.id)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedModuleIds.includes(mod.id)
                              ? 'opacity-100 text-primary'
                              : 'opacity-0',
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {mod.title}
                          </span>
                          {mod.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {mod.description}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            )}

            <p className="text-xs text-muted-foreground">
              {selectedModuleIds.length} modul dipilih
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setAssignModulesOpen(false)}
              disabled={assignModulesMutation.isPending}
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveModules}
              disabled={
                assignModulesMutation.isPending ||
                selectedModuleIds.length === 0
              }
              className="shadow-lg shadow-primary/20"
            >
              {assignModulesMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyimpan...
                </span>
              ) : (
                'Simpan Modul'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
