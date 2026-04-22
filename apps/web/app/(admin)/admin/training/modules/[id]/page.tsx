'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Pencil,
  User,
  XCircle,
  Image as ImageIcon,
} from 'lucide-react';

import { Button } from '@repo/ui/components/ui/button';
import { Card } from '@repo/ui/components/ui/card';
import { Badge } from '@repo/ui/components/ui/badge';
import { useModule } from '@/store/training/query';
import { ModuleDetailSkeleton } from '@/components/skeleton/module-skeleton-detail';
import { ModuleDetail } from '@/lib/types/training-types';
import ExamSection from './components/exam-section';
import { FileUploadSection } from './components/file-upload-selection';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ─── Module Detail Content ───────────────────────────────────────────────────

function ModuleDetailContent({ module }: { module: ModuleDetail }) {
  const router = useRouter();
  const params = useParams();
  const moduleId = params.id as string;
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex flex-col gap-8 p-4 md:p-6 lg:p-8 w-full max-w-6xl mx-auto">
      {/* HEADER ACTIONS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button
          variant="ghost"
          className="group hover:bg-primary/10 -ml-2 transition-all duration-300"
          onClick={() => router.push('/admin/training/modules')}
        >
          <ArrowLeft className="mr-2 h-4 s-4 group-hover:-translate-x-1 transition-transform" />
          Daftar Modul
        </Button>
        <Button
          className="gap-2 shadow-lg shadow-primary/20 font-bold px-6"
          onClick={() =>
            router.push(`/admin/training/modules/${moduleId}/edit`)
          }
        >
          <Pencil className="h-4 w-4" />
          Edit Modul
        </Button>
      </div>

      {/* HERO SECTION */}
      <Card className="relative overflow-hidden border-none shadow-2xl bg-linear-to-br from-card to-muted/20">
        <div className="p-8 md:p-12 flex flex-col md:flex-row items-center md:items-start gap-10">
          <div className="h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="h-12 w-12 text-primary" />
          </div>

          <div className="flex flex-col gap-4 text-center md:text-left flex-1 w-full">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
                {module.title}
              </h1>
              <p className="text-lg text-muted-foreground font-medium flex items-center justify-center md:justify-start gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Dibuat {formatDate(module.createdAt)}
              </p>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
              <Badge
                variant="secondary"
                className="px-3 py-1 gap-1.5 font-medium"
              >
                <span className="h-2 w-2 rounded-full bg-primary" />
                ID: {module.id.slice(-6).toUpperCase()}
              </Badge>
              <Badge
                variant="outline"
                className="px-3 py-1 gap-1.5 font-medium"
              >
                <User className="h-3 w-3" />
                {module.creator?.firstName} {module.creator?.lastName}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Description & Creator (Sticky) */}
        <div className="lg:col-span-1 flex flex-col gap-8 sticky top-8">
          <Card className="p-6 border-none shadow-xl flex flex-col gap-6 bg-linear-to-b from-card to-muted/10">
            <h3 className="font-bold text-sm uppercase tracking-[0.2em] text-primary/70">
              Deskripsi
            </h3>
            <div className="space-y-4">
              {module.description ? (
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {module.description}
                </p>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 bg-muted/20 rounded-xl border-2 border-dashed border-muted">
                  <BookOpen className="h-8 w-8 text-muted/40 mb-2" />
                  <p className="text-sm italic text-muted-foreground/60 text-center">
                    Tidak ada deskripsi untuk modul ini.
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 border-none shadow-xl flex flex-col gap-6 bg-linear-to-b from-card to-muted/10">
            <h3 className="font-bold text-sm uppercase tracking-[0.2em] text-primary/70">
              Informasi Pembuat
            </h3>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  {module.creator?.firstName} {module.creator?.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {module.creator?.email}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Files, Exam & Questions */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <FileUploadSection moduleId={moduleId} files={module.files} />
          <ExamSection
            exam={module.exam}
            moduleId={moduleId}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Error State ─────────────────────────────────────────────────────────────

function ModuleErrorState() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-[60vh] w-full items-center justify-center gap-4 p-4">
      <XCircle className="h-12 w-12 text-destructive" />
      <p className="text-lg font-medium text-muted-foreground text-center">
        Modul tidak ditemukan atau terjadi kesalahan saat memuat data.
      </p>
      <Button onClick={() => router.push('/admin/training/modules')}>
        Kembali ke Daftar
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ModuleDetailPage() {
  const params = useParams();
  const moduleId = params.id as string;

  const { data: module, isLoading, isError } = useModule(moduleId);

  if (isLoading) {
    return <ModuleDetailSkeleton />;
  }

  if (isError || !module) {
    return <ModuleErrorState />;
  }

  return <ModuleDetailContent module={module} />;
}
