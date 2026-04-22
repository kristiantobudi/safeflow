'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CSSProperties } from 'react';
import {
  vendorCertificationService,
  CreateCertificationProgramData,
  UpdateCertificationProgramData,
  AssignVendorProgramData,
  RevokeCertificationData,
} from '@/lib/services/vendor-certification';

// ─── Query Key Factory ────────────────────────────────────────────────────────

export const vendorCertificationKeys = {
  all: ['vendor-certification'] as const,
  programs: () => [...vendorCertificationKeys.all, 'programs'] as const,
  programLists: (page?: number, limit?: number, search?: string) =>
    [...vendorCertificationKeys.programs(), 'list', { page, limit, search }] as const,
  programDetail: (id: string) =>
    [...vendorCertificationKeys.programs(), 'detail', id] as const,
  vendorStatus: (vendorId: string) =>
    [...vendorCertificationKeys.all, 'vendor-status', vendorId] as const,
  availableModules: () =>
    [...vendorCertificationKeys.all, 'available-modules'] as const,
  myProgram: () =>
    [...vendorCertificationKeys.all, 'my-program'] as const,
};

// ─── Toast Styles ─────────────────────────────────────────────────────────────

const successStyle: CSSProperties = {
  '--normal-bg': 'color-mix(in oklab, #22c55e 10%, var(--background))',
  '--normal-text': '#22c55e',
  '--normal-border': '#22c55e',
} as CSSProperties;

const errorStyle: CSSProperties = {
  '--normal-bg': 'color-mix(in oklab, #ef4444 10%, var(--background))',
  '--normal-text': '#ef4444',
  '--normal-border': '#ef4444',
} as CSSProperties;

// ─── Query Hooks ──────────────────────────────────────────────────────────────

/**
 * Fetch all available training modules for use in program forms.
 */
export function useAvailableModules() {
  return useQuery({
    queryKey: vendorCertificationKeys.availableModules(),
    queryFn: () => vendorCertificationService.getAvailableModules(),
    staleTime: 5 * 60_000, // 5 minutes
  });
}

/**
 * Fetch paginated list of certification programs.
 */
export function useCertificationPrograms(
  page = 1,
  limit = 10,
  search?: string,
) {
  return useQuery({
    queryKey: vendorCertificationKeys.programLists(page, limit, search),
    queryFn: () =>
      vendorCertificationService.getCertificationPrograms(page, limit, search),
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
  });
}

/**
 * Fetch a single certification program by ID.
 */
export function useCertificationProgramById(id: string) {
  return useQuery({
    queryKey: vendorCertificationKeys.programDetail(id),
    queryFn: () => vendorCertificationService.getCertificationProgramById(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

/**
 * Fetch certification status for a specific vendor.
 */
export function useVendorCertificationStatus(vendorId: string) {
  return useQuery({
    queryKey: vendorCertificationKeys.vendorStatus(vendorId),
    queryFn: () =>
      vendorCertificationService.getVendorCertificationStatus(vendorId),
    enabled: !!vendorId,
    staleTime: 60_000,
  });
}

/**
 * Fetch the certification program and module progress for the currently
 * authenticated vendor user (GET /api/v1/vendors/my-program).
 * Does not require a vendorId — resolved server-side from the JWT.
 */
export function useMyProgram() {
  return useQuery({
    queryKey: vendorCertificationKeys.myProgram(),
    queryFn: () => vendorCertificationService.getMyProgram(),
    staleTime: 60_000,
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

/**
 * Create a new certification program (admin only).
 */
export function useCreateCertificationProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCertificationProgramData) =>
      vendorCertificationService.createCertificationProgram(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: vendorCertificationKeys.programs(),
      });
      toast('Berhasil', {
        style: successStyle,
        description: 'Program sertifikasi berhasil dibuat',
        duration: 5000,
        closeButton: true,
      });
    },
    onError: (error: any) => {
      toast('Gagal', {
        style: errorStyle,
        description:
          error.response?.data?.message ||
          'Gagal membuat program sertifikasi',
        duration: 5000,
        closeButton: true,
      });
    },
  });
}

/**
 * Update an existing certification program (admin only).
 */
export function useUpdateCertificationProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateCertificationProgramData;
    }) => vendorCertificationService.updateCertificationProgram(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: vendorCertificationKeys.programs(),
      });
      queryClient.invalidateQueries({
        queryKey: vendorCertificationKeys.programDetail(variables.id),
      });
      toast('Berhasil', {
        style: successStyle,
        description: 'Program sertifikasi berhasil diperbarui',
        duration: 5000,
        closeButton: true,
      });
    },
    onError: (error: any) => {
      toast('Gagal', {
        style: errorStyle,
        description:
          error.response?.data?.message ||
          'Gagal memperbarui program sertifikasi',
        duration: 5000,
        closeButton: true,
      });
    },
  });
}

/**
 * Soft-delete a certification program (admin only).
 */
