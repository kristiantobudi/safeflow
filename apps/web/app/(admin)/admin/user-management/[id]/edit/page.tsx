'use client';

import { useEffect, useRef, useState, CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Button } from '@repo/ui/components/ui/button';
import { Card } from '@repo/ui/components/ui/card';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Separator } from '@repo/ui/components/ui/separator';
import {
  ArrowLeft,
  MailIcon,
  Upload,
  Loader2,
  Phone,
  MapPin,
  Shield,
  User,
  CheckCircle2,
  XCircle,
  Save,
  Lock,
  Camera,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select';
import { Textarea } from '@repo/ui/components/ui/textarea';
import { Switch } from '@repo/ui/components/ui/switch';
import {
  useVendorsQuery,
  useUserDetailQuery,
  useUpdateUserMutation,
} from '@/store/users/users-query';
import { toast } from 'sonner';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/ui/components/ui/avatar';

// Schema validasi untuk update
const updateUserSchema = yup.object({
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
    .optional()
    .test(
      'len',
      'Password minimal 8 karakter',
      (val) => !val || val.length >= 8,
    ),
  phone: yup.string().optional(),
  address: yup.string().optional(),
  vendorId: yup.string().optional(),
  role: yup.string().required('Role wajib dipilih'),
  isActive: yup.boolean().default(true),
  isVerified: yup.boolean().default(false),
});

type UpdateUserInput = yup.InferType<typeof updateUserSchema>;

export default function EditUserPage() {
  const params = useParams();
  const userId = params.id as string;
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // React Query Hooks
  const { data: vendorsData, isLoading: isLoadingVendors } = useVendorsQuery(
    1,
    100,
  );
  const {
    data: userData,
    isLoading: isLoadingUser,
    isError: isErrorUser,
  } = useUserDetailQuery(userId);
  const updateUserMutation = useUpdateUserMutation();

  const vendors = vendorsData?.data?.vendors || vendorsData?.users || [];
  const currentUser = userData?.data;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateUserInput>({
    resolver: yupResolver(updateUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      password: '',
      phone: '',
      address: '',
      vendorId: '',
      role: 'USER',
      isActive: true,
      isVerified: false,
    },
  });

  // Populate form when data is loaded
  useEffect(() => {
    if (currentUser) {
      reset({
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email || '',
        username: currentUser.username || '',
        password: '', // Jangan populate password
        phone: currentUser.phone || '',
        address: currentUser.address || '',
        vendorId: currentUser.vendorId || '',
        role: currentUser.role || 'USER',
        isActive: currentUser.isActive ?? true,
        isVerified: currentUser.isVerified ?? false,
      });
      if (currentUser.avatarUrl) {
        setAvatarPreview(currentUser.avatarUrl);
      }
    }
  }, [currentUser, reset]);

  const selectedVendorId = watch('vendorId');
  const selectedRole = watch('role');
  const isActive = watch('isActive');
  const isVerified = watch('isVerified');

  const onSubmit = async (data: UpdateUserInput) => {
    const payload = {
      ...data,
      avatar: avatarFile || undefined,
    };

    updateUserMutation.mutate(
      { id: userId, data: payload },
      {
        onSuccess: () => {
          // Stay on page or go back? Image shows "Save All Changes" which usually keeps you on page or goes back.
          // I'll stay for confirmation but user might want to go back.
        },
      },
    );
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isErrorUser) {
    return (
      <div className="flex flex-col h-[400px] w-full items-center justify-center gap-4">
        <XCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium text-muted-foreground">
          User tidak ditemukan atau terjadi kesalahan.
        </p>
        <Button onClick={() => router.back()}>Kembali</Button>
      </div>
    );
  }

  const isSubmitting = updateUserMutation.isPending;

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

      <div className="flex flex-col gap-1.5 mb-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          Edit User Profile
          {currentUser && (
            <span className="text-sm font-normal px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">
              ID: {currentUser.username}
            </span>
          )}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Kelola informasi akun, kontak, dan pengaturan keamanan untuk user ini.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20"
      >
        {/* LEFT COLUMN: General Info */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-8 border-none shadow-xl bg-card h-full">
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-lg group-hover:opacity-80 transition-opacity">
                    <AvatarImage src={avatarPreview || ''} />
                    <AvatarFallback className="text-2xl font-bold bg-muted text-muted-foreground">
                      {currentUser?.firstName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-md border border-border"
                    onClick={handleAvatarClick}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">User Avatar</h3>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Rekomendasi ukuran 200x200px. Maksimal 2MB (JPG, PNG).
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={handleAvatarClick}
                  >
                    Ganti Foto
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                    Informasi Dasar
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="firstName"
                      className={errors.firstName ? 'text-destructive' : ''}
                    >
                      Nama Depan
                    </Label>
                    <Input
                      id="firstName"
                      {...register('firstName')}
                      className={
                        errors.firstName ? 'border-destructive' : 'bg-muted/30'
                      }
                    />
                    {errors.firstName && (
                      <p className="text-destructive text-xs italic">
                        {errors.firstName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nama Belakang</Label>
                    <Input
                      id="lastName"
                      {...register('lastName')}
                      className="bg-muted/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="username"
                      className={errors.username ? 'text-destructive' : ''}
                    >
                      Username
                    </Label>
                    <Input
                      id="username"
                      {...register('username')}
                      className={
                        errors.username ? 'border-destructive' : 'bg-muted/30'
                      }
                    />
                    {errors.username && (
                      <p className="text-destructive text-xs italic">
                        {errors.username.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
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
                        {...register('email')}
                        className={`pr-10 ${errors.email ? 'border-destructive' : 'bg-muted/30'}`}
                      />
                      <MailIcon className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    </div>
                    {errors.email && (
                      <p className="text-destructive text-xs italic">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Phone className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                    Kontak & Lokasi
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Nomor HP</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="0812xxxx"
                      {...register('phone')}
                      className="bg-muted/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vendorId">Vendor / Perusahaan</Label>
                    <Select
                      onValueChange={(value) => setValue('vendorId', value)}
                      value={selectedVendorId}
                    >
                      <SelectTrigger
                        id="vendorId"
                        className="bg-muted/30 w-full"
                      >
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

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Alamat Lengkap</Label>
                    <div className="relative">
                      <Textarea
                        id="address"
                        placeholder="Masukkan alamat lengkap..."
                        className="min-h-[100px] pl-10 bg-muted/30"
                        {...register('address')}
                      />
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Settings & Security */}
        <div className="space-y-8">
          <Card className="p-6 border-none shadow-xl bg-card">
            <h3 className="font-bold flex items-center gap-2 mb-6 text-primary">
              <Lock className="h-4 w-4" /> Ganti Password
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password Baru</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  {...register('password')}
                  className="bg-muted/30"
                />
                <p className="text-[10px] text-muted-foreground italic">
                  Kosongkan jika tidak ingin mengubah password.
                </p>
                {errors.password && (
                  <p className="text-destructive text-xs italic">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6 border-none shadow-xl bg-card">
            <h3 className="font-bold flex items-center gap-2 mb-6 text-primary">
              <Shield className="h-4 w-4" /> Pengaturan Akun
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="role">User Role</Label>
                <Select
                  onValueChange={(value) => setValue('role', value as any)}
                  value={selectedRole}
                >
                  <SelectTrigger id="role" className="bg-muted/30">
                    <SelectValue placeholder="Pilih Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="EXAMINER">Examiner</SelectItem>
                    <SelectItem value="VERIFICATOR">Verificator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 border border-input rounded-lg bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-base">Akun Aktif</Label>
                  <p className="text-xs text-muted-foreground">
                    User dapat login ke sistem.
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={(checked) => setValue('isActive', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-input rounded-lg bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center gap-1.5">
                    Terverifikasi{' '}
                    {isVerified && (
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                    )}
                  </Label>
                  <p className="text-xs text-muted-foreground text-pretty">
                    Akses penuh ke fitur Safeflow.
                  </p>
                </div>
                <Switch
                  checked={isVerified}
                  onCheckedChange={(checked) => setValue('isVerified', checked)}
                />
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full h-12 text-lg shadow-lg hover:shadow-primary/25 transition-all gap-2"
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
              className="w-full h-11"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Batalkan
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
