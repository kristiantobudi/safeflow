'use client';

import { useEffect, useRef, useState } from 'react';
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
  XCircle,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { Textarea } from '@repo/ui/components/ui/textarea';
import {
  useVendorDetailQuery,
  useUpdateVendorMutation,
} from '@/store/users/users-query';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/ui/components/ui/avatar';

const updateVendorSchema = yup.object({
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

type UpdateVendorInput = yup.InferType<typeof updateVendorSchema>;

export default function EditVendorPage() {
  const params = useParams();
  const vendorId = params.id as string;
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const {
    data: vendorData,
    isLoading: isLoadingVendor,
    isError,
  } = useVendorDetailQuery(vendorId);
  const updateVendorMutation = useUpdateVendorMutation();

  const currentVendor = vendorData?.data || vendorData;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateVendorInput>({
    resolver: yupResolver(updateVendorSchema),
    defaultValues: {
      vendorName: '',
      vendorEmail: '',
      vendorPhone: '',
      vendorAddress: '',
      vendorWebsite: '',
      vendorDescription: '',
    },
  });

  // Populate form when data is loaded
  useEffect(() => {
    if (currentVendor) {
      reset({
        vendorName: currentVendor.vendorName || '',
        vendorEmail: currentVendor.vendorEmail || '',
        vendorPhone: currentVendor.vendorPhone || '',
        vendorAddress: currentVendor.vendorAddress || '',
        vendorWebsite: currentVendor.vendorWebsite || '',
        vendorDescription: currentVendor.vendorDescription || '',
      });
      if (currentVendor.vendorLogo) {
        setLogoPreview(currentVendor.vendorLogo);
      }
    }
  }, [currentVendor, reset]);

  const onSubmit = async (data: UpdateVendorInput) => {
    const payload = {
      ...data,
      logo: logoFile || undefined,
    };

    updateVendorMutation.mutate(
      { id: vendorId, data: payload },
      {
        onSuccess: () => {
          router.push('/admin/vendor-registry');
        },
      },
    );
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

  if (isLoadingVendor) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col h-[400px] w-full items-center justify-center gap-4">
        <XCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium text-muted-foreground">
          Vendor tidak ditemukan atau terjadi kesalahan.
        </p>
        <Button onClick={() => router.back()}>Kembali</Button>
      </div>
    );
  }

  const isSubmitting = updateVendorMutation.isPending;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 w-full max-w-5xl mx-auto overflow-hidden">
      <div className="flex justify-start">
        <Button
          variant="outline"
          className="gap-2 shadow-sm hover:shadow-md transition-all shrink-0 h-10 px-6 font-semibold"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
      </div>

      <div className="flex flex-col gap-1.5 mb-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          Edit Profil Vendor
          <span className="text-sm font-normal px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">
            ID: {vendorId.slice(-6).toUpperCase()}
          </span>
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Perbarui informasi profil, kontak, dan identitas visual mitra kerja Anda.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-20"
      >
        {/* LEFT CARD: Brand Identiy */}
        <div className="md:col-span-1 space-y-6">
          <Card className="p-6 border-none shadow-xl bg-card">
            <div className="flex flex-col items-center gap-6">
              <div className="relative group">
                <Avatar className="h-32 w-32 border-4 border-background shadow-2xl group-hover:opacity-90 transition-all cursor-pointer overflow-hidden rounded-2xl">
                  <AvatarImage src={logoPreview || ''} className="object-cover" />
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
                <h3 className="font-bold text-lg">Update Logo</h3>
                <p className="text-xs text-muted-foreground">
                  Format: JPG, PNG, WEBP. Maks 2MB.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-none shadow-xl bg-card">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Status Perusahaan
            </h3>
            <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10 flex items-center justify-between">
              <span className="text-sm font-medium">Status Akun</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold tracking-widest uppercase">
                Active
              </span>
            </div>
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
                    Edit Informasi Bisnis
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="vendorName"
                      className={errors.vendorName ? 'text-destructive font-semibold' : 'font-semibold'}
                    >
                      Nama Perusahaan / Vendor
                    </Label>
                    <Input
                      id="vendorName"
                      {...register('vendorName')}
                      className={`h-11 ${errors.vendorName ? 'border-destructive bg-destructive/5' : 'bg-muted/30 focus:bg-background'}`}
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
                        className={errors.vendorEmail ? 'text-destructive font-semibold' : 'font-semibold'}
                      >
                        Email Perusahaan
                      </Label>
                      <div className="relative">
                        <Input
                          id="vendorEmail"
                          type="email"
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
                        className={errors.vendorPhone ? 'text-destructive font-semibold' : 'font-semibold'}
                      >
                        Nomor Telepon
                      </Label>
                      <div className="relative">
                        <Input
                          id="vendorPhone"
                          type="tel"
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
                    <Label htmlFor="vendorWebsite" className="font-semibold">Website</Label>
                    <div className="relative">
                      <Input
                        id="vendorWebsite"
                        {...register('vendorWebsite')}
                        className="h-11 pl-10 bg-muted/30"
                      />
                      <Globe className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="vendorAddress"
                      className={errors.vendorAddress ? 'text-destructive font-semibold' : 'font-semibold'}
                    >
                      Alamat Lengkap
                    </Label>
                    <div className="relative">
                      <Textarea
                        id="vendorAddress"
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
                    <Label htmlFor="vendorDescription" className="font-semibold">Deskripsi / Profil</Label>
                    <Textarea
                      id="vendorDescription"
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
                  className="flex-1 h-12 text-md shadow-lg shadow-primary/20 gap-2 font-bold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="h-5 w-5" />
                  )}
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
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
