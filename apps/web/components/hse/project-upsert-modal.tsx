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
import { Calendar } from '@repo/ui/components/ui/calendar';
import { useCreateProjectMutation } from '@/store/project-hirac/query';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/ui/components/ui/popover';
import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';

interface ProjectUpsertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectUpsertModal({
  open,
  onOpenChange,
}: ProjectUpsertModalProps) {
  const [date, setDate] = useState<Date>();
  const { register, handleSubmit, reset, setValue } = useForm();
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
          <div className="space-y-2 flex flex-col">
            <Label htmlFor="tanggal">Tanggal Pelaksanaan</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full justify-start text-left font-normal bg-muted/50 border-none h-10',
                    !date && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Pilih tanggal</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 rounded-2xl border-none shadow-2xl"
                align="start"
              >
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d);
                    if (d) {
                      setValue('tanggal', format(d, 'yyyy-MM-dd'));
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
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
