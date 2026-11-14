import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request, type Schemas } from '@/lib/api';

export type StoreInfo = Schemas['StoreInfo'];
export type StoreInfoBody = Schemas['StoreInfoBody'];
export type SocialLink = StoreInfo['socialLinks'][number];
export type SocialPlatform = SocialLink['platform'];

export function useStoreInfo() {
  return useQuery({
    queryKey: ['store-info'],
    queryFn: () => request<{ data: StoreInfo }>('/api/store-info'),
  });
}

/** Saves the whole form, as the backend clears any field left out. Errors show by the fields. */
export function useSaveStoreInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: StoreInfoBody) =>
      request<{ data: StoreInfo }>('/api/store-info', { method: 'PUT', body }),
    meta: { toast: false },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['store-info'] }),
  });
}
