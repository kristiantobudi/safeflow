'use client';

import { useForm } from 'react-hook-form';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card';
import {
  useCreatePtw,
  parseServerValidationErrors,
  CreatePtwData,
} from '@/store/ptw/query';
import { useJsaList } from '@/store/jsa/query';
import { JsaListItem } from '@/lib/services/jsa';
import * as yup from 'yup';

interface PtwUpsertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Yup schema for PTW form validation
const ptwSchema = yup.object({
  judulPekerjaan: yup
    .string()
    .required('Judul pekerjaan wajib diisi')
    .min(3, 'Judul pekerjaan minimal 3 karakter')
    .max(255, 'Judul pekerjaan maksimal 255 karakter')
    .trim(),
  jsaProjectId: yup
    .string()
    .required('JSA terkait wajib dipilih')
    .uuid('ID JSA tidak valid'),
  lokasiPekerjaan: yup.string().optional().trim(),
  tanggalMulai: yup.date().optional().nullable(),
  tanggalSelesai: yup
    .date()
    .optional()
    .nullable()
    .when('tanggalMulai', {
      is: (tanggalMulai: Date | null | undefined) => tanggalMulai != null,
      then: (schema) =>
        schema.min(
          yup.ref('tanggalMulai'),
          'Tanggal selesai harus setelah tanggal mulai',
        ),
    }),
  keteranganTambahan: yup
    .string()
    .optional()
    .max(1000, 'Keterangan maksimal 1000 karakter')
    .trim(),
});

type PtwFormData = yup.InferType<typeof ptwSchema>;

export function PtwUpsertModal({ open, onOpenChange }: PtwUpsertModalProps) {
  const createMutation = useCreatePtw();
  const { data: jsaList, isLoading: isLoadingJsa } = useJsaList();

  // Filter only approved JSA records
  const approvedJsaList =
    jsaList?.filter((jsa: JsaListItem) => jsa.approvalStatus === 'APPROVED') ??
    [];

  // Find selected JSA details
  const selectedJsa = jsaList?.find(
    (jsa: JsaListItem) => jsa.id === form.getValues('jsaProjectId'),
  );

  const form = useForm<PtwFormData>({
    resolver: yupResolver(ptwSchema),
    defaultValues: {
      judulPekerjaan: '',
      jsaProjectId: '',
      lokasiPekerjaan: '',
      tanggalMulai: undefined,
      tanggalSelesai: undefined,
      keteranganTambahan: '',
    },
  });

  const onSubmit = (data: PtwFormData) => {
    createMutation.mutate(data as unknown as CreatePtwData, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      },
      onError: (error) => {
        // Parse server validation errors and set them on the form
        const serverErrors = parseServerValidationErrors(error);
        Object.entries(serverErrors).forEach(([field, errorInfo]) => {
          const err = errorInfo as any;
          if (err?.message) {
            form.setError(field as keyof PtwFormData, {
              type: 'server',
              message: err.message,
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
            Buat PTW Baru
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 py-4"
          >
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="judulPekerjaan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Judul Pekerjaan *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Contoh: Pekerjaan Pengelasan di Workshop"
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
                name="jsaProjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>JSA Terkait *</FormLabel>
                    <FormControl>
                      {isLoadingJsa ? (
                        <Input
                          placeholder="Memuat daftar JSA..."
                          className="bg-muted/50 border-none"
                          disabled
                        />
                      ) : approvedJsaList.length > 0 ? (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="bg-muted/50 border-none">
                            <SelectValue placeholder="Pilih JSA yang sudah approved" />
                          </SelectTrigger>
                          <SelectContent>
                            {approvedJsaList.map((jsa: JsaListItem) => (
                              <SelectItem key={jsa.id} value={jsa.id}>
                                {jsa.noJsa ?? 'N/A'} - {jsa.jenisKegiatan}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          placeholder="Tidak ada JSA approved tersedia"
                          className="bg-muted/50 border-none"
                          disabled
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Display selected JSA information */}
              {selectedJsa && selectedJsa.approvalStatus === 'APPROVED' && (
                <Card className="bg-muted/30 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Informasi JSA Terpilih
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Nomor JSA
                      </Label>
                      <p className="font-medium">
                        {selectedJsa.noJsa ?? 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Jenis Kegiatan
                      </Label>
                      <p className="font-medium">{selectedJsa.jenisKegiatan}</p>
                    </div>
                    {selectedJsa.lokasiKegiatan && (
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">
                          Lokasi
                        </Label>
                        <p className="font-medium">
                          {selectedJsa.lokasiKegiatan}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              {/* Info message when no approved JSA is available */}
              {!isLoadingJsa && approvedJsaList.length === 0 && (
                <div className="p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
                  <p className="font-medium mb-1">
                    Tidak ada JSA yang tersedia
                  </p>
                  <p>
                    Anda perlu memiliki JSA dengan status &quot;APPROVED&quot;
                    terlebih dahulu sebelum membuat PTW.
                  </p>
                </div>
              )}
              <FormField
                control={form.control}
                name="lokasiPekerjaan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lokasi Pekerjaan</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Contoh: Workshop Area B, Lantai 2"
                        className="bg-muted/50 border-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tanggalMulai"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tanggal Mulai</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="bg-muted/50 border-none"
                          value={
                            field.value
                              ? new Date(field.value)
                                  .toISOString()
                                  .split('T')[0]
                              : ''
                          }
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? new Date(e.target.value)
                                : undefined,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tanggalSelesai"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tanggal Selesai</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="bg-muted/50 border-none"
                          value={
                            field.value
                              ? new Date(field.value)
                                  .toISOString()
                                  .split('T')[0]
                              : ''
                          }
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? new Date(e.target.value)
                                : undefined,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="keteranganTambahan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keterangan Tambahan</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Catatan atau informasi tambahan (opsional)"
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
                {createMutation.isPending ? 'Menyimpan...' : 'Buat PTW'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
