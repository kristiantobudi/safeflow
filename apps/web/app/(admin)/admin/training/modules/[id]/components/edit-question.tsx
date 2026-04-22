import { QuestionDetail } from '@/lib/types/training-types';
import {
  useUpdateQuestion,
  useUploadQuestionImage,
} from '@/store/training/query';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select';
import { Textarea } from '@repo/ui/components/ui/textarea';
import { ImageIcon, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';

const editQuestionSchema = yup.object({
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

type EditQuestionFormValues = yup.InferType<typeof editQuestionSchema>;

export default function EditQuestionDialog({
  question,
  examId,
}: {
  question: QuestionDetail;
  examId: string;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<string[]>(question.options);
  const [imagePreview, setImagePreview] = useState<string | null>(
    question.imageUrl || null,
  );
  const updateQuestion = useUpdateQuestion(question.id);
  const uploadImage = useUploadQuestionImage();

  const form = useForm<EditQuestionFormValues>({
    resolver: yupResolver(editQuestionSchema),
    defaultValues: {
      question: question.question,
      options: question.options,
      correctAnswer: question.correctAnswer,
    },
  });

  const watchedOptions = form.watch('options') || options;
  const watchedCorrectAnswer = form.watch('correctAnswer');

  const addOption = () => {
    if (options.length < 5) {
      const newOptions = [...options, ''];
      setOptions(newOptions);
      form.setValue('options', newOptions);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
      form.setValue('options', newOptions);
      if (watchedCorrectAnswer === options[index]) {
        form.setValue('correctAnswer', '');
      }
    }
  };

  const onSubmit = async (data: EditQuestionFormValues) => {
    try {
      const filteredOptions = (data.options || []).filter((o): o is string => {
        if (!o) return false;
        return o.trim() !== '';
      });
      await updateQuestion.mutateAsync({
        question: data.question,
        options: filteredOptions,
        correctAnswer: data.correctAnswer,
      });
      setOpen(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Soal</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-primary/80">
                Media Gambar
              </Label>
              <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-2xl bg-slate-50 dark:bg-slate-900 transition-all hover:bg-slate-100 dark:hover:bg-slate-800">
                {imagePreview ? (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border shadow-sm group">
                    <img
                      src={imagePreview}
                      className="w-full h-full object-contain"
                      alt="Current"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <input
                        type="file"
                        id="module-edit-image"
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            await uploadImage.mutateAsync({
                              questionId: question.id,
                              file,
                            });
                            setImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8 text-xs font-bold"
                        onClick={() =>
                          document.getElementById('module-edit-image')?.click()
                        }
                      >
                        Ganti
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-8 text-xs font-bold"
                        onClick={async () => {
                          await updateQuestion.mutateAsync({ imageUrl: null });
                          setImagePreview(null);
                        }}
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <ImageIcon className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium">Beri Gambar Visual</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Mendukung format gambar (Maks 2MB)
                    </p>
                    <input
                      type="file"
                      id="module-edit-image-new"
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          await uploadImage.mutateAsync({
                            questionId: question.id,
                            file,
                          });
                          setImagePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() =>
                        document
                          .getElementById('module-edit-image-new')
                          ?.click()
                      }
                    >
                      Pilih Gambar
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pertanyaan</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Masukkan teks soal..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-3">
              <Label>Opsi Jawaban</Label>
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        watchedCorrectAnswer === option
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </div>
                    <Input
                      placeholder={`Opsi ${String.fromCharCode(65 + index)}`}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...options];
                        newOptions[index] = e.target.value;
                        setOptions(newOptions);
                        form.setValue('options', newOptions);
                      }}
                      onClick={() => {
                        const opt = options[index];
                        if (opt) form.setValue('correctAnswer', opt);
                      }}
                    />
                  </div>
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                      className="cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < 5 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={addOption}
                >
                  <Plus className="h-3 w-3" />
                  Tambah Opsi
                </Button>
              )}
              {form.formState.errors.options && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.options.message as string}
                </p>
              )}
            </div>
            <FormField
              control={form.control}
              name="correctAnswer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jawaban Benar</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jawaban yang benar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {watchedOptions.map((opt, i) => {
                        if (!opt || opt.trim() === '') return null;
                        return (
                          <SelectItem key={i} value={opt}>
                            {String.fromCharCode(65 + i)}. {opt}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="sm:justify-end mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={updateQuestion.isPending}>
                {updateQuestion.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
