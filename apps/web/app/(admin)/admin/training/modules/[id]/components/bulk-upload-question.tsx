import {
  useBulkUploadQuestions,
  useDownloadQuestionTemplate,
} from '@/store/training/query';
import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/ui/dialog';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function BulkUploadQuestionDialog({
  examId,
}: {
  examId: string;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const bulkUpload = useBulkUploadQuestions(examId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (
      selectedFile.type !==
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      toast.error('Format file harus .xlsx');
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      await bulkUpload.mutateAsync(file);
      setOpen(false);
      setFile(null);
    } catch (error) {
      // Error handled by hook
    }
  };

  const downloadTemplateMutation = useDownloadQuestionTemplate();

  const downloadTemplate = () => {
    downloadTemplateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Soal dari Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex flex-col gap-2">
            <Label>Format Excel</Label>
            <p className="text-sm text-muted-foreground">
              Gunakan format kolom:{' '}
              <code className="bg-muted px-1 rounded">
                Soal, Opsi A, Opsi B, Opsi C, Opsi D, Jawaban Benar
              </code>
            </p>
            <Button
              variant="link"
              size="sm"
              className="w-fit p-0 gap-1 h-auto text-primary"
              onClick={downloadTemplate}
              disabled={downloadTemplateMutation.isPending}
            >
              <Download className="h-3 w-3" />
              Download Template (.xlsx)
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-file">Pilih File Excel (.xlsx)</Label>
            <Input
              id="bulk-file"
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
            />
            {file && (
              <p className="text-xs text-primary font-medium">
                File terpilih: {file.name}
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="sm:justify-end mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!file || bulkUpload.isPending}
          >
            {bulkUpload.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Import Sekarang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
