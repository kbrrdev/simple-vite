import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request, type Schemas } from '@/lib/api';

export type Asset = Schemas['Asset'];

export const pageSize = 24;

export function useAssets(page: number) {
  return useQuery({
    queryKey: ['assets', { page }],
    queryFn: () =>
      request<{ data: Asset[]; meta: Schemas['PageMeta'] }>('/api/assets', {
        query: { page, limit: pageSize },
      }),
    placeholderData: keepPreviousData,
  });
}

export function useUploadAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append('file', file);
      return request<{ data: Asset }>('/api/assets', { method: 'POST', body });
    },
    meta: { toast: false },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets'] }),
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => request(`/api/assets/${id}`, { method: 'DELETE' }),
    meta: { toast: false },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets'] }),
  });
}
