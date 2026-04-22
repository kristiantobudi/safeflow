import { useCreateVendorMutation } from '@/store/users/users-query';
import { yupResolver } from '@hookform/resolvers/yup';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';

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

export const useCreateVendorRegistry = () => {
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

  return {
    register,
    handleSubmit,
    errors,
    onSubmit,
    handleLogoClick,
    handleFileChange,
    logoPreview,
    isSubmitting,
    fileInputRef,
    router,
  };
};
