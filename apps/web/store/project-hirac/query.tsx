import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectHiracService } from '@/lib/services/project-hirac';
import { toast } from 'sonner';

export const projectHiracKeys = {
  all: ['projects'] as const,
  lists: () => [...projectHiracKeys.all, 'list'] as const,
  details: (id: string) => [...projectHiracKeys.all, 'detail', id] as const,
  hiracs: (projectId: string) => [...projectHiracKeys.all, 'hiracs', projectId] as const,
};

// ─── Project Hooks ─────────────────────────────────────────────────────────

export const useProjectsQuery = () => {
  return useQuery({
    queryKey: projectHiracKeys.lists(),
    queryFn: () => projectHiracService.getAllProjects(),
  });
};

export const useProjectDetailsQuery = (id: string) => {
  return useQuery({
    queryKey: projectHiracKeys.details(id),
    queryFn: () => projectHiracService.getProjectDetails(id),
    enabled: !!id,
  });
};

export const useCreateProjectMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => projectHiracService.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectHiracKeys.lists() });
      toast.success('Project berhasil dibuat');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal membuat project');
    },
  });
};

export const useSubmitProjectMutation = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note?: string) => projectHiracService.submitProject(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectHiracKeys.details(id) });
      toast.success('Project berhasil diajukan');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal mengajukan project');
    },
  });
};

export const useApproveProjectMutation = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note?: string) => projectHiracService.approveProject(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectHiracKeys.details(id) });
      toast.success('Project berhasil disetujui');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menyetujui project');
    },
  });
};

export const useRejectProjectMutation = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note?: string) => projectHiracService.rejectProject(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectHiracKeys.details(id) });
      toast.success('Project ditolak untuk revisi');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menolak project');
    },
  });
};

export const useRequestRevisionMutation = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => projectHiracService.requestRevision(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectHiracKeys.details(id) });
      toast.success('Request revisi berhasil dikirim');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal request revisi');
    },
  });
};

// ─── HIRAC Hooks ──────────────────────────────────────────────────────────

export const useProjectHiracsQuery = (projectId: string) => {
  return useQuery({
    queryKey: projectHiracKeys.hiracs(projectId),
    queryFn: () => projectHiracService.getProjectHiracs(projectId),
    enabled: !!projectId,
  });
};

export const useUploadHiracMutation = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => projectHiracService.uploadHiracTemplate(projectId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectHiracKeys.details(projectId) });
      queryClient.invalidateQueries({ queryKey: projectHiracKeys.hiracs(projectId) });
      toast.success('HIRAC berhasil diupload');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal mengupload HIRAC');
    },
  });
};

export const useDeleteHiracMutation = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (hiracId: string) => projectHiracService.deleteHirac(projectId, hiracId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectHiracKeys.details(projectId) });
      queryClient.invalidateQueries({ queryKey: projectHiracKeys.hiracs(projectId) });
      toast.success('HIRAC berhasil dihapus');
    },
  });
};

export const useCreateHiracMutation = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => projectHiracService.addHiracToProject(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectHiracKeys.details(projectId) });
      toast.success('HIRAC berhasil ditambahkan');
    },
  });
};

export const useUpdateHiracMutation = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      projectHiracService.updateHirac(projectId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectHiracKeys.details(projectId) });
      toast.success('HIRAC berhasil diperbarui');
    },
  });
};

export const useCompareVersionsQuery = (id: string, vA?: number, vB?: number) => {
  return useQuery({
    queryKey: [...projectHiracKeys.details(id), 'compare', vA, vB],
    queryFn: () => projectHiracService.compareVersions(id, vA, vB),
    enabled: !!id,
  });
};
