'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@repo/ui/components/ui/button';
import { Card } from '@repo/ui/components/ui/card';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Pencil,
  Loader2,
  XCircle,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useVendorDetailQuery } from '@/store/users/users-query';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/ui/components/ui/avatar';
import { Badge } from '@repo/ui/components/ui/badge';
import { Separator } from '@repo/ui/components/ui/separator';

export default function VendorDetailsPage() {
  const params = useParams();
  const vendorId = params.id as string;
  const router = useRouter();

  const {
    data: vendorData,
    isLoading,
    isError,
  } = useVendorDetailQuery(vendorId);

  const vendor = vendorData?.data || vendorData;

  if (isLoading) {
    return (
      <div className="flex h-[600px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !vendor) {
    return (
      <div className="flex flex-col h-[600px] w-full items-center justify-center gap-4">
        <XCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium text-muted-foreground">
          Vendor tidak ditemukan atau terjadi kesalahan saat memuat data.
        </p>
        <Button onClick={() => router.push('/admin/vendor-registry')}>
          Kembali ke Daftar
        </Button>
      </div>
    );
  }

  const registrationDate = new Date(vendor.createdAt).toLocaleDateString(
    'id-ID',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  );

  return (
    <div className="flex flex-col gap-8 p-4 md:p-6 lg:p-8 w-full max-w-6xl mx-auto">
      {/* HEADER ACTIONS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button
          variant="outline"
          className="gap-2 shadow-sm hover:shadow-md transition-all shrink-0 h-10 px-6 font-semibold"
          onClick={() => router.push('/admin/vendor-registry')}
        >
          <ArrowLeft className="h-4 w-4" />
          Daftar Vendor
        </Button>
        <Button
          className="gap-2 shadow-lg shadow-primary/20 font-bold px-6"
          onClick={() => router.push(`/admin/vendor-registry/${vendorId}/edit`)}
        >
          <Pencil className="h-4 w-4" />
          Edit Vendor
        </Button>
      </div>

      {/* HERO SECTION */}
      <Card className="relative overflow-hidden border-none shadow-2xl bg-gradient-to-br from-card to-muted/20">
        <div className="absolute top-0 right-0 p-6">
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none px-4 py-1 text-xs font-bold tracking-widest uppercase">
            ACTIVE
          </Badge>
        </div>
        <div className="p-8 md:p-12 flex flex-col md:flex-row items-center md:items-start gap-10">
          <Avatar className="h-40 w-40 border-8 border-background shadow-2xl rounded-[2.5rem] bg-background shrink-0">
            <AvatarImage
              src={vendor.vendorLogo || ''}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary/5 text-primary">
              <Building2 className="h-16 w-16 opacity-10" />
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col gap-4 text-center md:text-left flex-1">
            <div className="space-y-1">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground">
                {vendor.vendorName}
              </h1>
              <p className="text-lg text-muted-foreground font-medium flex items-center justify-center md:justify-start gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Terdaftar sejak {registrationDate}
              </p>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
              <Badge
                variant="secondary"
                className="px-3 py-1 gap-1.5 font-medium"
              >
                <Info className="h-3 w-3" />
                UID: {vendorId.toUpperCase()}
              </Badge>
              {vendor.vendorWebsite && (
                <a
                  href={vendor.vendorWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Badge
                    variant="outline"
                    className="px-3 py-1 gap-1.5 font-medium hover:bg-primary hover:text-white transition-colors cursor-pointer"
                  >
                    <Globe className="h-3 w-3" />
                    Visit Website
                    <ExternalLink className="h-3 w-3" />
                  </Badge>
                </a>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* CORE INFO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Essential Contact */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          <Card className="p-6 border-none shadow-xl flex flex-col gap-6">
            <h3 className="font-bold text-sm uppercase tracking-[0.2em] text-primary/70">
              Contact Channels
            </h3>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                    Official Email
                  </p>
                  <p className="font-semibold text-foreground break-all">
                    {vendor.vendorEmail}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                    Phone Number
                  </p>
                  <p className="font-semibold text-foreground">
                    {vendor.vendorPhone}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-none shadow-xl flex flex-col gap-6">
            <h3 className="font-bold text-sm uppercase tracking-[0.2em] text-primary/70">
              Location details
            </h3>
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                  Headquarters Address
                </p>
                <p className="text-sm font-medium leading-relaxed text-muted-foreground italic">
                  {vendor.vendorAddress}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Profile & Description */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <Card className="p-8 border-none shadow-xl flex flex-col gap-8 flex-1">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold tracking-tight">
                  Profil Perusahaan
                </h2>
              </div>
              <Separator />
            </div>

            <div className="space-y-6">
              <div className="prose prose-sm max-w-none text-muted-foreground leading-loose">
                {vendor.vendorDescription ? (
                  <p className="whitespace-pre-wrap">
                    {vendor.vendorDescription}
                  </p>
                ) : (
                  <div className="flex flex-col items-center justify-center p-10 bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
                    <Info className="h-10 w-10 text-muted/40 mb-3" />
                    <p className="italic text-muted-foreground/60">
                      Belum ada deskripsi profil untuk vendor ini.
                    </p>
                    <Button
                      variant="link"
                      className="mt-2 text-primary"
                      onClick={() =>
                        router.push(`/admin/vendor-registry/${vendorId}/edit`)
                      }
                    >
                      Tambahkan Deskripsi
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto pt-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-muted/30 border border-muted flex flex-col gap-1 items-center justify-center">
                  <span className="text-2xl font-black text-foreground">0</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Workers
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 border border-muted flex flex-col gap-1 items-center justify-center">
                  <span className="text-2xl font-black text-foreground">0</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Projects
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 border border-muted flex flex-col gap-1 items-center justify-center">
                  <span className="text-2xl font-black text-foreground">
                    --
                  </span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Rating
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 border border-muted flex flex-col gap-1 items-center justify-center">
                  <span className="text-2xl font-black text-foreground">
                    --
                  </span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Certifications
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
