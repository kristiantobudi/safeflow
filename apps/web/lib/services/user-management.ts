import { api } from '@/settings/axios-setting';

export async function getAllUser(
  page: number,
  limit: number,
  searchQuery?: string,
) {
  const res = await api.get(`/users`, {
    params: {
      page,
      limit,
      search: searchQuery,
    },
  });
  return res.data;
}

export async function getVendors(page = 1, limit = 100, searchQuery?: string) {
  const res = await api.get(`/vendor`, {
    params: { page, limit, search: searchQuery },
  });
  return res.data;
}

export async function createUser(data: any) {
  const res = await api.post(`/auth/register`, data);
  return res.data;
}

export async function uploadUserTemplate(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post(`/auth/register/upload-register`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

export async function verifyUserByAdmin(userId: string) {
  const res = await api.patch(`/auth/verify/${userId}`);
  return res.data;
}

export async function deactivatedUserByAdmin(userId: string) {
  const res = await api.patch(`/auth/deactivate/${userId}`);
  return res.data;
}

export async function getUserById(id: string) {
  const res = await api.get(`/users/${id}`);
  return res.data;
}

export async function updateUser(id: string, data: any) {
  const formData = new FormData();

  // Append all fields to FormData
  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) {
      // Handle avatar file separately
      if (key === 'avatar' && data[key] instanceof File) {
        formData.append('avatar', data[key]);
      } else {
        formData.append(key, data[key]);
      }
    }
  });

  const res = await api.patch(`/users/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

export async function createVendor(data: any) {
  const formData = new FormData();
  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) {
      if (key === 'logo' && data[key] instanceof File) {
        formData.append('logo', data[key]);
      } else {
        formData.append(key, data[key]);
      }
    }
  });

  const res = await api.post(`/vendor`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

export async function updateVendorDetail(id: string, data: any) {
  const formData = new FormData();
  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) {
      if (key === 'logo' && data[key] instanceof File) {
        formData.append('logo', data[key]);
      } else {
        formData.append(key, data[key]);
      }
    }
  });

  const res = await api.patch(`/vendor/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

export async function getVendorById(id: string) {
  const res = await api.get(`/vendor/${id}`);
  return res.data;
}

export async function deleteVendor(id: string) {
  const res = await api.delete(`/vendor/${id}`);
  return res.data;
}
