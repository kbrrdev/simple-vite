import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request, type Schemas } from '@/lib/api';

export type Banner = Schemas['Banner'];
export type CreateBannerBody = Schemas['CreateBanner'];
export type BannerChanges = Schemas['UpdateBanner'];

/** Every banner, on, off, or scheduled. A store has at most `meta.maxBanners`, so no pages. */
export function useBanners() {
  return useQuery({
    queryKey: ['banners'],
    queryFn: () =>
      request<{ data: Banner[]; meta: Schemas['PageMeta'] & { maxBanners: number } }>(
        '/api/banners/admin',
      ),
  });
}

/** A change to banners. Callers show errors themselves, next to the action. */
function useBannerMutation<T>(send: (variables: T) => Promise<unknown>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: send,
    meta: { toast: false },
    // Settled, not success: a reorder can fail halfway, and the list must show what was saved.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['banners'] }),
  });
}

export function useCreateBanner() {
  return useBannerMutation((body: CreateBannerBody) =>
    request('/api/banners', { method: 'POST', body }),
  );
}

export function useUpdateBanner() {
  return useBannerMutation(({ id, body }: { id: string; body: BannerChanges }) =>
    request(`/api/banners/${id}`, { method: 'PATCH', body }),
  );
}

export function useDeleteBanner() {
  return useBannerMutation((id: string) => request(`/api/banners/${id}`, { method: 'DELETE' }));
}

/**
 * Saves a new order by numbering the banners 0, 1, 2, and so on. Only the banners whose number
 * changes are sent, one at a time, as positions can tie after a delete.
 */
export function useReorderBanners() {
  return useBannerMutation(async (ordered: Banner[]) => {
    for (const [position, banner] of ordered.entries()) {
      if (banner.position === position) continue;
      await request(`/api/banners/${banner.id}`, {
        method: 'PATCH',
        body: { position } satisfies BannerChanges,
      });
    }
  });
}
