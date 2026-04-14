'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllUser,
  getVendors,
  createUser,
  uploadUserTemplate,
  verifyUserByAdmin,
  getUserById,
  updateUser,
  deactivatedUserByAdmin,
  createVendor,
  updateVendorDetail,
  getVendorById,
  deleteVendor,
} from '@/lib/services/user-management';
import { CSSProperties } from 'react';
import { toast } from 'sonner';

/**
 * Hook to fetch users with pagination and search
 */
export function useUsersQuery(page: number, limit: number, search?: string) {
  return useQuery({
    queryKey: ['users', { page, limit, search }],
    queryFn: () => getAllUser(page, limit, search),
    placeholderData: (previousData) => previousData,
    staleTime: 5000,
  });
}

/**
 * Hook to fetch vendors list with pagination and search
 */
export function useVendorsQuery(page: number, limit: number, search?: string) {
  return useQuery({
    queryKey: ['vendors', { page, limit, search }],
    queryFn: () => getVendors(page, limit, search),
    placeholderData: (previousData) => previousData,
    staleTime: 5000,
  });
}

/**
 * Hook to create a new user manual
 */
export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => createUser(data),
    onSuccess: () => {
      toast('Register Success', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #22c55e 10%, var(--background))',
          '--normal-text': '#22c55e',
          '--normal-border': '#22c55e',
        } as CSSProperties,
        description: 'User has been created successfully',
        duration: 5000,
        closeButton: true,
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast('Register Failed', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #ef4444 10%, var(--background))',
          '--normal-text': '#ef4444',
          '--normal-border': '#ef4444',
        } as CSSProperties,
        description: 'User has been created failed',
        duration: 5000,
        closeButton: true,
      });
    },
  });
}

/**
 * Hook to bulk upload user registration template
 */
export function useUploadUserTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadUserTemplate(file),
    onSuccess: (res) => {
      toast('Upload Success', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #22c55e 10%, var(--background))',
          '--normal-text': '#22c55e',
          '--normal-border': '#22c55e',
        } as CSSProperties,
        description: `Successfully uploaded: ${res.success} created, ${res.failed} failed.`,
        duration: 5000,
        closeButton: true,
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast('Upload Failed', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #ef4444 10%, var(--background))',
          '--normal-text': '#ef4444',
          '--normal-border': '#ef4444',
        } as CSSProperties,
        description:
          error.response?.data?.message || 'Failed to upload template',
        duration: 5000,
        closeButton: true,
      });
    },
  });
}

export function useVerifyUserByAdminMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => verifyUserByAdmin(userId),
    onSuccess: () => {
      toast('User Verified', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #22c55e 10%, var(--background))',
          '--normal-text': '#22c55e',
          '--normal-border': '#22c55e',
        } as CSSProperties,
        description: 'User has been verified successfully',
        duration: 5000,
        closeButton: true,
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast('User Verification Failed', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #ef4444 10%, var(--background))',
          '--normal-text': '#ef4444',
          '--normal-border': '#ef4444',
        } as CSSProperties,
        description: error.response?.data?.message || 'Failed to verify user',
        duration: 5000,
        closeButton: true,
      });
    },
  });
}

export function useDeactivatedUserByAdminMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => deactivatedUserByAdmin(userId),
    onSuccess: () => {
      toast('User Deactivated', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #22c55e 10%, var(--background))',
          '--normal-text': '#22c55e',
          '--normal-border': '#22c55e',
        } as CSSProperties,
        description: 'User has been deactivated successfully',
        duration: 5000,
        closeButton: true,
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast('User Deactivation Failed', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #ef4444 10%, var(--background))',
          '--normal-text': '#ef4444',
          '--normal-border': '#ef4444',
        } as CSSProperties,
        description:
          error.response?.data?.message || 'Failed to deactivate user',
        duration: 5000,
        closeButton: true,
      });
    },
  });
}

/**
 * Hook to fetch a single user detail
 */
export function useUserDetailQuery(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => getUserById(id),
    enabled: !!id,
    staleTime: 60000,
  });
}

/**
 * Hook to update an existing user
 */
export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateUser(id, data),
    onSuccess: (_, variables) => {
      toast('Update Success', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #22c55e 10%, var(--background))',
          '--normal-text': '#22c55e',
          '--normal-border': '#22c55e',
        } as CSSProperties,
        description: 'User has been updated successfully',
        duration: 5000,
        closeButton: true,
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] });
    },
    onError: (error: any) => {
      toast('Update Failed', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #ef4444 10%, var(--background))',
          '--normal-text': '#ef4444',
          '--normal-border': '#ef4444',
        } as CSSProperties,
        description: error.response?.data?.message || 'Failed to update user',
        duration: 5000,
        closeButton: true,
      });
    },
  });
}

/**
 * Hook to fetch a single vendor detail
 */
export function useVendorDetailQuery(id: string) {
  return useQuery({
    queryKey: ['vendor', id],
    queryFn: () => getVendorById(id),
    enabled: !!id,
    staleTime: 60000,
  });
}

/**
 * Hook to create a new vendor
 */
export function useCreateVendorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => createVendor(data),
    onSuccess: () => {
      toast('Success', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #22c55e 10%, var(--background))',
          '--normal-text': '#22c55e',
          '--normal-border': '#22c55e',
        } as CSSProperties,
        description: 'Vendor has been created successfully',
        duration: 5000,
        closeButton: true,
      });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (error: any) => {
      toast('Failed', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #ef4444 10%, var(--background))',
          '--normal-text': '#ef4444',
          '--normal-border': '#ef4444',
        } as CSSProperties,
        description: error.response?.data?.message || 'Failed to create vendor',
        duration: 5000,
        closeButton: true,
      });
    },
  });
}

/**
 * Hook to update an existing vendor
 */
export function useUpdateVendorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateVendorDetail(id, data),
    onSuccess: (_, variables) => {
      toast('Success', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #22c55e 10%, var(--background))',
          '--normal-text': '#22c55e',
          '--normal-border': '#22c55e',
        } as CSSProperties,
        description: 'Vendor has been updated successfully',
        duration: 5000,
        closeButton: true,
      });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', variables.id] });
    },
    onError: (error: any) => {
      toast('Failed', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #ef4444 10%, var(--background))',
          '--normal-text': '#ef4444',
          '--normal-border': '#ef4444',
        } as CSSProperties,
        description: error.response?.data?.message || 'Failed to update vendor',
        duration: 5000,
        closeButton: true,
      });
    },
  });
}

/**
 * Hook to delete a vendor
 */
export function useDeleteVendorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteVendor(id),
    onSuccess: () => {
      toast('Success', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #22c55e 10%, var(--background))',
          '--normal-text': '#22c55e',
          '--normal-border': '#22c55e',
        } as CSSProperties,
        description: 'Vendor has been deleted successfully',
        duration: 5000,
        closeButton: true,
      });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (error: any) => {
      toast('Failed', {
        style: {
          '--normal-bg': 'color-mix(in oklab, #ef4444 10%, var(--background))',
          '--normal-text': '#ef4444',
          '--normal-border': '#ef4444',
        } as CSSProperties,
        description: error.response?.data?.message || 'Failed to delete vendor',
        duration: 5000,
        closeButton: true,
      });
    },
  });
}
