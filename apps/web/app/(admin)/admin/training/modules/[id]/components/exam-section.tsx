// ─── Exam Section Component ─────────────────────────────────────────────────

import { ModuleDetail } from '@/lib/types/training-types';
import { Badge } from '@repo/ui/components/ui/badge';
import { Card } from '@repo/ui/components/ui/card';
import { Separator } from '@repo/ui/components/ui/separator';
import { ArrowRight, ExternalLink, HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CreateExamFormInline } from './exam-form-inline';
import { Button } from '@repo/ui/components/ui/button';
import QuestionListSection from './question-section';

export default function ExamSection({
  exam,
  moduleId,
  searchQuery,
  setSearchQuery,
}: {
  exam: ModuleDetail['exam'];
  moduleId: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) {
  // Safety check: if exam is an empty array or null, treat as no exam
  const hasNoExam = !exam || (Array.isArray(exam) && exam.length === 0);
  const router = useRouter();

  if (hasNoExam) {
    return (
      <Card className="p-8 border-none shadow-xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">Ujian & Soal</h2>
          </div>
          <Badge variant="outline" className="font-medium">
            Belum Ada Ujian
          </Badge>
        </div>
        <Separator />
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center justify-center p-8 bg-primary/5 rounded-xl border-2 border-dashed border-primary/20">
            <HelpCircle className="h-12 w-12 text-primary/40 mb-4" />
            <h3 className="text-lg font-bold mb-2">Siapkan Ujian</h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">
              Modul ini belum memiliki ujian. Buat ujian sekarang untuk mulai
              menambahkan pertanyaan.
            </p>
            <div className="bg-background p-6 rounded-xl shadow-sm border border-muted w-full max-w-md">
              <CreateExamFormInline moduleId={moduleId} />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Ensure we are working with an object if it came as an array
  const activeExam = Array.isArray(exam) ? exam[0] : exam;

  return (
    <Card className="p-8 border-none shadow-xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HelpCircle className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Ujian & Soal</h2>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none font-medium">
            Ujian Aktif
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary hover:bg-primary/10 font-bold gap-2"
            onClick={() =>
              router.push(`/admin/training/exams/${activeExam.id}`)
            }
          >
            Lihat Detail Ujian
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-muted/20 border border-muted space-y-1">
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
            Durasi
          </p>
          <p className="text-sm font-semibold">{activeExam.duration} menit</p>
        </div>
        <div className="p-4 rounded-xl bg-muted/20 border border-muted space-y-1">
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
            Max Percobaan
          </p>
          <p className="text-sm font-semibold">
            {activeExam.maxAttempts ?? 'Tidak terbatas'}
          </p>
        </div>
      </div>
      <Separator />
      <QuestionListSection
        questions={activeExam.question || []}
        examId={activeExam.id}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <div className="pt-2">
        <Button
          variant="outline"
          className="w-full border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 font-bold h-12 rounded-xl"
          onClick={() => router.push(`/admin/training/exams/${activeExam.id}`)}
        >
          Kelola Soal & Gambar di Halaman Khusus
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </Card>
  );
}
