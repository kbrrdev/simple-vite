import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request, type Schemas } from '@/lib/api';

export type CategoryNode = Schemas['CategoryNode'];

export interface CategoryInput {
  name: string;
  parentId: string | null;
  imageAssetId: string | null;
}

/** Every category, nested under its parent. Stores have few, so the backend returns them all. */
export function useCategoryTree() {
  return useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => request<{ data: CategoryNode[] }>('/api/categories/tree'),
  });
}

/** Creates a category, or updates it when an id is given. A new parent moves its subcategories too. */
export function useSaveCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: CategoryInput & { id?: string }) =>
      id
        ? request(`/api/categories/${id}`, { method: 'PATCH', body })
        : request('/api/categories', { method: 'POST', body }),
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
