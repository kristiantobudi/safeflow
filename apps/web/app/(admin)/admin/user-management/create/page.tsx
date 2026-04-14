'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Button } from '@repo/ui/components/ui/button';
import { Card } from '@repo/ui/components/ui/card';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import {
  ArrowLeft,
  Download,
  MailIcon,
  Upload,
  Loader2,
  Phone,
  MapPin,
  Shield,
  Save,
  FileUp,
  CheckCircle2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select';
import { Textarea } from '@repo/ui/components/ui/textarea';
import {
  useVendorsQuery,
  useCreateUserMutation,
  useUploadUserTemplateMutation,
} from '@/store/users/users-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';

// Schema validasi menggunakan Bahasa Indonesia
const createUserSchema = yup.object({
  firstName: yup
    .string()
    .min(3, 'Nama depan minimal 3 karakter')
    .required('Nama depan wajib diisi'),
  lastName: yup.string().optional(),
  email: yup
    .string()
    .email('Format email tidak valid')
    .required('Email wajib diisi'),
  username: yup
    .string()
    .min(3, 'Username minimal 3 karakter')
    .required('Username wajib diisi'),
  password: yup
    .string()
    .min(8, 'Password minimal 8 karakter')
    .required('Password wajib diisi'),
  phone: yup.string().optional(),
  address: yup.string().optional(),
  vendorId: yup.string().optional(),
});

type CreateUserInput = yup.InferType<typeof createUserSchema>;

export default function CreateUserPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // React Query Hooks
  const { data: vendorsData, isLoading: isLoadingVendors } = useVendorsQuery(
    1,
    100,
  );
  const createUserMutation = useCreateUserMutation();
  const uploadTemplateMutation = useUploadUserTemplateMutation();

  const vendors = vendorsData?.data?.vendors || vendorsData?.users || [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: yupResolver(createUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      password: '',
      phone: '',
      address: '',
      vendorId: undefined,
    },
  });

  const selectedVendorId = watch('vendorId');

  const onSubmit = async (data: CreateUserInput) => {
    createUserMutation.mutate(data, {
      onSuccess: () => {
        router.push('/admin/user-management');
      },
    });
  };

  const handleDownloadTemplate = () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    // Download directly using window.location.href or an anchor tag
    window.location.href = `${API_URL}/auth/register/download-template`;
  };

  const handleUploadClick = () => {
    if (file) {
      uploadTemplateMutation.mutate(file, {
        onSuccess: () => {
          setIsBulkOpen(false);
          setFile(null);
        },
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('Sedang mengunggah template...');

    uploadTemplateMutation.mutate(file, {
      onSuccess: () => {
        router.push('/admin/user-management');
      },
      onSettled: () => {
        toast.dismiss(toastId);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
    });
  };

  const isSubmitting = createUserMutation.isPending;
  const isUploading = uploadTemplateMutation.isPending;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 w-full max-w-7xl mx-auto overflow-hidden">
      <div className="flex justify-start">
        <Button
          variant="outline"
          className="gap-2 shadow-sm hover:shadow-md transition-all shrink-0 h-10 px-6"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-medium">Kembali</span>
        </Button>
      </div>

      <div className="flex flex-row items-end justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Buat User Baru
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
            Tambahkan anggota baru ke organisasi Anda secara manual atau melalui
            template Excel.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleDownloadTemplate}
            className="w-full sm:w-auto gap-2 shadow-sm hover:shadow-md transition-all shrink-0 h-10 px-6"
          >
            <Download className="h-4 w-4" />
            <span className="font-medium">Template</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsBulkOpen(true)}
            className="w-full sm:w-auto gap-2 shadow-sm hover:shadow-md transition-all shrink-0 h-10 px-6"
          >
            <FileUp className="h-4 w-4" />
            Upload Template
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card className="p-6 border-none shadow-xl bg-card">
          {/* Informasi Akun */}
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            <div className="space-y-1">
              <h2 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Informasi Akun
              </h2>
              <p className="text-muted-foreground text-sm">
                Detail dasar untuk akses login dan identitas user.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:col-span-2">
              <div className="flex flex-col items-start gap-2">
                <Label
                  htmlFor="firstName"
                  className={errors.firstName ? 'text-destructive' : ''}
                >
                  Nama Depan
                </Label>
                <Input
                  id="firstName"
                  placeholder="Contoh: John"
                  {...register('firstName')}
                  className={errors.firstName ? 'border-destructive' : ''}
                />
                {errors.firstName && (
                  <p className="text-destructive text-xs">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-start gap-2">
                <Label htmlFor="lastName">Nama Belakang</Label>
                <Input
                  id="lastName"
                  placeholder="Contoh: Doe"
                  {...register('lastName')}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="username"
                  className={errors.username ? 'text-destructive' : ''}
                >
                  Username
                </Label>
                <Input
                  id="username"
                  placeholder="johndoe123"
                  {...register('username')}
                  className={errors.username ? 'border-destructive' : ''}
                />
                {errors.username && (
                  <p className="text-destructive text-xs">
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="email"
                  className={errors.email ? 'text-destructive' : ''}
                >
                  Alamat Email
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    className={`peer pr-9 ${errors.email ? 'border-destructive' : ''}`}
                    {...register('email')}
                  />
                  <div className="text-muted-foreground pointer-events-none absolute inset-y-0 right-0 flex items-center justify-center pr-3 peer-disabled:opacity-50">
                    <MailIcon className="size-4" />
                  </div>
                </div>
                {errors.email && (
                  <p className="text-destructive text-xs">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label
                  htmlFor="password"
                  className={errors.password ? 'text-destructive' : ''}
                >
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  {...register('password')}
                  className={errors.password ? 'border-destructive' : ''}
                />
                <p className="text-muted-foreground text-xs">
                  Minimal 8 karakter.
                </p>
                {errors.password && (
                  <p className="text-destructive text-xs">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-none shadow-xl bg-card">
          {/* Kontak & Alamat */}
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            <div className="space-y-1">
              <h2 className="font-semibold flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                Kontak & Lokasi
              </h2>
              <p className="text-muted-foreground text-sm">
                Informasi untuk komunikasi dan penempatan kerja.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:col-span-2">
              <div className="flex flex-col items-start gap-2">
                <Label htmlFor="phone">Nomor HP</Label>
                <div className="relative w-full">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0812xxxx"
                    className="pl-9"
                    {...register('phone')}
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center justify-center pl-3 text-muted-foreground">
                    <Phone className="size-4" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start gap-2">
                <Label htmlFor="vendorId">Vendor / Perusahaan</Label>
                <Select
                  onValueChange={(value) => setValue('vendorId', value)}
                  value={selectedVendorId}
                >
                  <SelectTrigger id="vendorId" className="w-full">
                    <SelectValue
                      placeholder={
                        isLoadingVendors ? 'Memuat...' : 'Pilih Vendor'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {vendors.map((v: any) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.vendorName}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col items-start gap-2 sm:col-span-2">
                <Label htmlFor="address">Alamat Lengkap</Label>
                <div className="relative w-full">
                  <Textarea
                    id="address"
                    placeholder="Masukkan alamat lengkap..."
                    className="min-h-[100px] pl-9"
                    {...register('address')}
                  />
                  <div className="absolute top-3 left-0 flex items-center justify-center pl-3 text-muted-foreground">
                    <MapPin className="size-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3 pb-4">
          <Button
            type="submit"
            className="w-full sm:w-auto h-11 px-8"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSubmitting ? 'Menyimpan...' : 'Submit'}
          </Button>
        </div>
      </form>
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="sm:max-w-[450px] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileUp className="h-6 w-6 text-primary" />
              </div>
              Upload Template
            </DialogTitle>
            <DialogDescription>
              Unggah file Excel untuk mendaftarkan banyak worker sekaligus.
              Gunakan template resmi kami.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-muted rounded-2xl bg-muted/20 gap-4 mt-4">
            <div className="bg-background p-4 rounded-full shadow-sm">
              <Download className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-medium">
                Klik tombol di bawah untuk memilih file
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Hanya mendukung format .xlsx
              </p>
            </div>
            <input
              type="file"
              id="bulk-file"
              className="hidden"
              accept=".xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <Button
              variant={file ? 'secondary' : 'outline'}
              onClick={() => document.getElementById('bulk-file')?.click()}
              className="h-10"
            >
              {file ? file.name : 'Pilih File Excel'}
            </Button>
          </div>

          <DialogFooter className="mt-4">
            <Button
              className="w-full h-11 font-bold gap-2"
              disabled={!file || uploadTemplateMutation.isPending}
              onClick={handleUploadClick}
            >
              {uploadTemplateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Proses Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
