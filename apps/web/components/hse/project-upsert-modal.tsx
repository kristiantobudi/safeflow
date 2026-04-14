'use client';

import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { useCreateProjectMutation } from '@/store/project-hirac/query';

interface ProjectUpsertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectUpsertModal({
  open,
  onOpenChange,
}: ProjectUpsertModalProps) {
  const { register, handleSubmit, reset } = useForm();
  const createMutation = useCreateProjectMutation();

  const onSubmit = (data: any) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        onOpenChange(false);
        reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card/95 backdrop-blur-xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Tambah Project Baru
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="unitKerja">Unit Kerja</Label>
            <Input
              id="unitKerja"
              placeholder="Contoh: Operation Departement"
              className="bg-muted/50 border-none"
              {...register('unitKerja', { required: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lokasiKerja">Lokasi Kerja</Label>
            <Input
              id="lokasiKerja"
              placeholder="Contoh: Main Site Area"
              className="bg-muted/50 border-none"
              {...register('lokasiKerja', { required: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tanggal">Tanggal Pelaksanaan</Label>
            <Input
              id="tanggal"
              type="date"
              className="bg-muted/50 border-none"
              {...register('tanggal', { required: true })}
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
              {createMutation.isPending ? 'Menyimpan...' : 'Buat Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
