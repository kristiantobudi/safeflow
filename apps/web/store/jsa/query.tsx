'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jsaService } from '@/lib/services/jsa';
import { toast } from 'sonner';
import { FieldErrors } from 'react-hook-form';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CreateJsaApdData {
  safetyHelmet?: boolean;
  safetyShoes?: boolean;
  gloves?: boolean;
  safetyGlasses?: boolean;
  safetyVest?: boolean;
  safetyBodyHarness?: boolean;
  others?: string;
}

export interface CreateJsaData {
  jenisKegiatan: string;
  lokasiKegiatan?: string;
  tanggalDibuat?: string;
  referensiHirarc?: string;
  hiracId?: string;
  pelaksanaUtama?: string;
  hseInCharge?: string;
  apd?: CreateJsaApdData;
}

// ─── Query Key Factory ─────────────────────────────────────────────────────

export const jsaKeys = {
  all: ['jsa'] as const,
  lists: () => [...jsaKeys.all, 'list'] as const,
  details: (id: string) => [...jsaKeys.all, id] as const,
};

// ─── Query Hooks ───────────────────────────────────────────────────────────

/**
 * Fetch all JSA records accessible to the current user.
 * GET /api/v1/jsa
 */
export const useJsaList = () => {
  return useQuery({
    queryKey: jsaKeys.lists(),
    queryFn: () => jsaService.getJsaList(),
  });
};

/**
 * Fetch a single JSA record by ID.
 * GET /api/v1/jsa/:id
 */
export const useJsa = (id: string) => {
  return useQuery({
    queryKey: jsaKeys.details(id),
    queryFn: () => jsaService.getJsaById(id),
    enabled: !!id,
  });
};

// ─── Type for server validation errors ─────────────────────────────────────

export interface ServerValidationError {
  response?: {
    status?: number;
    data?: {
      message?: string;
      errors?: string[] | Record<string, string[]>;
    };
  };
}

// ─── Helper to parse server validation errors into field errors ───────────

export function parseServerValidationErrors(error: unknown): FieldErrors<CreateJsaData> {
  const fieldErrors: FieldErrors<CreateJsaData> = {};
  const err = error as ServerValidationError;
  const errorData = err.response?.data;

  if (!errorData) {
    return fieldErrors;
  }

  // Handle array of error messages (e.g., ["field1 must be something", "field2 is required"])
  if (Array.isArray(errorData.errors)) {
    for (const errorMessage of errorData.errors) {
      if (typeof errorMessage === 'string') {
        // Try to extract field name from error message
        // Pattern: "fieldName must be something" or "fieldName should not be empty"
        const match = errorMessage.match(/^([a-zA-Z0-9]+)\s+(must|should|is|has)/);
        if (match && match[1]) {
          const fieldName = match[1] as keyof CreateJsaData;
          if (fieldName in fieldErrors) {
            // @ts-expect-error - dynamic field assignment
            fieldErrors[fieldName].message = errorMessage;
          } else {
            // @ts-expect-error - dynamic field assignment
            fieldErrors[fieldName] = { message: errorMessage };
          }
        }
      }
    }
  }

  // Handle object with field names as keys (e.g., { jenisKegiatan: ["must not be empty"] })
  if (errorData.errors && typeof errorData.errors === 'object' && !Array.isArray(errorData.errors)) {
    const errorsObj = errorData.errors as Record<string, string[]>;
    for (const [fieldName, messages] of Object.entries(errorsObj)) {
      if (Array.isArray(messages) && messages.length > 0) {
        // @ts-expect-error - dynamic field assignment
        fieldErrors[fieldName] = { message: messages[0] };
      }
    }
  }

  return fieldErrors;
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────

/**
 * Create a new JSA record.
 * POST /api/v1/jsa
 */
export const useCreateJsa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateJsaData) => jsaService.createJsa(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jsaKeys.lists() });
      toast.success('JSA berhasil dibuat');
    },
    onError: (error: unknown) => {
      const err = error as ServerValidationError;
      const status = err.response?.status;
      const message = err.response?.data?.message || 'Gagal membuat JSA';

      // Handle HTTP 403 - Vendor certification validation error
      if (status === 403) {
        toast.error('Sertifikasi vendor tidak aktif');
        return;
      }

      toast.error(message);
    },
  });
};

/**
 * Submit a JSA for approval.
 * PATCH /api/v1/jsa/:id/submit
 */
export const useSubmitJsa = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => jsaService.submitJsa(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jsaKeys.details(id) });
      toast.success('JSA berhasil diajukan untuk approval');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Gagal mengajukan JSA');
    },
  });
};