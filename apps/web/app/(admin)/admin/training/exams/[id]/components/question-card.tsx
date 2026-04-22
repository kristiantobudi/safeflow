import {
  useDeleteQuestion,
  useUploadQuestionImage,
} from '@/store/training/query';
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
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import { Card, CardContent, CardHeader } from '@repo/ui/components/ui/card';
import { CheckCircle2, Edit, Loader2, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import EditQuestionDialog from './edit-question-dialog';

export default function QuestionCard({
  question,
  index,
}: {
  question: any;
  index: number;
}) {
  const deleteMutation = useDeleteQuestion();
  const uploadImageMutation = useUploadQuestionImage();
  const [isEditing, setIsEditing] = useState(false);

  const handleDelete = () => {
    if (confirm('Apakah Anda yakin ingin menghapus soal ini?')) {
      deleteMutation.mutate(question.id);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImageMutation.mutate({ questionId: question.id, file });
    }
  };

  return (
    <Card className="group relative overflow-hidden hover:shadow-2xl transition-all duration-500 border-none bg-white dark:bg-slate-950 card-premium">
      {/* Accent bar */}
      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-primary/20 group-hover:bg-primary transition-colors duration-500" />

      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-1 pr-6">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold ring-4 ring-primary/5">
              {index}
            </span>
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground"
            >
              {question.imageUrl
                ? question.question
                  ? 'Mixed'
                  : 'Visual Only'
                : 'Text Only'}
            </Badge>
          </div>
          {question.question && (
            <h3 className="text-lg font-semibold pt-2 leading-relaxed">
              {question.question}
            </h3>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="relative">
            <input
              type="file"
              id={`upload-${question.id}`}
              className="hidden"
              onChange={handleImageUpload}
              accept="image/*"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
              title="Unggah Gambar"
              onClick={() =>
                document.getElementById(`upload-${question.id}`)?.click()
              }
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
            title="Edit Soal"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors"
                title="Hapus Soal"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus Pertanyaan?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tindakan ini tidak dapat dibatalkan. Soal ini akan dihapus
                  secara permanen dari ujian ini.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">
                  Batal
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90 rounded-xl"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Hapus'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <EditQuestionDialog
          question={question}
          open={isEditing}
          onOpenChange={setIsEditing}
        />
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Question Image */}
        {question.imageUrl && (
          <div className="relative group/image">
            <div className="aspect-video relative rounded-2xl overflow-hidden border border-muted-foreground/10 bg-slate-50 dark:bg-slate-900 shadow-inner">
              <img
                src={question.imageUrl}
                alt={`Soal ${index}`}
                className="w-full h-full object-contain transition-transform duration-700 hover:scale-105"
              />
            </div>
          </div>
        )}

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {question.options.map((option: string, idx: number) => {
            const isCorrect = option === question.correctAnswer;
            const letter = String.fromCharCode(65 + idx);

            return (
              <div
                key={idx}
                className={`flex items-center space-x-3 p-3.5 rounded-2xl border transition-all duration-300 ${
                  isCorrect
                    ? 'bg-green-500/10 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.1)] ring-1 ring-green-500/20'
                    : 'bg-card border-muted/30 hover:border-primary/30 hover:bg-primary/5'
                }`}
              >
                <div
                  className={`flex items-center justify-center h-8 w-8 rounded-xl text-xs font-bold transition-colors ${
                    isCorrect
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {letter}
                </div>
                <div className="flex-1">
                  <span
                    className={`text-sm tracking-tight ${isCorrect ? 'font-semibold text-green-700 dark:text-green-400' : 'text-foreground/80 font-medium'}`}
                  >
                    {option}
                  </span>
                </div>
                {isCorrect && (
                  <CheckCircle2 className="h-5 w-5 text-green-500 animate-in zoom-in duration-300" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
