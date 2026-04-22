'use client';

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useJsaList,
  useJsa,
  useCreateJsa,
  useSubmitJsa,
  parseServerValidationErrors,
  CreateJsaData,
} from './query';
import { jsaService } from '@/lib/services/jsa';
import { toast } from 'sonner';

// Mock the jsaService
jest.mock('@/lib/services/jsa', () => ({
  jsaService: {
    getJsaList: jest.fn(),
    getJsaById: jest.fn(),
    createJsa: jest.fn(),
    submitJsa: jest.fn(),
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

describe('JSA Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useJsaList', () => {
    const mockJsaList = [
      {
        id: 'jsa-1',
        noJsa: 'JSA-001',
        jenisKegiatan: 'Pekerjaan Las',
        lokasiKegiatan: 'Area A',
        tanggalDibuat: '2024-01-15',
        revisiKe: 0,
        approvalStatus: 'PENDING',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        creator: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
        versions: [],
      },
    ];

    it('should fetch JSA list successfully', async () => {
      (jsaService.getJsaList as jest.Mock).mockResolvedValue(mockJsaList);

      const { result } = renderHook(() => useJsaList(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockJsaList);
      });
    });

    it('should handle error when fetching list fails', async () => {
      const error = new Error('Network Error');
      (jsaService.getJsaList as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useJsaList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(error);
      });
    });
  });

  describe('useJsa', () => {
    const mockJsaDetail = {
      id: 'jsa-1',
      noJsa: 'JSA-001',
      jenisKegiatan: 'Pekerjaan Las',
      lokasiKegiatan: 'Area A',
      tanggalDibuat: '2024-01-15',
      pelaksanaUtama: 'John Doe',
      hseInCharge: 'Jane Smith',
      referensiHirarc: 'HIRAC-001',
      revisiKe: 0,
      approvalStatus: 'PENDING',
      createdBy: 'user-1',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      creator: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
      apd: {
        id: 'apd-1',
        safetyHelmet: true,
        safetyShoes: true,
        gloves: false,
        safetyGlasses: false,
        safetyVest: true,
        safetyBodyHarness: false,
        others: null,
        jsaProjectId: 'jsa-1',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      },
      versions: [],
    };

    it('should fetch JSA detail successfully', async () => {
      (jsaService.getJsaById as jest.Mock).mockResolvedValue(mockJsaDetail);

      const { result } = renderHook(() => useJsa('jsa-1'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockJsaDetail);
      });
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useJsa(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(jsaService.getJsaById).not.toHaveBeenCalled();
    });

    it('should handle error when fetching detail fails', async () => {
      const error = new Error('Network Error');
      (jsaService.getJsaById as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useJsa('jsa-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(error);
      });
    });
  });

  describe('useCreateJsa', () => {
    const mockJsaDetail = {
      id: 'jsa-1',
      noJsa: 'JSA-001',
      jenisKegiatan: 'Pekerjaan Las',
      lokasiKegiatan: 'Area A',
      tanggalDibuat: '2024-01-15',
      pelaksanaUtama: 'John Doe',
      hseInCharge: 'Jane Smith',
      referensiHirarc: 'HIRAC-001',
      revisiKe: 0,
      approvalStatus: 'PENDING',
      createdBy: 'user-1',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      creator: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
      apd: null,
      versions: [],
    };

    it('should create JSA successfully', async () => {
      (jsaService.createJsa as jest.Mock).mockResolvedValue(mockJsaDetail);

      const { result } = renderHook(() => useCreateJsa(), {
        wrapper: createWrapper(),
      });

      const createData: CreateJsaData = {
        jenisKegiatan: 'Pekerjaan Las',
        lokasiKegiatan: 'Area A',
      };

      result.current.mutate(createData);

      await waitFor(() => {
        expect(jsaService.createJsa).toHaveBeenCalledWith(createData);
        expect(toast.success).toHaveBeenCalledWith('JSA berhasil dibuat');
      });
    });

    it('should handle validation error (403)', async () => {
      const error = {
        response: {
          status: 403,
          data: { message: 'Sertifikasi vendor tidak aktif' },
        },
      };
      (jsaService.createJsa as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateJsa(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ jenisKegiatan: 'Test' });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Sertifikasi vendor tidak aktif');
      });
    });

    it('should handle generic error', async () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Gagal membuat JSA' },
        },
      };
      (jsaService.createJsa as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateJsa(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ jenisKegiatan: 'Test' });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Gagal membuat JSA');
      });
    });
  });

  describe('useSubmitJsa', () => {
    it('should submit JSA successfully', async () => {
      (jsaService.submitJsa as jest.Mock).mockResolvedValue({ approvalStatus: 'SUBMITTED' });

      const { result } = renderHook(() => useSubmitJsa('jsa-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate();

      await waitFor(() => {
        expect(jsaService.submitJsa).toHaveBeenCalledWith('jsa-1');
        expect(toast.success).toHaveBeenCalledWith('JSA berhasil diajukan untuk approval');
      });
    });

    it('should handle submit error', async () => {
      const error = {
        response: {
          data: { message: 'Gagal mengajukan JSA' },
        },
      };
      (jsaService.submitJsa as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useSubmitJsa('jsa-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Gagal mengajukan JSA');
      });
    });
  });

  describe('parseServerValidationErrors', () => {
    it('should parse array of error messages', () => {
      const error = {
        response: {
          data: {
            errors: ['jenisKegiatan must be at least 3 characters', 'lokasiKegiatan is required'],
          },
        },
      };

      const result = parseServerValidationErrors(error);

      expect(result.jenisKegiatan?.message).toBe('jenisKegiatan must be at least 3 characters');
      expect(result.lokasiKegiatan?.message).toBe('lokasiKegiatan is required');
    });

    it('should parse object of error messages', () => {
      const error = {
        response: {
          data: {
            errors: {
              jenisKegiatan: ['must not be empty'],
              lokasiKegiatan: ['is too short'],
            },
          },
        },
      };

      const result = parseServerValidationErrors(error);

      expect(result.jenisKegiatan?.message).toBe('must not be empty');
      expect(result.lokasiKegiatan?.message).toBe('is too short');
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