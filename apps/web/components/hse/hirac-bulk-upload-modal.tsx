'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@repo/ui/components/ui/dialog';
import { Button } from '@repo/ui/components/ui/button';
import { FileUp, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { useUploadHiracMutation } from '@/store/project-hirac/query';
import { projectHiracService } from '@/lib/services/project-hirac';

interface HiracBulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function HiracBulkUploadModal({
  open,
  onOpenChange,
  projectId,
}: HiracBulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const uploadMutation = useUploadHiracMutation(projectId);

  const handleDownloadTemplate = () => {
    projectHiracService.downloadHiracTemplate(projectId);
  };

  const handleUpload = () => {
    if (file) {
      uploadMutation.mutate(file, {
        onSuccess: () => {
          onOpenChange(false);
          setFile(null);
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Bulk Upload HIRAC
          </DialogTitle>
          <DialogDescription>
            Registrasi HIRAC secara massal menggunakan file Excel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-4">
            <Download className="h-6 w-10 text-primary mt-1" />
            <div className="space-y-1">
              <p className="font-semibold text-sm">Download Template</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Gunakan template resmi kami untuk memastikan format data sesuai
                dengan sistem.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 h-8 text-xs bg-card"
                onClick={handleDownloadTemplate}
              >
                Unduh .xlsx
              </Button>
            </div>
          </div>

          <div
            className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-colors ${
              file
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-muted-foreground/20 hover:border-primary/50'
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const droppedFile = e.dataTransfer.files[0];
              if (droppedFile?.name.endsWith('.xlsx')) {
                setFile(droppedFile);
              }
            }}
          >
            {file ? (
              <>
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                <div className="text-center">
                  <p className="font-semibold text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-destructive"
                  onClick={() => setFile(null)}
                >
                  Ganti File
                </Button>
              </>
            ) : (
              <>
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <FileUp className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm">
                    Klik untuk upload atau drag & drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hanya file .xlsx yang didukung
                  </p>
                </div>
                <label className="absolute inset-0 cursor-pointer opacity-0">
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0];
                      if (selectedFile) setFile(selectedFile);
                    }}
                  />
                </label>
              </>
            )}
          </div>

          {uploadMutation.isError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="h-4 w-4" />
              <span>
                Gagal memproses file. Pastikan format kolom sesuai template.
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button
              className="shadow-lg shadow-primary/20 bg-primary h-10 px-8"
              disabled={!file || uploadMutation.isPending}
              onClick={handleUpload}
            >
              {uploadMutation.isPending ? 'Memproses...' : 'Upload Data'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
