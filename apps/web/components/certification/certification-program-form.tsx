'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  createCertificationProgramSchema,
  updateCertificationProgramSchema,
  type CreateCertificationProgramInput,
  type UpdateCertificationProgramInput,
} from '@repo/validation';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Textarea } from '@repo/ui/components/ui/textarea';
import { Badge } from '@repo/ui/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@repo/ui/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/ui/components/ui/popover';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';
import {
  useCreateCertificationProgram,
  useUpdateCertificationProgram,
  useAvailableModules,
} from '@/store/vendor-certification/query';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Module {
  id: string;
  title: string;
  description?: string | null;
}

interface CertificationProgramFormProps {
  /** If provided, the form operates in edit mode */
  programId?: string;
  defaultValues?: {
    name?: string;
    description?: string;
    validityDays?: number;
    moduleIds?: string[];
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CertificationProgramForm({
  programId,
  defaultValues,
  onSuccess,
  onCancel,
}: CertificationProgramFormProps) {
  const isEditMode = !!programId;

  const { data: modulesData, isLoading: modulesLoading } = useAvailableModules();
  const createMutation = useCreateCertificationProgram();
  const updateMutation = useUpdateCertificationProgram();

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Resolve available modules from API response
  const availableModules: Module[] = Array.isArray(modulesData)
    ? modulesData
    : (modulesData?.data ?? []);

  const schema = isEditMode
    ? updateCertificationProgramSchema
    : createCertificationProgramSchema;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateCertificationProgramInput | UpdateCertificationProgramInput>({
    resolver: yupResolver(schema as any),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      validityDays: defaultValues?.validityDays ?? undefined,
      moduleIds: defaultValues?.moduleIds ?? [],
    },
  });

  // Sync defaultValues when editing (e.g. after data loads)
  useEffect(() => {
    if (defaultValues) {
      reset({
        name: defaultValues.name ?? '',
        description: defaultValues.description ?? '',
        validityDays: defaultValues.validityDays ?? undefined,
        moduleIds: defaultValues.moduleIds ?? [],
      });
    }
  }, [defaultValues, reset]);

  const selectedModuleIds: string[] = (watch('moduleIds') as string[]) ?? [];

  const onSubmit = (
    data: CreateCertificationProgramInput | UpdateCertificationProgramInput,
  ) => {
    if (isEditMode) {
      updateMutation.mutate(
        { id: programId, data: data as UpdateCertificationProgramInput },
        { onSuccess },
      );
    } else {
      createMutation.mutate(data as CreateCertificationProgramInput, {
        onSuccess,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">
          Nama Program <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="Contoh: Sertifikasi K3 Umum"
          className="bg-muted/50 border-none"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Deskripsi</Label>
        <Textarea
          id="description"
          placeholder="Deskripsi singkat tentang program sertifikasi ini..."
          className="bg-muted/50 border-none resize-none min-h-[80px]"
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Validity Days */}
      <div className="space-y-1.5">
        <Label htmlFor="validityDays">Masa Berlaku (hari)</Label>
        <Input
          id="validityDays"
          type="number"
          min={1}
          placeholder="Contoh: 365 (kosongkan jika tidak ada batas)"
          className="bg-muted/50 border-none"
          {...register('validityDays', { valueAsNumber: true })}
        />
        {errors.validityDays && (
          <p className="text-xs text-destructive">
            {errors.validityDays.message}
          </p>
        )}
      </div>

      {/* Module Multi-Select */}
      <div className="space-y-1.5">
        <Label>Modul yang Dipersyaratkan</Label>

        <Controller
          name="moduleIds"
          control={control}
          render={({ field }) => {
            const selected = (field.value as string[]) ?? [];

            const toggleModule = (moduleId: string) => {
              const next = selected.includes(moduleId)
                ? selected.filter((id) => id !== moduleId)
                : [...selected, moduleId];
              field.onChange(next);
            };

            const removeModule = (moduleId: string) => {
              field.onChange(selected.filter((id) => id !== moduleId));
            };

            return (
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between bg-muted/50 border-none font-normal"
                      disabled={modulesLoading}
                    >
                      {modulesLoading ? (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Memuat modul...
                        </span>
                      ) : selected.length > 0 ? (
                        <span className="text-foreground">
                          {selected.length} modul dipilih
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Pilih modul...
                        </span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Cari modul..." />
                      <CommandList>
                        <CommandEmpty>Tidak ada modul ditemukan.</CommandEmpty>
                        <CommandGroup>
                          {availableModules.map((mod) => (
                            <CommandItem
                              key={mod.id}
                              value={mod.title}
                              onSelect={() => toggleModule(mod.id)}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selected.includes(mod.id)
                                    ? 'opacity-100'
                                    : 'opacity-0',
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{mod.title}</span>
                                {mod.description && (
                                  <span className="text-xs text-muted-foreground line-clamp-1">
                                    {mod.description}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Selected module badges */}
                {selected.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.map((moduleId) => {
                      const mod = availableModules.find(
                        (m) => m.id === moduleId,
                      );
                      return (
                        <Badge
                          key={moduleId}
                          variant="secondary"
                          className="gap-1 pr-1 text-xs"
                        >
                          {mod?.title ?? moduleId}
                          <button
                            type="button"
                            onClick={() => removeModule(moduleId)}
                            className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }}
        />

        {errors.moduleIds && (
          <p className="text-xs text-destructive">
            {(errors.moduleIds as any).message}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isPending}
          >
            Batal
          </Button>
        )}
        <Button
          type="submit"
          className="shadow-lg shadow-primary/20"
          disabled={isPending}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Menyimpan...
            </span>
          ) : isEditMode ? (
            'Simpan Perubahan'
          ) : (
            'Buat Program'
          )}
        </Button>
      </div>
    </form>
  );
}
