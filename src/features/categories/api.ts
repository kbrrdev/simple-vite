import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request, type Schemas } from '@/lib/api';

export type Category = Schemas['Category'];

export const pageSize = 20;

export function useCategories(page: number) {
  return useQuery({
    queryKey: ['categories', { page }],
    queryFn: () =>
      request<{ data: Category[]; meta: Schemas['PageMeta'] }>('/api/categories', {
        query: { page, limit: pageSize },
      }),
    placeholderData: keepPreviousData,
  });
}

/** Creates a category, or renames it when an id is given. */
export function useSaveCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id?: string; name: string }) =>
      id
        ? request<{ data: Category }>(`/api/categories/${id}`, { method: 'PATCH', body: { name } })
        : request<{ data: Category }>('/api/categories', { method: 'POST', body: { name } }),
    meta: { toast: false },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => request(`/api/categories/${id}`, { method: 'DELETE' }),
    meta: { toast: false },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}
