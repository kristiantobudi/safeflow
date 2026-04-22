import {
  useCreateQuestion,
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
import { ImageIcon, Loader2, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';

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

type CreateQuestionFormValues = yup.InferType<typeof createQuestionSchema>;

export function CreateQuestionDialog({ examId }: { examId: string }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<string[]>(['', '']);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const createQuestion = useCreateQuestion();
  const uploadImage = useUploadQuestionImage();

  const form = useForm<CreateQuestionFormValues>({
    resolver: yupResolver(createQuestionSchema),
    defaultValues: {
      question: '',
      options: ['', ''],
      correctAnswer: '',
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

  const onSubmit = async (data: CreateQuestionFormValues) => {
    try {
      const filteredOptions = (data.options || []).filter((o): o is string => {
        if (!o) return false;
        return o.trim() !== '';
      });
      const question = await createQuestion.mutateAsync({
        examId,
        question: data.question,
        options: filteredOptions,
        correctAnswer: data.correctAnswer,
      });

      if (selectedFile) {
        await uploadImage.mutateAsync({
          questionId: (question as any).id,
          file: selectedFile,
        });
      }

      setOpen(false);
      form.reset();
      setOptions(['', '']);
      setSelectedFile(null);
      setImagePreview(null);
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Soal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Soal Baru</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-primary/80">
                Unggah Gambar (Opsional)
              </Label>
              <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-2xl bg-slate-50 dark:bg-slate-900 transition-all hover:bg-slate-100 dark:hover:bg-slate-800">
                {imagePreview ? (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border shadow-sm group">
                    <img
                      src={imagePreview}
                      className="w-full h-full object-contain"
                      alt="Preview"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setSelectedFile(null);
                        setImagePreview(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
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
                      id="module-create-image"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          setImagePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-primary hover:bg-primary/5 font-semibold"
                      onClick={() =>
                        document.getElementById('module-create-image')?.click()
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
                      placeholder="Masukkan pertanyaan..."
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
              <Button type="submit" disabled={createQuestion.isPending}>
                {createQuestion.isPending ? (
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
