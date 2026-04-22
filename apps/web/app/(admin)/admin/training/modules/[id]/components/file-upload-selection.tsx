import { formatDateTime } from '@/helper/format-date-helper';
import { ModuleDetail } from '@/lib/types/training-types';
import {
  useDeleteModuleFile,
  useUploadModuleFile,
} from '@/store/training/query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@repo/ui/components/ui/alert-dialog';
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import { Card } from '@repo/ui/components/ui/card';
import { Separator } from '@repo/ui/components/ui/separator';
import { FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function FileUploadSection({
  moduleId,
  files,
}: {
  moduleId: string;
  files: ModuleDetail['files'];
}) {
  const [isUploading, setIsUploading] = useState(false);
  const uploadFile = useUploadModuleFile(moduleId);
  const deleteFile = useDeleteModuleFile(moduleId);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'video/mp4',
      'video/webm',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error(
        'Format file tidak didukung. Gunakan PDF, video (MP4, WebM), atau gambar (JPEG, PNG, WebP).',
      );
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File terlalu besar. Maksimal 100MB.');
      return;
    }

    setIsUploading(true);
    try {
      await uploadFile.mutateAsync(file);
      e.target.value = '';
    } catch (error) {
      // Error handled by hook
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="p-8 border-none shadow-xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">File Materi</h2>
        </div>
        <Badge variant="outline" className="font-medium">
          {files?.length || 0} File
        </Badge>
      </div>
      <Separator />
      <div className="space-y-3">
        {files && files.length > 0 ? (
          files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-muted hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-medium text-sm max-w-[200px] truncate">
                    {file.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Diunggah {formatDateTime(file.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <a href={file.url} target="_blank" rel="noopener noreferrer">
                    Unduh
                  </a>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus File</AlertDialogTitle>
                      <AlertDialogDescription>
                        Apakah Anda yakin ingin menghapus file &quot;
                        {file.filename}&quot;? Tindakan ini tidak dapat
                        dibatalkan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteFile.mutate(file.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-xl border-2 border-dashed border-muted">
            <FileText className="h-10 w-10 text-muted/40 mb-3" />
            <p className="text-sm italic text-muted-foreground/60">
              Belum ada file materi untuk modul ini.
            </p>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <div className="relative">
          <input
            type="file"
            id="file-upload"
            accept=".pdf,video/*,image/*"
            onChange={handleFileChange}
            disabled={isUploading}
            className="sr-only"
          />
          <Button
            variant="outline"
            className="gap-2"
            disabled={isUploading}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload Materi
          </Button>
        </div>
      </div>
    </Card>
  );
}
