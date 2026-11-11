import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request, type Schemas } from '@/lib/api';

export type Blog = Schemas['Blog'];
export type CreateBlogBody = Schemas['CreateBlog'];
export type BlogChanges = Schemas['UpdateBlog'];

export const pageSize = 20;

export function useBlogs({ page, published }: { page: number; published?: boolean }) {
  return useQuery({
    queryKey: ['blogs', 'list', { page, published }],
    queryFn: () =>
      request<{ data: Blog[]; meta: Schemas['PageMeta'] }>('/api/blogs/admin', {
        query: { page, limit: pageSize, published },
      }),
    placeholderData: keepPreviousData,
  });
}

export function useBlog(id: string) {
  return useQuery({
    queryKey: ['blogs', 'detail', id],
    queryFn: () => request<{ data: Blog }>(`/api/blogs/admin/${id}`),
  });
}

/** A change to one post. The editor shows errors next to its fields. */
function useBlogMutation<T, R>(send: (variables: T) => Promise<R>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: send,
    meta: { toast: false },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blogs'] }),
  });
}

export function useCreateBlog() {
  return useBlogMutation((body: CreateBlogBody) =>
    request<{ data: Blog }>('/api/blogs', { method: 'POST', body }),
  );
}

export function useUpdateBlog() {
  return useBlogMutation(({ id, body }: { id: string; body: BlogChanges }) =>
    request<{ data: Blog }>(`/api/blogs/${id}`, { method: 'PATCH', body }),
  );
}

/** Deletes a post for good. Unpublishing is the way to hide one and keep it. */
export function useDeleteBlog() {
  return useBlogMutation((id: string) => request(`/api/blogs/${id}`, { method: 'DELETE' }));
}
