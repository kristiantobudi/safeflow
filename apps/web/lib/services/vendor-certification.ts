import { api } from '@/settings/axios-setting';
import {
  CreateCertificationProgramData,
  UpdateCertificationProgramData,
  AssignVendorProgramData,
  RevokeCertificationData,
} from '../types/vendor-certification-types';

// ─── Service ──────────────────────────────────────────────────────────────────

export const vendorCertificationService = {
  // ─── Certification Programs (Admin) ────────────────────────────────────────

  /**
   * GET /api/v1/certification-programs
   * List all certification programs (paginated).
   */
  async getCertificationPrograms(page = 1, limit = 10, search?: string) {
    const response = await api.get('/certification-programs', {
      params: { page, limit, search },
    });
    return response.data;
  },

  /**
   * GET /api/v1/certification-programs/available-modules
   * List all available training modules for selection in forms.
   */
  async getAvailableModules() {
    const response = await api.get('/certification-programs/available-modules');
    return response.data;
  },

  /**
   * GET /api/v1/certification-programs/:id
   * Get a single certification program by ID.
   */
  async getCertificationProgramById(id: string) {
    const response = await api.get(`/certification-programs/${id}`);
    return response.data;
  },

  /**
   * POST /api/v1/certification-programs
   * Create a new certification program.
   */
  async createCertificationProgram(data: CreateCertificationProgramData) {
    const response = await api.post('/certification-programs', data);
    return response.data;
  },

  /**
   * PATCH /api/v1/certification-programs/:id
   * Update an existing certification program.
   */
  async updateCertificationProgram(
    id: string,
    data: UpdateCertificationProgramData,
  ) {
    const response = await api.patch(`/certification-programs/${id}`, data);
    return response.data;
  },

  /**
   * DELETE /api/v1/certification-programs/:id
   * Soft-delete a certification program.
   */
  async deleteCertificationProgram(id: string) {
    const response = await api.delete(`/certification-programs/${id}`);
    return response.data;
  },

  /**
   * POST /api/v1/certification-programs/:id/modules
   * Assign (replace) modules for a certification program.
   */
  async assignModulesToProgram(id: string, moduleIds: string[]) {
    const response = await api.post(`/certification-programs/${id}/modules`, {
      moduleIds,
    });
    return response.data;
  },

  // ─── Vendor Certifications ─────────────────────────────────────────────────

  /**
   * GET /api/v1/vendors/:vendorId/certifications
   * Get certification status for a vendor.
   */
  async getVendorCertificationStatus(vendorId: string) {
    const response = await api.get(`/vendors/${vendorId}/certifications`);
    return response.data;
  },

  /**
   * POST /api/v1/vendors/:vendorId/certifications/check
   * Trigger checkAndIssueCertification for a vendor.
   */
  async checkAndIssueCertification(vendorId: string) {
    const response = await api.post(
      `/vendors/${vendorId}/certifications/check`,
    );
    return response.data;
  },

  /**
   * POST /api/v1/vendors/:vendorId/certification-program
   * Assign a certification program to a vendor (admin only).
   */
  async assignVendorToProgram(vendorId: string, data: AssignVendorProgramData) {
    const response = await api.post(
      `/vendors/${vendorId}/certification-program`,
      data,
    );
    return response.data;
  },

  /**
   * POST /api/v1/vendors/:vendorId/certifications/revoke
   * Revoke a vendor's active certification (admin only).
   */
  async revokeCertification(vendorId: string, data: RevokeCertificationData) {
    const response = await api.post(
      `/vendors/${vendorId}/certifications/revoke`,
      data,
    );
    return response.data;
  },

  /**
   * POST /api/v1/vendors/:vendorId/certifications/renew
   * Renew a vendor's certification (admin only).
   */
  async renewCertification(vendorId: string) {
    const response = await api.post(
      `/vendors/${vendorId}/certifications/renew`,
    );
    return response.data;
  },

  /**
   * GET /api/v1/vendors/my-program
   * Get the certification program and module progress for the currently
   * authenticated vendor user. No vendorId required — resolved server-side
   * from the JWT.
   */
  async getMyProgram() {
    const response = await api.get('/vendors/my-program');
    return response.data;
  },
};
