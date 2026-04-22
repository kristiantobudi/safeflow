'use client';

import React, { Suspense, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  RotateCcw,
  Plus,
  Image as ImageIcon,
  LayoutDashboard,
  X,
  FileText,
  Search,
} from 'lucide-react';

import { Button } from '@repo/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@repo/ui/components/ui/card';
import { Badge } from '@repo/ui/components/ui/badge';
import { Separator } from '@repo/ui/components/ui/separator';
import { useExam } from '@/store/training/query';
import { Input } from '@repo/ui/components/ui/input';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import CreateQuestionDialog from './components/create-question-dialog';
import QuestionCard from './components/question-card';
import ExamDetailSkeleton from './components/exam-detail-skeleton';

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ExamDetailPage() {
  const { id: examId } = useParams() as { id: string };
  const router = useRouter();
  const { data: exam, isLoading, isError } = useExam(examId);
  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading) return <Suspense fallback={<ExamDetailSkeleton />} />;
  if (isError || !exam) return <ExamErrorState onBack={() => router.back()} />;

  const filteredQuestions = exam.question.filter((q: any) =>
    (q.question || '').toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8 animate-in fade-in duration-500">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          className="group hover:bg-primary/10 -ml-2 transition-all duration-300"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 s-4 group-hover:-translate-x-1 transition-transform" />
          Kembali
        </Button>
        <Badge
          variant="outline"
          className="px-3 py-1 bg-primary/5 text-primary border-primary/20"
        >
          Ujian Pelatihan
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Column: Exam Info (Sticky) */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-8">
          <Card className="border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <LayoutDashboard size={120} />
            </div>
            <CardHeader className="relative z-10">
              <CardTitle className="text-2xl font-bold tracking-tight">
                Detail Ujian
              </CardTitle>
              <CardDescription className="text-slate-300">
                Informasi konfigurasi ujian untuk modul {exam.module.title}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
              <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                <div className="bg-primary/20 p-2 rounded-lg">
                  <Clock className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Durasi</p>
                  <p className="font-semibold">{exam.duration} Menit</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                <div className="bg-primary/20 p-2 rounded-lg">
                  <RotateCcw className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">
                    Maksimal Percobaan
                  </p>
                  <p className="font-semibold">
                    {exam.maxAttempts || 'Tidak Terbatas'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                <div className="bg-primary/20 p-2 rounded-lg">
                  <FileText className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">
                    Total Soal
                  </p>
                  <p className="font-semibold">
                    {exam.question.length} Pertanyaan
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="relative z-10 border-t border-white/10 pt-4">
              <p className="text-[10px] text-slate-400">
                Dibuat pada{' '}
                {format(new Date(exam.createdAt), 'dd MMMM yyyy HH:mm', {
                  locale: id,
                })}
              </p>
            </CardFooter>
          </Card>

          <Card className="border-muted shadow-lg bg-card/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Tips Admin</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-4">
              <p>
                Anda dapat mengelola soal secara langsung di sini. Gunakan
                tombol edit untuk memperbarui teks, opsi, atau jawaban.
              </p>
              <p>
                Gunakan ikon gambar untuk mengunggah visual pendukung soal. Soal
                tanpa teks akan ditampilkan sebagai soal berbasis gambar penuh.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Question List */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              Daftar Soal
              <Badge variant="secondary" className="rounded-full">
                {exam.question.length}
              </Badge>
            </h2>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari pertanyaan..."
                  className="pl-9 h-10 bg-slate-50 border-muted-foreground/10 focus-visible:ring-primary/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <CreateQuestionDialog examId={examId} />
            </div>
          </div>

          <Separator className="bg-muted-foreground/10" />

          {exam.question.length === 0 ? (
            <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-900/20 rounded-3xl border-2 border-dashed border-muted">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Belum ada soal</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Silakan tambahkan soal pertama atau lakukan impor massal melalui
                modul.
              </p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed">
              <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Tidak ada soal yang cocok dengan pencarian &quot;{searchQuery}
                &quot;
              </p>
            </div>
          ) : (
            <div className="space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
              {filteredQuestions.map((q: any, index: number) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={
                    exam.question.findIndex((orig: any) => orig.id === q.id) + 1
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExamErrorState({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6 text-center px-4 animate-in slide-in-from-bottom duration-500">
      <div className="bg-destructive/10 p-6 rounded-full ring-8 ring-destructive/5">
        <X className="h-12 w-12 text-destructive" />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Oops! Terjadi Kesalahan
        </h2>
        <p className="text-muted-foreground max-w-md">
          Kami tidak dapat memuat detail ujian saat ini. Pastikan ID ujian benar
          atau coba lagi nanti.
        </p>
      </div>
      <Button
        onClick={onBack}
        size="lg"
        className="rounded-full px-8 shadow-lg shadow-primary/20"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Kembali Sekarang
      </Button>
    </div>
  );
}
