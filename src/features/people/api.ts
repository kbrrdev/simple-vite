import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request, type Schemas } from '@/lib/api';
import type { paths } from '@/lib/api-schema';

export type Person =
  paths['/api/users']['get']['responses'][200]['content']['application/json']['data'][number];

export interface PeopleFilters {
  page: number;
  /** `staff` is everyone with a role, and `customer` everyone without one. */
  type: 'staff' | 'customer';
  search?: string;
  roleId?: string;
}

export const pageSize = 20;

export function usePeople(filters: PeopleFilters, enabled = true) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () =>
      request<{ data: Person[]; meta: Schemas['PageMeta'] }>('/api/users', {
        query: { ...filters, limit: pageSize },
      }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/**
 * Gives a user a role, or `null` to make them a customer. Roles show how many people have
 * them, so both lists are refreshed. Callers show errors in their dialog.
 */
export function useSetRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string | null }) =>
      request(`/api/users/${userId}/role`, { method: 'PATCH', body: { roleId } }),
    meta: { toast: false },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['roles'] }),
      ]);
    },
  });
}
