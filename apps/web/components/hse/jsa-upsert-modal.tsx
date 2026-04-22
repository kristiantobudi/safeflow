'use client';

import { useForm, FieldErrors } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Checkbox } from '@repo/ui/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form';
import { useCreateJsa, parseServerValidationErrors, CreateJsaData } from '@/store/jsa/query';
import * as yup from 'yup';

interface JsaUpsertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Yup schema for JSA form validation
const jsaSchema = yup.object({
  jenisKegiatan: yup
    .string()
    .required('Jenis kegiatan wajib diisi')
    .min(3, 'Jenis kegiatan minimal 3 karakter')
    .trim(),
  lokasiKegiatan: yup.string().optional().trim(),
  tanggalDibuat: yup.date().optional().nullable(),
  referensiHirarc: yup.string().optional().trim(),
  pelaksanaUtama: yup.string().optional().trim(),
  hseInCharge: yup.string().optional().trim(),
  apd: yup
    .object({
      safetyHelmet: yup.boolean().optional().default(false),
      safetyShoes: yup.boolean().optional().default(false),
      gloves: yup.boolean().optional().default(false),
      safetyGlasses: yup.boolean().optional().default(false),
      safetyVest: yup.boolean().optional().default(false),
      safetyBodyHarness: yup.boolean().optional().default(false),
      lainnya: yup.string().optional().trim(),
    })
    .optional(),
});

type JsaFormData = yup.InferType<typeof jsaSchema>;

export function JsaUpsertModal({
  open,
  onOpenChange,
}: JsaUpsertModalProps) {
  const createMutation = useCreateJsa();

  const form = useForm<JsaFormData>({
    resolver: yupResolver(jsaSchema),
    defaultValues: {
      jenisKegiatan: '',
      lokasiKegiatan: '',
      tanggalDibuat: undefined,
      referensiHirarc: '',
      pelaksanaUtama: '',
      hseInCharge: '',
      apd: {
        safetyHelmet: false,
        safetyShoes: false,
        gloves: false,
        safetyGlasses: false,
        safetyVest: false,
        safetyBodyHarness: false,
        lainnya: '',
      },
    },
  });

  const onSubmit = (data: JsaFormData) => {
    createMutation.mutate(data as unknown as CreateJsaData, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      },
      onError: (error) => {
        // Parse server validation errors and set them on the form
        const serverErrors = parseServerValidationErrors(error);
        Object.entries(serverErrors).forEach(([field, errorInfo]) => {
          if (errorInfo?.message) {
            form.setError(field as keyof JsaFormData, {
              type: 'server',
              message: errorInfo.message,
            });
          }
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card/95 backdrop-blur-xl border-none shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Buat JSA Baru
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="jenisKegiatan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jenis Kegiatan *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Contoh: Pekerjaan Pengelasan"
                        className="bg-muted/50 border-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lokasiKegiatan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lokasi Kegiatan</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Contoh: Workshop Area B"
                        className="bg-muted/50 border-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tanggalDibuat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Dibuat</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="bg-muted/50 border-none"
                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="referensiHirarc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referensi HIRAC</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ID HIRAC terkait (opsional)"
                        className="bg-muted/50 border-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pelaksanaUtama"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pelaksana Utama</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nama pelaksana utama"
                        className="bg-muted/50 border-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hseInCharge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HSE In Charge</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nama HSE in charge"
                        className="bg-muted/50 border-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base">Alat Pelindung Diri (APD)</Label>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="apd.safetyHelmet"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          Safety Helmet
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apd.safetyShoes"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          Safety Shoes
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apd.gloves"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          Safety Gloves
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apd.safetyGlasses"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          Safety Glasses
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apd.safetyVest"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          Safety Vest
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apd.safetyBodyHarness"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          Body Harness
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="apd.lainnya"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>APD Lainnya</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Jenis APD lainnya (opsional)"
                        className="bg-muted/50 border-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="shadow-lg shadow-primary/20"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Menyimpan...' : 'Buat JSA'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}