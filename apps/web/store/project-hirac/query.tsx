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
      queryClient.invalidateQueries({ queryKey: projectHiracKeys.hiracs(projectId) });
      queryClient.invalidateQueries({ queryKey: projectHiracKeys.details(projectId) });
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
      queryClient.invalidateQueries({ queryKey: projectHiracKeys.hiracs(projectId) });
      toast.success('HIRAC berhasil dihapus');
    },
  });
};
