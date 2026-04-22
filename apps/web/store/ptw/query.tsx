'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ptwService } from '@/lib/services/ptw';
import type { CreatePtwData } from '@/lib/services/ptw';
import { toast } from 'sonner';
import { FieldErrors } from 'react-hook-form';

// Re-export CreatePtwData for convenience
export type { CreatePtwData };

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

export function parseServerValidationErrors(error: unknown): FieldErrors<CreatePtwData> {
  const fieldErrors: FieldErrors<CreatePtwData> = {};
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
          const fieldName = match[1] as keyof CreatePtwData;
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

// ─── Query Key Factory ─────────────────────────────────────────────────────

export const ptwKeys = {
  all: ['ptw'] as const,
  lists: () => [...ptwKeys.all, 'list'] as const,
  details: (id: string) => [...ptwKeys.all, id] as const,
};

// ─── Query Hooks ───────────────────────────────────────────────────────────

/**
 * Fetch all PTW records accessible to the current user.
 * GET /api/v1/ptw
 */
export const usePtwList = () => {
  return useQuery({
    queryKey: ptwKeys.lists(),
    queryFn: () => ptwService.getPtwList(),
  });
};

/**
 * Fetch a single PTW record by ID.
 * GET /api/v1/ptw/:id
 */
export const usePtw = (id: string) => {
  return useQuery({
    queryKey: ptwKeys.details(id),
    queryFn: () => ptwService.getPtwById(id),
    enabled: !!id,
  });
};

// ─── Mutation Hooks ───────────────────────────────────────────────────────

/**
 * Create a new PTW record.
 * POST /api/v1/ptw
 */
export const useCreatePtw = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePtwData) => ptwService.createPtw(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ptwKeys.lists() });
      toast.success('PTW berhasil dibuat');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Gagal membuat PTW');
    },
  });
};

/**
 * Submit a PTW for approval.
 * PATCH /api/v1/ptw/:id/submit
 */
export const useSubmitPtw = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => ptwService.submitPtw(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ptwKeys.details(id) });
      toast.success('PTW berhasil diajukan untuk approval');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Gagal mengajukan PTW');
    },
  });
};