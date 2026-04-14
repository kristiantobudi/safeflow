import axiosInstance from '../axios';

export const projectHiracService = {
  // ─── Projects ─────────────────────────────────────────────────────────────
  
  async getAllProjects() {
    const response = await axiosInstance.get('/projects');
    return response.data;
  },

  async getProjectDetails(id: string) {
    const response = await axiosInstance.get(`/projects/${id}`);
    return response.data;
  },

  async createProject(data: any) {
    const response = await axiosInstance.post('/projects', data);
    return response.data;
  },

  async updateProject(id: string, data: any) {
    const response = await axiosInstance.patch(`/projects/${id}`, data);
    return response.data;
  },

  // ─── HIRAC ──────────────────────────────────────────────────────────────

  async getProjectHiracs(projectId: string) {
    const response = await axiosInstance.get(`/projects/${projectId}`);
    return response.data?.data?.hiracs || [];
  },

  async downloadHiracTemplate(projectId: string) {
    const response = await axiosInstance.get(`/projects/${projectId}/hirac/template`, {
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
    
    const response = await axiosInstance.post(`/projects/${projectId}/hirac/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async deleteHirac(projectId: string, hiracId: string) {
    const response = await axiosInstance.delete(`/projects/${projectId}/hirac/${hiracId}`);
    return response.data;
  },
};
