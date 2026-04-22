'use client';

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  usePtwList,
  usePtw,
  useCreatePtw,
  useSubmitPtw,
  parseServerValidationErrors,
  CreatePtwData,
} from './query';
import { ptwService } from '@/lib/services/ptw';
import { toast } from 'sonner';

// Mock the ptwService
jest.mock('@/lib/services/ptw', () => ({
  ptwService: {
    getPtwList: jest.fn(),
    getPtwById: jest.fn(),
    createPtw: jest.fn(),
    submitPtw: jest.fn(),
  },
}));

// Mock Sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Create a wrapper for React Query hooks
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('PTW Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('usePtwList', () => {
    const mockPtwList = [
      {
        id: 'ptw-1',
        noPtw: 'PTW-001',
        judulPekerjaan: 'Pekerjaan Las',
        lokasiPekerjaan: 'Area A',
        tanggalMulai: '2024-01-15',
        tanggalSelesai: '2024-01-20',
        approvalStatus: 'PENDING',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        creator: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
        jsaProject: {
          id: 'jsa-1',
          noJsa: 'JSA-001',
          jenisKegiatan: 'Pekerjaan Las',
          approvalStatus: 'APPROVED',
        },
        versions: [],
      },
    ];

    it('should fetch PTW list successfully', async () => {
      (ptwService.getPtwList as jest.Mock).mockResolvedValue(mockPtwList);

      const { result } = renderHook(() => usePtwList(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockPtwList);
      });
    });

    it('should handle error when fetching list fails', async () => {
      const error = new Error('Network Error');
      (ptwService.getPtwList as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => usePtwList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(error);
      });
    });
  });

  describe('usePtw', () => {
    const mockPtwDetail = {
      id: 'ptw-1',
      noPtw: 'PTW-001',
      judulPekerjaan: 'Pekerjaan Las',
      lokasiPekerjaan: 'Area A',
      tanggalMulai: '2024-01-15',
      tanggalSelesai: '2024-01-20',
      approvalStatus: 'PENDING',
      createdBy: 'user-1',
      keteranganTambahan: 'Harap gunakan APD lengkap',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      creator: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
      jsaProject: {
        id: 'jsa-1',
        noJsa: 'JSA-001',
        jenisKegiatan: 'Pekerjaan Las',
        approvalStatus: 'APPROVED',
      },
      versions: [],
    };

    it('should fetch PTW detail successfully', async () => {
      (ptwService.getPtwById as jest.Mock).mockResolvedValue(mockPtwDetail);

      const { result } = renderHook(() => usePtw('ptw-1'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockPtwDetail);
      });
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => usePtw(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(ptwService.getPtwById).not.toHaveBeenCalled();
    });

    it('should handle error when fetching detail fails', async () => {
      const error = new Error('Network Error');
      (ptwService.getPtwById as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => usePtw('ptw-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(error);
      });
    });
  });

  describe('useCreatePtw', () => {
    const mockPtwDetail = {
      id: 'ptw-1',
      noPtw: 'PTW-001',
      judulPekerjaan: 'Pekerjaan Las',
      lokasiPekerjaan: 'Area A',
      tanggalMulai: '2024-01-15',
      tanggalSelesai: '2024-01-20',
      approvalStatus: 'PENDING',
      createdBy: 'user-1',
      keteranganTambahan: null,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      creator: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
      jsaProject: {
        id: 'jsa-1',
        noJsa: 'JSA-001',
        jenisKegiatan: 'Pekerjaan Las',
        approvalStatus: 'APPROVED',
      },
      versions: [],
    };

    it('should create PTW successfully', async () => {
      (ptwService.createPtw as jest.Mock).mockResolvedValue(mockPtwDetail);

      const { result } = renderHook(() => useCreatePtw(), {
        wrapper: createWrapper(),
      });

      const createData: CreatePtwData = {
        judulPekerjaan: 'Pekerjaan Las',
        jsaProjectId: 'jsa-1',
        lokasiPekerjaan: 'Area A',
      };

      result.current.mutate(createData);

      await waitFor(() => {
        expect(ptwService.createPtw).toHaveBeenCalledWith(createData);
        expect(toast.success).toHaveBeenCalledWith('PTW berhasil dibuat');
      });
    });

    it('should handle validation error (403)', async () => {
      const error = {
        response: {
          status: 403,
          data: { message: 'Sertifikasi vendor tidak aktif' },
        },
      };
      (ptwService.createPtw as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useCreatePtw(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ judulPekerjaan: 'Test', jsaProjectId: 'jsa-1' });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Sertifikasi vendor tidak aktif');
      });
    });

    it('should handle generic error', async () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Gagal membuat PTW' },
        },
      };
      (ptwService.createPtw as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useCreatePtw(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ judulPekerjaan: 'Test', jsaProjectId: 'jsa-1' });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Gagal membuat PTW');
      });
    });
  });

  describe('useSubmitPtw', () => {
    it('should submit PTW successfully', async () => {
      (ptwService.submitPtw as jest.Mock).mockResolvedValue({ approvalStatus: 'SUBMITTED' });

      const { result } = renderHook(() => useSubmitPtw('ptw-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate();

      await waitFor(() => {
        expect(ptwService.submitPtw).toHaveBeenCalledWith('ptw-1');
        expect(toast.success).toHaveBeenCalledWith('PTW berhasil diajukan untuk approval');
      });
    });

    it('should handle submit error', async () => {
      const error = {
        response: {
          data: { message: 'Gagal mengajukan PTW' },
        },
      };
      (ptwService.submitPtw as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useSubmitPtw('ptw-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Gagal mengajukan PTW');
      });
    });
  });

  describe('parseServerValidationErrors', () => {
    it('should parse array of error messages', () => {
      const error = {
        response: {
          data: {
            errors: ['judulPekerjaan must be at least 3 characters', 'jsaProjectId is required'],
          },
        },
      };

      const result = parseServerValidationErrors(error);

      expect(result.judulPekerjaan?.message).toBe('judulPekerjaan must be at least 3 characters');
      expect(result.jsaProjectId?.message).toBe('jsaProjectId is required');
    });

    it('should parse object of error messages', () => {
      const error = {
        response: {
          data: {
            errors: {
              judulPekerjaan: ['must not be empty'],
              lokasiPekerjaan: ['is too short'],
            },
          },
        },
      };

      const result = parseServerValidationErrors(error);

      expect(result.judulPekerjaan?.message).toBe('must not be empty');
      expect(result.lokasiPekerjaan?.message).toBe('is too short');
    });

    it('should return empty object for errors without response', () => {
      const error = new Error('Network Error');

      const result = parseServerValidationErrors(error);

      expect(result).toEqual({});
    });

    it('should return empty object for undefined errors', () => {
      const result = parseServerValidationErrors(undefined);

      expect(result).toEqual({});
    });
  });
});