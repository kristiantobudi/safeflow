// ─── Question List Component ───────────────────────────────────────────────

import { QuestionDetail } from '@/lib/types/training-types';
import { useDeleteQuestion } from '@/store/training/query';
import { Check, HelpCircle, Search, Trash2 } from 'lucide-react';
import * as yup from 'yup';
import { CreateQuestionDialog } from './create-question-dialog';
import { Input } from '@repo/ui/components/ui/input';
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
import { Button } from '@repo/ui/components/ui/button';
import EditQuestionDialog from './edit-question';
import BulkUploadQuestionDialog from './bulk-upload-question';

const createQuestionSchema = yup.object({
  question: yup
    .string()
    .min(5, 'Pertanyaan minimal 5 karakter')
    .required('Pertanyaan wajib diisi'),
  options: yup
    .array()
    .of(yup.string().min(1, 'Opsi tidak boleh kosong'))
    .min(2, 'Minimal 2 opsi jawaban')
    .required(),
  correctAnswer: yup
    .string()
    .min(1, 'Pilih jawaban yang benar')
    .required('Jawaban benar wajib dipilih'),
});

export default function QuestionListSection({
  questions,
  examId,
  searchQuery,
  setSearchQuery,
}: {
  questions: QuestionDetail[];
  examId: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) {
  const deleteQuestion = useDeleteQuestion();

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-xl border-2 border-dashed border-muted">
        <HelpCircle className="h-10 w-10 text-muted/40 mb-3" />
        <p className="text-sm italic text-muted-foreground/60 mb-4">
          Belum ada soal untuk ujian ini.
        </p>
        <CreateQuestionDialog examId={examId} />
      </div>
    );
  }

  const filteredQuestions = questions.filter((q) =>
    (q.question || '').toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari pertanyaan..."
            className="pl-9 h-10 bg-slate-50 border-none ring-1 ring-muted"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <BulkUploadQuestionDialog examId={examId} />
          <CreateQuestionDialog examId={examId} />
        </div>
      </div>

      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground bg-muted/5 rounded-2xl border border-dashed">
            Belum ada soal yang sesuai dengan pencarian.
          </div>
        ) : (
          filteredQuestions.map((question, index) => (
            <div
              key={question.id}
              className="p-4 rounded-xl bg-muted/20 border border-muted"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex flex-col gap-2">
                      {question.imageUrl && (
                        <div className="w-24 h-24 rounded-lg overflow-hidden border shrink-0">
                          <img
                            src={question.imageUrl}
                            alt="Soal"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <p className="font-semibold text-sm leading-tight">
                        {question.question || 'Visual Question (Gambar)'}
                      </p>
                    </div>
                  </div>
                  <div className="pl-8 space-y-1">
                    {question.options.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        className={`flex items-center gap-2 text-sm ${
                          option === question.correctAnswer
                            ? 'text-emerald-600 font-medium'
                            : 'text-muted-foreground'
                        }`}
                      >
                        <span className="text-xs">
                          {String.fromCharCode(65 + optIndex)}.
                        </span>
                        <span>{option}</span>
                        {option === question.correctAnswer && (
                          <Check className="h-3 w-3" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <EditQuestionDialog question={question} examId={examId} />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Soal</AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus soal ini? Tindakan
                          ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteQuestion.mutate(question.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
