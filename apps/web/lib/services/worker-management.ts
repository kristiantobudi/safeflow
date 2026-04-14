import { api } from '@/settings/axios-setting';

export async function getWorkerVendors(
  page: number,
  limit: number,
  search?: string,
) {
  const res = await api.get('/worker-vendor', {
    params: { page, limit, search },
  });
  return res.data;
}

export async function getWorkerVendorById(id: string) {
  const res = await api.get(`/worker-vendor/${id}`);
  return res.data;
}

export async function createWorkerVendor(data: any) {
  const res = await api.post('/worker-vendor', data);
  return res.data;
}

export async function updateWorkerVendor(id: string, data: any) {
  const res = await api.patch(`/worker-vendor/${id}`, data);
  return res.data;
}

export async function deleteWorkerVendor(id: string) {
  const res = await api.delete(`/worker-vendor/${id}`);
  return res.data;
}

export async function uploadWorkerVendorBulk(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/worker-vendor/register-bulk', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

export async function downloadWorkerVendorTemplate() {
  const res = await api.get('/worker-vendor/download-template', {
    responseType: 'blob',
  });
  
  // Create a link element, hide it, direct it to the blob, and click it
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'template-worker-vendor.xlsx');
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
  
  return res.data;
}
