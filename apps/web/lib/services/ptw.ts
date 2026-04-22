import { api } from '@/settings/axios-setting';
import axiosInstance from '../axios';
import { CreatePtwData, PtwDetail, PtwListItem } from '../types/ptw-types';

// ─── Service ───────────────────────────────────────────────────────────────

export const ptwService = {
  /**
   * Create a new PTW record.
   * POST /api/v1/ptw
   */
  async createPtw(data: CreatePtwData): Promise<PtwDetail> {
    const response = await api.post('/ptw', data);
    return response.data.data;
  },

  /**
   * Get all PTW records accessible to the current user.
   * GET /api/v1/ptw
   */
  async getPtwList(): Promise<PtwListItem[]> {
    const response = await api.get('/ptw');
    return response.data.data;
  },

  /**
   * Get a single PTW record by ID.
   * GET /api/v1/ptw/:id
   */
  async getPtwById(id: string): Promise<PtwDetail> {
    const response = await api.get(`/ptw/${id}`);
    return response.data.data;
  },

  /**
   * Submit a PTW for approval.
   * PATCH /api/v1/ptw/:id/submit
   */
  async submitPtw(id: string): Promise<{ approvalStatus: string }> {
    const response = await api.patch(`/ptw/${id}/submit`);
    return response.data.data;
  },
};
