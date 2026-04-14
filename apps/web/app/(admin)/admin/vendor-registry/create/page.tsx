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
  MailIcon,
  Phone,
  MapPin,
  Building2,
  Globe,
  Loader2,
  Camera,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Textarea } from '@repo/ui/components/ui/textarea';
import { useCreateVendorMutation } from '@/store/users/users-query';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/ui/components/ui/avatar';

const createVendorSchema = yup.object({
  vendorName: yup.string().required('Nama vendor wajib diisi'),
  vendorEmail: yup
    .string()
    .email('Format email tidak valid')
    .required('Email wajib diisi'),
  vendorPhone: yup.string().required('Nomor telepon wajib diisi'),
  vendorAddress: yup.string().required('Alamat wajib diisi'),
  vendorWebsite: yup.string().optional(),
  vendorDescription: yup.string().optional(),
});

type CreateVendorInput = yup.InferType<typeof createVendorSchema>;

export default function CreateVendorPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const createVendorMutation = useCreateVendorMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateVendorInput>({
    resolver: yupResolver(createVendorSchema),
    defaultValues: {
      vendorName: '',
      vendorEmail: '',
      vendorPhone: '',
      vendorAddress: '',
      vendorWebsite: '',
      vendorDescription: '',
    },
  });

  const onSubmit = async (data: CreateVendorInput) => {
    const payload = {
      ...data,
      logo: logoFile || undefined,
    };

    createVendorMutation.mutate(payload, {
      onSuccess: () => {
        router.push('/admin/vendor-registry');
      },
    });
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const isSubmitting = createVendorMutation.isPending;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 w-full max-w-5xl mx-auto overflow-hidden">
      <div className="flex justify-start">
        <Button
          variant="outline"
          className="gap-2 shadow-sm hover:shadow-md transition-all shrink-0 h-10 px-6"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
      </div>

      <div className="flex flex-col gap-1.5 mb-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          Tambah Vendor Baru
          <span className="text-sm font-normal px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">
            Pendaftaran
          </span>
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Daftarkan perusahaan atau mitra kerja baru ke dalam platform Safeflow.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-20"
      >
        {/* LEFT CARD: Brand & Identification */}
        <div className="md:col-span-1 space-y-6">
          <Card className="p-6 border-none shadow-xl bg-card">
            <div className="flex flex-col items-center gap-6">
              <div className="relative group">
                <Avatar className="h-32 w-32 border-4 border-background shadow-2xl group-hover:opacity-90 transition-all cursor-pointer overflow-hidden rounded-2xl">
                  <AvatarImage
                    src={logoPreview || ''}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-3xl font-bold bg-primary/5 text-primary">
                    <Building2 className="h-12 w-12 opacity-20" />
                  </AvatarFallback>
                </Avatar>
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl cursor-pointer"
                  onClick={handleLogoClick}
                >
                  <Camera className="h-8 w-8 text-white" />
                </div>
                <Button
                  type="button"
                  size="icon"
                  className="absolute -bottom-2 -right-2 h-10 w-10 rounded-xl shadow-lg border-2 border-background"
                  onClick={handleLogoClick}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-bold text-lg">Logo Perusahaan</h3>
                <p className="text-xs text-muted-foreground">
                  Format: JPG, PNG, WEBP. Maks 2MB.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-none shadow-xl bg-card space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                Petunjuk
              </h3>
            </div>
            <ul className="space-y-3">
              {[
                'Pastikan Nama Vendor sesuai legalitas.',
                'Gunakan email domain perusahaan.',
                'Alamat harus lengkap dan jelas.',
              ].map((tip, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-xs text-muted-foreground"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* RIGHT CARD: Forms */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-8 border-none shadow-xl bg-card">
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                    Informasi Bisnis
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="vendorName"
                      className={
                        errors.vendorName
                          ? 'text-destructive font-semibold'
                          : 'font-semibold'
                      }
                    >
                      Nama Perusahaan / Vendor
                    </Label>
                    <Input
                      id="vendorName"
                      placeholder="Masukkan nama resmi vendor..."
                      {...register('vendorName')}
                      className={`h-11 ${errors.vendorName ? 'border-destructive bg-destructive/5' : 'bg-muted/30 focus:bg-background transition-all'}`}
                    />
                    {errors.vendorName && (
                      <p className="text-destructive text-xs italic">
                        {errors.vendorName.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="vendorEmail"
                        className={
                          errors.vendorEmail
                            ? 'text-destructive font-semibold'
                            : 'font-semibold'
                        }
                      >
                        Email Perusahaan
                      </Label>
                      <div className="relative">
                        <Input
                          id="vendorEmail"
                          type="email"
                          placeholder="corporate@vendor.com"
                          {...register('vendorEmail')}
                          className={`h-11 pl-10 ${errors.vendorEmail ? 'border-destructive bg-destructive/5' : 'bg-muted/30'}`}
                        />
                        <MailIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                      </div>
                      {errors.vendorEmail && (
                        <p className="text-destructive text-xs italic">
                          {errors.vendorEmail.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="vendorPhone"
                        className={
                          errors.vendorPhone
                            ? 'text-destructive font-semibold'
                            : 'font-semibold'
                        }
                      >
                        Nomor Telepon
                      </Label>
                      <div className="relative">
                        <Input
                          id="vendorPhone"
                          type="tel"
                          placeholder="021-xxxxxx"
                          {...register('vendorPhone')}
                          className={`h-11 pl-10 ${errors.vendorPhone ? 'border-destructive bg-destructive/5' : 'bg-muted/30'}`}
                        />
                        <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                      </div>
                      {errors.vendorPhone && (
                        <p className="text-destructive text-xs italic">
                          {errors.vendorPhone.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="vendorWebsite"
                      className="font-semibold text-foreground"
                    >
                      Website (Opsional)
                    </Label>
                    <div className="relative">
                      <Input
                        id="vendorWebsite"
                        placeholder="https://www.vendor.com"
                        {...register('vendorWebsite')}
                        className="h-11 pl-10 bg-muted/30"
                      />
                      <Globe className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="vendorAddress"
                      className={
                        errors.vendorAddress
                          ? 'text-destructive font-semibold'
                          : 'font-semibold'
                      }
                    >
                      Alamat Lengkap
                    </Label>
                    <div className="relative">
                      <Textarea
                        id="vendorAddress"
                        placeholder="Masukkan alamat lengkap kantor..."
                        className={`min-h-[100px] pl-10 ${errors.vendorAddress ? 'border-destructive bg-destructive/5' : 'bg-muted/30'}`}
                        {...register('vendorAddress')}
                      />
                      <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                    </div>
                    {errors.vendorAddress && (
                      <p className="text-destructive text-xs italic">
                        {errors.vendorAddress.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="vendorDescription"
                      className="font-semibold text-foreground"
                    >
                      Deskripsi / Bidang Usaha
                    </Label>
                    <Textarea
                      id="vendorDescription"
                      placeholder="Jelaskan secara singkat profil perusahaan..."
                      className="min-h-[100px] bg-muted/30"
                      {...register('vendorDescription')}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                <Button
                  type="submit"
                  size="lg"
                  className="flex-1 h-12 shadow-lg shadow-primary/20 gap-2 font-bold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="h-5 w-5" />
                  )}
                  {isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Vendor'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="flex-1 h-12 font-semibold"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Batalkan
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}

function Upload(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}
