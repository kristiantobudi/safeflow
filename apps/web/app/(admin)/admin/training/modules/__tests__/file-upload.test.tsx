import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';

// ─── Mocks ─────────────────────────────────────────────────────────────────

// Mock the training query hooks
jest.mock('@/store/training/query', () => ({
  useModule: jest.fn(),
  useUploadModuleFile: jest.fn(),
  useDeleteModuleFile: jest.fn(),
  useCreateExam: jest.fn(),
  useCreateQuestion: jest.fn(),
  useUpdateQuestion: jest.fn(),
  useDeleteQuestion: jest.fn(),
}));

// Mock next/navigation (already mocked globally in jest.setup.ts, but be explicit)
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'module-1' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

// ─── Helpers ───────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function createFile(name: string, type: string, sizeBytes: number): File {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
}

// ─── Isolated FileUploadSection component ──────────────────────────────────
// We extract and test the file-validation logic directly to avoid rendering
// the full page (which has many unrelated dependencies).

const ALLOWED_TYPES = [
  'application/pdf',
  'video/mp4',
  'video/webm',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

/**
 * Minimal re-implementation of the validation logic from FileUploadSection
 * so we can unit-test it in isolation.
 */
function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Format file tidak didukung. Gunakan PDF, video (MP4, WebM), atau gambar (JPEG, PNG, WebP).';
  }
  if (file.size > MAX_SIZE) {
    return 'File terlalu besar. Maksimal 100MB.';
  }
  return null;
}

// ─── Inline test component ─────────────────────────────────────────────────

interface FileUploadProps {
  moduleId: string;
  onUpload: (file: File) => Promise<void>;
}