export function useDeleteCertificationProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      vendorCertificationService.deleteCertificationProgram(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: vendorCertificationKeys.programs(),
      });
      toast('Berhasil', {
        style: successStyle,
        description: 'Program sertifikasi berhasil dihapus',
        duration: 5000,
        closeButton: true,
      });
    },
    onError: (error: any) => {
      toast('Gagal', {
        style: errorStyle,
        description:
          error.response?.data?.message ||
          'Gagal menghapus program sertifikasi',
        duration: 5000,
        closeButton: true,
      });
    },
  });
}

/**
 * Assign (replace) modules for a certification program (admin only).
 */
export function useAssignModulesToProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, moduleIds }: { id: string; moduleIds: string[] }) =>
      vendorCertificationService.assignModulesToProgram(id, moduleIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: vendorCertificationKeys.programDetail(variables.id),
      });
      toast('Berhasil', {
        style: successStyle,
        description: 'Modul program berhasil diperbarui',
        duration: 5000,
        closeButton: true,
      });
    },
    onError: (error: any) => {
      toast('Gagal', {
        style: errorStyle,
        description:
          error.response?.data?.message || 'Gagal memperbarui modul program',
        duration: 5000,
        closeButton: true,
      });
    },
  });
}

/**
 * Assign a certification program to a vendor (admin only).
 */
export function useAssignVendorToProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      vendorId,
      data,
    }: {
      vendorId: string;
      data: AssignVendorProgramData;
    }) => vendorCertificationService.assignVendorToProgram(vendorId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: vendorCertificationKeys.vendorStatus(variables.vendorId),
      });
      toast('Berhasil', {
        style: successStyle,
        description: 'Program sertifikasi berhasil di-assign ke vendor',
        duration: 5000,
        closeButton: true,
      });
    },
    onError: (error: any) => {
      toast('Gagal', {
        style: errorStyle,
        description:
          error.response?.data?.message ||
          'Gagal assign program ke vendor',
        duration: 5000,
        closeButton: true,
      });
    },
  });
}

/**
 * Trigger checkAndIssueCertification for a vendor.
 * Called after a vendor completes all required modules.
 */
export function useCheckAndIssueCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vendorId: string) =>
      vendorCertificationService.checkAndIssueCertification(vendorId),
    onSuccess: (data, vendorId) => {
      queryClient.invalidateQueries({
        queryKey: vendorCertificationKeys.vendorStatus(vendorId),
      });
      const certified = data?.data?.certified ?? data?.certified;
      if (certified) {
        toast('Sertifikasi Diterbitkan', {
          style: successStyle,
          description: 'Selamat! Sertifikasi vendor berhasil diterbitkan.',
          duration: 5000,
          closeButton: true,
        });
      } else {
        toast('Belum Memenuhi Syarat', {
          style: {
            '--normal-bg': 'color-mix(in oklab, #f59e0b 10%, var(--background))',
            '--normal-text': '#f59e0b',
            '--normal-border': '#f59e0b',
          } as CSSProperties,
          description:
            'Masih ada modul yang belum diselesaikan. Selesaikan semua modul wajib terlebih dahulu.',
          duration: 6000,
          closeButton: true,
        });
      }
    },
    onError: (error: any) => {
      toast('Gagal', {
        style: errorStyle,
        description:
          error.response?.data?.message ||
          'Gagal memeriksa status sertifikasi',
        duration: 5000,
        closeButton: true,
      });
    },
  });
}

/**
 * Revoke a vendor's active certification (admin only).
 */
export function useRevokeCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      vendorId,
      data,
    }: {
      vendorId: string;
      data: RevokeCertificationData;
    }) => vendorCertificationService.revokeCertification(vendorId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: vendorCertificationKeys.vendorStatus(variables.vendorId),
      });
      toast('Berhasil', {
        style: successStyle,
        description: 'Sertifikasi vendor berhasil dicabut',
        duration: 5000,
        closeButton: true,
      });
    },
    onError: (error: any) => {
      toast('Gagal', {
        style: errorStyle,
        description:
          error.response?.data?.message || 'Gagal mencabut sertifikasi vendor',
        duration: 5000,
        closeButton: true,
      });
    },
  });
}

/**
 * Renew a vendor's certification (admin only).
 */
export function useRenewCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vendorId: string) =>
      vendorCertificationService.renewCertification(vendorId),
    onSuccess: (_, vendorId) => {
      queryClient.invalidateQueries({
        queryKey: vendorCertificationKeys.vendorStatus(vendorId),
      });
      toast('Berhasil', {
        style: successStyle,
        description: 'Sertifikasi vendor berhasil diperbarui',
        duration: 5000,
        closeButton: true,
      });
    },
    onError: (error: any) => {
      toast('Gagal', {
        style: errorStyle,
        description:
          error.response?.data?.message ||
          'Gagal memperbarui sertifikasi vendor',
        duration: 5000,
        closeButton: true,
      });
    },
  });
}
