import { api } from '@/settings/axios-setting';

export const projectHiracService = {
  // ─── Projects ─────────────────────────────────────────────────────────────

  async getAllProjects() {
    const response = await api.get('/projects');
    return response.data;
  },

  async getProjectDetails(id: string) {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  async createProject(data: any) {
    const response = await api.post('/projects', data);
    return response.data;
  },

  async updateProject(id: string, data: any) {
    const response = await api.patch(`/projects/${id}`, data);
    return response.data;
  },

  async submitProject(id: string, note?: string) {
    const response = await api.patch(`/projects/${id}/submit`, { changeNote: note });
    return response.data;
  },

  async approveProject(id: string, note?: string) {
    const response = await api.post(`/projects/${id}/approve`, { note });
    return response.data;
  },

  async rejectProject(id: string, note?: string) {
    const response = await api.post(`/projects/${id}/reject`, { note });
    return response.data;
  },

  async requestRevision(id: string) {
    const response = await api.patch(`/projects/${id}/request-revision`);
    return response.data;
  },

  async compareVersions(id: string, vA?: number, vB?: number) {
    const response = await api.get(`/projects/${id}/versions/compare`, {
      params: { vA, vB },
    });
    return response.data;
  },

  // ─── HIRAC ──────────────────────────────────────────────────────────────

  async getProjectHiracs(projectId: string) {
    const response = await api.get(`/projects/${projectId}`);
    return response.data?.data?.hiracs || [];
  },

  async downloadHiracTemplate(projectId: string) {
    const response = await api.get(`/projects/${projectId}/hirac/template`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Template_HIRAC.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async uploadHiracTemplate(projectId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(
      `/projects/${projectId}/hirac/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data;
  },

  async deleteHirac(projectId: string, hiracId: string) {
    const response = await api.delete(
      `/projects/${projectId}/hirac/${hiracId}`,
    );
    return response.data;
  },

  async addHiracToProject(projectId: string, data: any) {
    const response = await api.post(`/projects/${projectId}/hirac`, data);
    return response.data;
  },

  async updateHirac(projectId: string, hiracId: string, data: any) {
    const response = await api.patch(
      `/projects/${projectId}/hirac/${hiracId}`,
      data,
    );
    return response.data;
  },
};
