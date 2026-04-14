'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWorkerVendors,
  getWorkerVendorById,
  createWorkerVendor,
  updateWorkerVendor,
  deleteWorkerVendor,
  uploadWorkerVendorBulk,
  downloadWorkerVendorTemplate,
} from '@/lib/services/worker-management';
import { toast } from 'sonner';
import { CSSProperties } from 'react';

/**
 * Hook to fetch workers with pagination and search
 */
export function useWorkersQuery(page: number, limit: number, search?: string) {
  return useQuery({
    queryKey: ['worker-vendors', { page, limit, search }],
    queryFn: () => getWorkerVendors(page, limit, search),
    placeholderData: (previousData) => previousData,
    staleTime: 5000,
  });
}

/**
 * Hook to fetch a single worker detail
 */
export function useWorkerDetailQuery(id: string) {
  return useQuery({
    queryKey: ['worker-vendor', id],
    queryFn: () => getWorkerVendorById(id),
    enabled: !!id,
    staleTime: 60000,
  });
}

/**
 * Hook to create a new worker
 */
export function useCreateWorkerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => createWorkerVendor(data),
    onSuccess: () => {
      toast('Success', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #22c55e 10%, var(--background))',
          '--normal-text': '#22c55e',
          '--normal-border': '#22c55e',
        } as CSSProperties,
        description: 'Worker has been created successfully',
        duration: 5000,
        closeButton: true,
      });
      queryClient.invalidateQueries({ queryKey: ['worker-vendors'] });
    },
    onError: (error: any) => {
      toast('Failed', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #ef4444 10%, var(--background))',
          '--normal-text': '#ef4444',
          '--normal-border': '#ef4444',
        } as CSSProperties,
        description: error.response?.data?.message || 'Failed to create worker',
        duration: 5000,
        closeButton: true,
      });
    },
  });
}

/**
 * Hook to update an existing worker
 */
export function useUpdateWorkerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateWorkerVendor(id, data),
    onSuccess: (_, variables) => {
      toast('Success', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #22c55e 10%, var(--background))',
          '--normal-text': '#22c55e',
          '--normal-border': '#22c55e',
        } as CSSProperties,
        description: 'Worker has been updated successfully',
        duration: 5000,
        closeButton: true,
      });
      queryClient.invalidateQueries({ queryKey: ['worker-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['worker-vendor', variables.id] });
    },
    onError: (error: any) => {
      toast('Failed', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #ef4444 10%, var(--background))',
          '--normal-text': '#ef4444',
          '--normal-border': '#ef4444',
        } as CSSProperties,
        description: error.response?.data?.message || 'Failed to update worker',
        duration: 5000,
        closeButton: true,
      });
    },
  });
}

/**
 * Hook to delete a worker
 */
export function useDeleteWorkerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWorkerVendor(id),
    onSuccess: () => {
      toast('Success', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #22c55e 10%, var(--background))',
          '--normal-text': '#22c55e',
          '--normal-border': '#22c55e',
        } as CSSProperties,
        description: 'Worker has been deleted successfully',
        duration: 5000,
        closeButton: true,
      });
      queryClient.invalidateQueries({ queryKey: ['worker-vendors'] });
    },
    onError: (error: any) => {
      toast('Failed', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #ef4444 10%, var(--background))',
          '--normal-text': '#ef4444',
          '--normal-border': '#ef4444',
        } as CSSProperties,
        description: error.response?.data?.message || 'Failed to delete worker',
        duration: 5000,
        closeButton: true,
      });
    },
  });
}

/**
 * Hook to bulk upload workers
 */
export function useBulkUploadWorkersMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadWorkerVendorBulk(file),
    onSuccess: (res) => {
      toast('Upload Success', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #22c55e 10%, var(--background))',
          '--normal-text': '#22c55e',
          '--normal-border': '#22c55e',
        } as CSSProperties,
        description: `Successfully uploaded ${res.totalCreated} workers.`,
        duration: 5000,
        closeButton: true,
      });
      queryClient.invalidateQueries({ queryKey: ['worker-vendors'] });
    },
    onError: (error: any) => {
      toast('Upload Failed', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #ef4444 10%, var(--background))',
          '--normal-text': '#ef4444',
          '--normal-border': '#ef4444',
        } as CSSProperties,
        description: error.response?.data?.message || 'Failed to upload file',
        duration: 5000,
        closeButton: true,
      });
    },
  });
}

/**
 * Hook to download template
 */
export function useDownloadWorkerTemplateMutation() {
  return useMutation({
    mutationFn: () => downloadWorkerVendorTemplate(),
    onSuccess: () => {
      toast('Download Success', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #22c55e 10%, var(--background))',
          '--normal-text': '#22c55e',
          '--normal-border': '#22c55e',
        } as CSSProperties,
        description: 'Template downloaded successfully',
        duration: 3000,
      });
    },
  });
}
