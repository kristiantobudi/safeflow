import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form';
import { Loader2, Plus } from 'lucide-react';
import { useCreateExam } from '@/store/training/query';
import * as yup from 'yup';

// ─── Form Schemas ───────────────────────────────────────────────────────────

const createExamSchema = yup.object({
  duration: yup
    .number()
    .typeError('Durasi harus berupa angka')
    .min(1, 'Durasi minimal 1 menit')
    .max(180, 'Durasi maksimal 180 menit')
    .required('Durasi wajib diisi'),
  maxAttempts: yup
    .number()
    .typeError('Max percobaan harus berupa angka')
    .min(1, 'Minimal 1 percobaan')
    .optional(),
});

type CreateExamFormValues = yup.InferType<typeof createExamSchema>;

export function CreateExamFormInline({ moduleId }: { moduleId: string }) {
  const createExam = useCreateExam();

  const form = useForm<CreateExamFormValues>({
    resolver: yupResolver(createExamSchema),
    defaultValues: {
      duration: 30,
      maxAttempts: undefined as number | undefined,
    },
  });

  const onSubmit = async (data: CreateExamFormValues) => {
    try {
      await createExam.mutateAsync({
        moduleId,
        duration: data.duration,
        maxAttempts: data.maxAttempts,
      });
      form.reset();
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Durasi (menit)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value ? parseInt(value) : undefined);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxAttempts"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Percobaan</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Bebas"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value ? parseInt(value) : undefined);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button
          type="submit"
          className="w-full font-bold"
          disabled={createExam.isPending}
        >
          {createExam.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Buat Ujian & Mulai
        </Button>
      </form>
    </Form>
  );
}