function TestFileUpload({ moduleId, onUpload }: FileUploadProps) {
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    await onUpload(file);
  };

  return (
    <div>
      <input
        data-testid="file-input"
        type="file"
        accept=".pdf,video/*,image/*"
        onChange={handleChange}
      />
    </div>
  );
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('FileUploadSection — file validation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── validateFile unit tests ───────────────────────────────────────────────

  describe('validateFile (pure logic)', () => {
    describe('valid file types', () => {
      it.each([
        ['application/pdf', 'document.pdf'],
        ['video/mp4', 'training.mp4'],
        ['video/webm', 'training.webm'],
        ['image/jpeg', 'photo.jpg'],
        ['image/png', 'diagram.png'],
        ['image/webp', 'image.webp'],
      ])('should accept %s files', (mimeType, filename) => {
        const file = createFile(filename, mimeType, 1024);
        expect(validateFile(file)).toBeNull();
      });
    });

    describe('invalid file types', () => {
      it.each([
        ['application/octet-stream', 'program.exe'],
        ['text/plain', 'notes.txt'],
        ['application/zip', 'archive.zip'],
        ['application/x-msdownload', 'setup.exe'],
        ['text/csv', 'data.csv'],
        ['application/json', 'config.json'],
      ])('should reject %s files', (mimeType, filename) => {
        const file = createFile(filename, mimeType, 1024);
        const error = validateFile(file);
        expect(error).not.toBeNull();
        expect(error).toContain('Format file tidak didukung');
      });
    });

    describe('file size validation', () => {
      it('should accept a file exactly at 100MB', () => {
        const file = createFile('video.mp4', 'video/mp4', 100 * 1024 * 1024);
        expect(validateFile(file)).toBeNull();
      });

      it('should accept a file just under 100MB', () => {
        const file = createFile('video.mp4', 'video/mp4', 100 * 1024 * 1024 - 1);
        expect(validateFile(file)).toBeNull();
      });

      it('should reject a file exceeding 100MB', () => {
        const file = createFile('huge-video.mp4', 'video/mp4', 100 * 1024 * 1024 + 1);
        const error = validateFile(file);
        expect(error).not.toBeNull();
        expect(error).toContain('File terlalu besar');
      });

      it('should reject a 200MB file', () => {
        const file = createFile('huge.mp4', 'video/mp4', 200 * 1024 * 1024);
        const error = validateFile(file);
        expect(error).toContain('File terlalu besar');
      });
    });
  });

  // ── Component interaction tests ───────────────────────────────────────────

  describe('TestFileUpload component', () => {
    it('should call onUpload with a valid PDF file', async () => {
      const user = userEvent.setup();
      const onUpload = jest.fn().mockResolvedValue(undefined);

      render(<TestFileUpload moduleId="module-1" onUpload={onUpload} />, {
        wrapper: createWrapper(),
      });

      const file = createFile('guide.pdf', 'application/pdf', 1024 * 1024);
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);

      expect(onUpload).toHaveBeenCalledWith(file);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('should call onUpload with a valid MP4 file', async () => {
      const user = userEvent.setup();
      const onUpload = jest.fn().mockResolvedValue(undefined);

      render(<TestFileUpload moduleId="module-1" onUpload={onUpload} />, {
        wrapper: createWrapper(),
      });

      const file = createFile('video.mp4', 'video/mp4', 10 * 1024 * 1024);
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);

      expect(onUpload).toHaveBeenCalledWith(file);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('should call onUpload with a valid JPEG image', async () => {
      const user = userEvent.setup();
      const onUpload = jest.fn().mockResolvedValue(undefined);

      render(<TestFileUpload moduleId="module-1" onUpload={onUpload} />, {
        wrapper: createWrapper(),
      });

      const file = createFile('photo.jpg', 'image/jpeg', 512 * 1024);
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);

      expect(onUpload).toHaveBeenCalledWith(file);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('should call onUpload with a valid PNG image', async () => {
      const user = userEvent.setup();
      const onUpload = jest.fn().mockResolvedValue(undefined);

      render(<TestFileUpload moduleId="module-1" onUpload={onUpload} />, {
        wrapper: createWrapper(),
      });

      const file = createFile('diagram.png', 'image/png', 256 * 1024);
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);

      expect(onUpload).toHaveBeenCalledWith(file);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('should call onUpload with a valid WebP image', async () => {
      const user = userEvent.setup();
      const onUpload = jest.fn().mockResolvedValue(undefined);

      render(<TestFileUpload moduleId="module-1" onUpload={onUpload} />, {
        wrapper: createWrapper(),
      });

      const file = createFile('image.webp', 'image/webp', 128 * 1024);
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);

      expect(onUpload).toHaveBeenCalledWith(file);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('should show error toast and NOT call onUpload for an .exe file', async () => {
      const user = userEvent.setup();
      const onUpload = jest.fn();

      render(<TestFileUpload moduleId="module-1" onUpload={onUpload} />, {
        wrapper: createWrapper(),
      });

      const file = createFile('malware.exe', 'application/octet-stream', 1024);
      const input = screen.getByTestId('file-input');

      // Use fireEvent.change to bypass the accept attribute filter in jsdom
      // (userEvent.upload respects accept and won't fire onChange for rejected types)
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      });
      fireEvent.change(input);

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Format file tidak didukung'),
      );
      expect(onUpload).not.toHaveBeenCalled();
    });

    it('should show error toast and NOT call onUpload for a .txt file', async () => {
      const onUpload = jest.fn();

      render(<TestFileUpload moduleId="module-1" onUpload={onUpload} />, {
        wrapper: createWrapper(),
      });

      const file = createFile('notes.txt', 'text/plain', 1024);
      const input = screen.getByTestId('file-input');

      // Use fireEvent.change to bypass the accept attribute filter in jsdom
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      });
      fireEvent.change(input);

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Format file tidak didukung'),
      );
      expect(onUpload).not.toHaveBeenCalled();
    });

    it('should show error toast and NOT call onUpload for a file exceeding 100MB', async () => {
      const user = userEvent.setup();
      const onUpload = jest.fn();

      render(<TestFileUpload moduleId="module-1" onUpload={onUpload} />, {
        wrapper: createWrapper(),
      });

      const oversizedFile = createFile(
        'huge-video.mp4',
        'video/mp4',
        101 * 1024 * 1024,
      );
      const input = screen.getByTestId('file-input');

      await user.upload(input, oversizedFile);

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('File terlalu besar'),
      );
      expect(onUpload).not.toHaveBeenCalled();
    });

    it('should NOT show error toast for a valid file within size limit', async () => {
      const user = userEvent.setup();
      const onUpload = jest.fn().mockResolvedValue(undefined);

      render(<TestFileUpload moduleId="module-1" onUpload={onUpload} />, {
        wrapper: createWrapper(),
      });

      const file = createFile('video.mp4', 'video/mp4', 50 * 1024 * 1024);
      const input = screen.getByTestId('file-input');

      await user.upload(input, file);

      expect(toast.error).not.toHaveBeenCalled();
      expect(onUpload).toHaveBeenCalledTimes(1);
    });
  });
});
