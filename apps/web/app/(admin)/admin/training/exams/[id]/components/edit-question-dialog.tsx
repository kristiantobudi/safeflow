// ─── Dialog Components ──────────────────────────────────────────────────────

import {
  useUpdateQuestion,
  useUploadQuestionImage,
} from '@/store/training/query';
import { yupResolver } from '@hookform/resolvers/yup';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { QuestionFormValues, questionSchema } from './question-schema';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form';
import { Label } from '@repo/ui/components/ui/label';
import { Button } from '@repo/ui/components/ui/button';
import { ImageIcon, Loader2, Plus, Trash2 } from 'lucide-react';
import { Textarea } from '@repo/ui/components/ui/textarea';
import { Input } from '@repo/ui/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select';

export default function EditQuestionDialog({
  question,
  open,
  onOpenChange,
}: {
  question: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateQuestion = useUpdateQuestion(question.id);
  const uploadImage = useUploadQuestionImage();
  const [options, setOptions] = useState<string[]>(question.options);
  const [imagePreview, setImagePreview] = useState<string | null>(
    question.imageUrl || null,
  );

  const form = useForm<QuestionFormValues>({
    resolver: yupResolver(questionSchema),
    defaultValues: {
      question: question.question || '',
      options: question.options,
      correctAnswer: question.correctAnswer,
    },
  });

  const onSubmit = async (data: QuestionFormValues) => {
    try {
      await updateQuestion.mutateAsync({
        question: data.question,
        options: data.options,
        correctAnswer: data.correctAnswer,
      });
      onOpenChange(false);
    } catch (error) {}
  };

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
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Edit Soal</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Media Gambar</Label>
              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl bg-muted/10 transition-colors hover:bg-muted/20">
                {imagePreview ? (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg group">
                    <img
                      src={imagePreview}
                      className="w-full h-full object-contain"
                      alt="Current"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <input
                        type="file"
                        id="edit-image-input"
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
                        onClick={() =>
                          document.getElementById('edit-image-input')?.click()
                        }
                      >
                        Ganti
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
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
                  <div className="text-center py-4">
                    <ImageIcon className="h-10 w-10 text-muted/30 mx-auto mb-3" />
                    <input
                      type="file"
                      id="edit-image-input-new"
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
                      onClick={() =>
                        document.getElementById('edit-image-input-new')?.click()
                      }
                    >
                      Unggah Gambar
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
                  <FormLabel className="text-base font-semibold">
                    Pertanyaan / Deskripsi
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Masukkan teks soal..."
                      className="min-h-[100px] rounded-xl"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Opsi Jawaban</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full h-8"
                  onClick={addOption}
                  disabled={options.length >= 5}
                >
                  <Plus className="h-3 w-3 mr-1" /> Opsi
                </Button>
              </div>

              <div className="grid gap-3">
                {options.map((_, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name={`options.${index}`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="flex items-center gap-2">
                                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold">
                                  {String.fromCharCode(65 + index)}
                                </span>
                                <Input
                                  placeholder={`Jawaban ${String.fromCharCode(65 + index)}...`}
                                  className="h-10 rounded-xl"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        onClick={() => removeOption(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="correctAnswer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">
                    Jawaban Benar
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Pilih kunci jawaban" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {options.map((opt, i) => {
                        if (!opt || opt.trim() === '') return null;
                        return (
                          <SelectItem key={i} value={opt}>
                            {String.fromCharCode(65 + i)} {opt}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="rounded-xl px-8 font-bold"
                disabled={updateQuestion.isPending}
              >
                {updateQuestion.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Perbarui Soal
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
