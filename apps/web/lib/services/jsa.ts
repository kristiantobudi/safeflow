import { api } from '@/settings/axios-setting';
import { CreateJsaData, JsaDetail, JsaListItem } from '../types/jsa-types';

// ─── Service ───────────────────────────────────────────────────────────────

export const jsaService = {
  /**
   * Create a new JSA record.
   * POST /api/v1/jsa
   */
  async createJsa(data: CreateJsaData): Promise<JsaDetail> {
    const response = await api.post('/jsa', data);
    return response.data.data;
  },

  /**
   * Get all JSA records accessible to the current user.
   * GET /api/v1/jsa
   */
  async getJsaList(): Promise<JsaListItem[]> {
    const response = await api.get('/jsa');
    return response.data.data;
  },

  /**
   * Get a single JSA record by ID.
   * GET /api/v1/jsa/:id
   */
  async getJsaById(id: string): Promise<JsaDetail> {
    const response = await api.get(`/jsa/${id}`);
    return response.data.data;
  },

  /**
   * Submit a JSA for approval.
   * PATCH /api/v1/jsa/:id/submit
   */
  async submitJsa(id: string): Promise<{ approvalStatus: string }> {
    const response = await api.patch(`/jsa/${id}/submit`);
    return response.data.data;
  },
};

export type {
  JsaListItem /**
   * Submit a JSA for approval.
   * PATCH /api/v1/jsa/:id/submit
   */,
};
