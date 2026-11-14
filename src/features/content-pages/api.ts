import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request, type Schemas } from '@/lib/api';

export type ContentPage = Schemas['ContentPage'];
export type ContentPageSummary = Schemas['ContentPageSummary'];
export type CreateContentPageBody = Schemas['CreateContentPage'];
export type ContentPageChanges = Schemas['UpdateContentPage'];

/** Every page, in title order. Stores have few, so the backend returns them all at once. */
export function useContentPages() {
  return useQuery({
    queryKey: ['content-pages', 'list'],
    queryFn: () => request<{ data: ContentPageSummary[] }>('/api/pages/admin'),
  });
}

export function useContentPage(id: string) {
  return useQuery({
    queryKey: ['content-pages', 'detail', id],
    queryFn: () => request<{ data: ContentPage }>(`/api/pages/admin/${id}`),
  });
}

/** A change to one page. The editor shows errors next to its fields. */
function usePageMutation<T, R>(send: (variables: T) => Promise<R>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: send,
    meta: { toast: false },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['content-pages'] }),
  });
}

export function useCreateContentPage() {
  return usePageMutation((body: CreateContentPageBody) =>
    request<{ data: ContentPage }>('/api/pages', { method: 'POST', body }),
  );
}

export function useUpdateContentPage() {
  return usePageMutation(({ id, body }: { id: string; body: ContentPageChanges }) =>
    request<{ data: ContentPage }>(`/api/pages/admin/${id}`, { method: 'PATCH', body }),
  );
}

/** Deletes a page for good. Making it a draft is the way to hide one and keep it. */
export function useDeleteContentPage() {
  return usePageMutation((id: string) => request(`/api/pages/admin/${id}`, { method: 'DELETE' }));
}
